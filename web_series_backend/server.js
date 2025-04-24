const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// MySQL Connection

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Or use process.env.DB_USER
  password: 'ricky123', // Or use process.env.DB_PASS
  database: 'web_series_awards'
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err.stack);
    return;
  }
  console.log('Connected to MySQL as ID ' + db.threadId);
});

app.use(cors());
app.use(express.json());

//  Register

app.post('/register', async (req, res) => {
  const { name, email, country, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error during email check' });

    if (results.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, country, password) VALUES (?, ?, ?, ?)';
    db.query(query, [name, email, country, hashedPassword], (err, result) => {
      if (err) return res.status(500).json({ error: 'Error registering user' });
      res.json({ message: `Registration successful for ${name}` });
    });
  });
});

//  Login

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error during login' });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.json({ message: 'Login successful', name: user.name });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  });
});

//  Vote

app.post('/vote', (req, res) => {
  const { name, nominee } = req.body;

  // Look up user ID from the name
  db.query('SELECT id FROM users WHERE name = ?', [name], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error during user lookup' });

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = results[0].id;

    // Optional: prevent duplicate votes by user_id + nominee
    db.query('SELECT * FROM votes WHERE user_id = ? AND nominee = ?', [userId, nominee], (err, existingVote) => {
      if (err) return res.status(500).json({ error: 'Database error during vote check' });

      if (existingVote.length > 0) {
        return res.status(400).json({ error: 'You have already voted for this nominee' });
      }

      const insertQuery = 'INSERT INTO votes (user_id, nominee) VALUES (?, ?)';
      db.query(insertQuery, [userId, nominee], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error recording vote' });
        res.json({ message: `Vote recorded for ${nominee}` });
      });
    });
  });
});


//Start Server

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
