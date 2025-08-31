const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// MySQL Connection

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: '', // Replace with your MySQL password
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
  const { name, nominee, category } = req.body;

  // Look up user ID from the name
  db.query('SELECT id FROM users WHERE name = ?', [name], (err, results) => {
    if (err) {
      console.error('Database error during user lookup:', err);
      return res.status(500).json({ error: 'Database error during user lookup' });
    }

    if (results.length === 0) {
      console.log(`User not found: ${name}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = results[0].id;

    // Prevent duplicate votes by user_id + category
    db.query('SELECT * FROM votes WHERE user_id = ? AND category = ?',
      [userId, category],
      (err, existingVote) => {
        if (err) {
          console.error('Database error during vote check:', err);
          return res.status(500).json({ error: 'Database error during vote check' });
        }

        if (existingVote.length > 0) {
          console.log(`Duplicate vote attempt: User ${userId} in ${category}`);
          return res.status(400).json({
            error: 'You have already voted in this category',
            category: category
          });
        }

        const insertQuery = 'INSERT INTO votes (user_id, nominee, category) VALUES (?, ?, ?)';
        db.query(insertQuery, [userId, nominee, category], (err, result) => {
          if (err) {
            console.error('Error recording vote:', err);
            return res.status(500).json({ error: 'Error recording vote' });
          }
          console.log(`Vote recorded: User ${userId} for ${nominee} in ${category}`);
          res.json({
            message: `Vote recorded for ${nominee} in ${category}`,
            voteId: result.insertId
          });
        });
      }
    );
  });
});


//Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

