const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: compute date range from filter param
const getStartDate = (filter) => {
  const now = new Date();
  switch (filter) {
    case 'week': {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case 'year': {
      return new Date(now.getFullYear(), 0, 1);
    }
    default:
      return null;
  }
};

// ─── GET /api/transactions ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { filter, type, category, page = 1, limit = 50 } = req.query;
    const query = { userId: req.userId };

    const startDate = getStartDate(filter);
    if (startDate) query.date = { $gte: startDate };
    if (type) query.type = type;
    if (category) query.category = category;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET /api/transactions/summary ────────────────────────────────────────────
router.get('/summary', auth, async (req, res) => {
  try {
    const { filter } = req.query;
    const matchStage = { userId: new mongoose.Types.ObjectId(req.userId) };

    const startDate = getStartDate(filter);
    if (startDate) matchStage.date = { $gte: startDate };

    const result = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
    result.forEach(r => {
      if (r._id === 'income') { income = r.total; incomeCount = r.count; }
      if (r._id === 'expense') { expense = r.total; expenseCount = r.count; }
    });

    res.json({
      income,
      expense,
      balance: income - expense,
      incomeCount,
      expenseCount,
      totalCount: incomeCount + expenseCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET /api/transactions/category-breakdown ──────────────────────────────────
router.get('/category-breakdown', auth, async (req, res) => {
  try {
    const { filter } = req.query;
    const matchStage = {
      userId: new mongoose.Types.ObjectId(req.userId),
      type: 'expense'
    };

    const startDate = getStartDate(filter);
    if (startDate) matchStage.date = { $gte: startDate };

    const breakdown = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET /api/transactions/monthly-trend ──────────────────────────────────────
router.get('/monthly-trend', auth, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trend = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET /api/transactions/:id ─────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── POST /api/transactions ────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, type, category, date } = req.body;

    if (!description || !amount || !type || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be income or expense' });
    }

    const transaction = new Transaction({
      userId: req.userId,
      description: description.trim(),
      amount: Math.abs(parseFloat(amount)),
      type,
      category,
      date: date ? new Date(date) : new Date()
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── PUT /api/transactions/:id ─────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { description, amount, type, category, date } = req.body;

    const updates = {};
    if (description) updates.description = description.trim();
    if (amount) updates.amount = Math.abs(parseFloat(amount));
    if (type) updates.type = type;
    if (category) updates.category = category;
    if (date) updates.date = new Date(date);

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── DELETE /api/transactions/:id ──────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
