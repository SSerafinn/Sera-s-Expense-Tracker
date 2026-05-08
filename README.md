# Seraf's Personal Tracker (v0.1.0)

A sleek, responsive, and secure personal finance application built to help you track your net worth, expenses, and savings goals seamlessly. Designed with a modern, minimal purple-themed aesthetic, this app makes financial tracking an enjoyable daily habit.

## ✨ Features

- **User Authentication:** Secure JWT-based login and registration system. All financial data is strictly partitioned and isolated per user.
- **Multi-Account Ledgers:** Track cash, bank accounts, and credit cards. Transfer funds effortlessly between your accounts.
- **Dynamic Net Worth:** Real-time calculation of your total assets minus liabilities. 
- **Income & Expense Tracking:** Log transactions with categorized tags to understand exactly where your money goes.
- **Automated Planned Expenses:** Set up recurring bills and subscriptions with the "Auto-Pay" feature so you never miss tracking a payment.
- **Savings Goals:** Set custom savings targets, visualize your progress with animated progress bars, and easily allocate funds towards your goals.
- **Insights Dashboard:** Beautiful visual breakdowns using Chart.js to track cash flow and category spending metrics.
- **Dark/Light Mode:** First-class support for both light and dark themes with dynamic, smooth transitions.

## 🛠 Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3, Vite
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Security:** bcrypt, jsonwebtoken
- **Visuals:** Chart.js, SweetAlert2, Lucide SVG Icons

## 🚀 Getting Started

### 1. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 2. Database Setup

Initialize the SQLite database. This command will create the `server/app.sqlite` file and set up the schema:

```bash
npm run setup
```

### 3. Run the Application

Start the development server (which concurrently starts both the Vite frontend and the Express backend):

```bash
npm run dev
```

The application will automatically open in your default browser at `http://localhost:5173`. 

Create a new account on the login page to start tracking!

## 📄 License

This project is open-source and available for personal use.
