# 💰 Money Manager

A comprehensive, full-stack personal finance tracking application designed to help users manage their income, expenses, and refunds efficiently. The app provides visual insights, secure authentication, and a responsive modern user interface.

## ✨ Features

- **Secure Authentication:** User registration and login protected by JWT (JSON Web Tokens).
- **Email OTP Verification:** Automated email verification using `nodemailer` to ensure real users.
- **Rate Limiting:** Built-in protection against spam and brute-force attacks (`express-rate-limit`).
- **Comprehensive Tracking:** Add, edit, and delete transactions categorized by **Income**, **Expense**, and **Refund**.
- **Dashboard & Analytics:** Real-time summary cards (Net Balance, Savings Rate) and interactive charts (Donut and Bar charts) using Chart.js.
- **Dynamic Filtering:** Filter transactions easily by type or category.
- **Responsive UI:** A beautiful, modern, and mobile-friendly interface built with vanilla HTML, CSS, and JS.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js, RemixIcon
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose)
- **Authentication:** JWT, bcryptjs, Nodemailer (OTP)

## 🚀 Local Setup

Follow these instructions to run the project locally on your machine.

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd money-manager

### 2. Install Dependencies
```bash
cd backend
npm install

### 3. Setup Environment Variables
- Since environment variables contain sensitive information, they are not included in this repository. 

- Create a new file named `.env` inside the `backend` folder and paste the following template inside it. Replace the placeholder text with your actual database and email credentials:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password

### 4. Start the server
```bash
npm run dev