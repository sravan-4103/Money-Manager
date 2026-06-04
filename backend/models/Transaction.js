const mongoose = require('mongoose');

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other Income'];
const EXPENSE_CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Health', 'Education', 'Utilities', 'Travel', 'Other'];

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: 100
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Type is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

transactionSchema.statics.INCOME_CATEGORIES = INCOME_CATEGORIES;
transactionSchema.statics.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

module.exports = mongoose.model('Transaction', transactionSchema);
