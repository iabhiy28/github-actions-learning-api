const express = require('express');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to GitHub Actions Learning API',
    version: '1.0.0',
  });
});


// test change for level five

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice', role: 'developer' },
    { id: 2, name: 'Bob', role: 'designer' },
    { id: 3, name: 'Charlie', role: 'devops' },
  ];
  res.json(users);
});

module.exports = app;
