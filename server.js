const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from current directory
app.use(express.static(__dirname));

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create tables if they don't exist
async function initDB() {
  try {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
      console.warn('⚠️ WARNING: Database connection skipped. Please replace [YOUR-PASSWORD] in .env file.');
      return;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        course VARCHAR(100),
        section VARCHAR(50),
        year VARCHAR(100),
        college VARCHAR(255),
        phone VARCHAR(50),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        picture TEXT,
        role VARCHAR(50) DEFAULT 'student',
        permissions JSONB DEFAULT '[]'::jsonb,
        is_banned BOOLEAN DEFAULT false,
        last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB
      );

      INSERT INTO app_config (key, value) 
      VALUES ('event_details', '{"date": "Every Saturday", "time": "Morning 9:30 AM / Afternoon 2:00 PM", "venue": "EEE Classroom"}'::jsonb)
      ON CONFLICT (key) DO NOTHING;

      INSERT INTO app_config (key, value)
      VALUES ('past_winners', '[]'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);
    
    // Attempt to alter columns if they already exist with shorter lengths, and add new columns
    try {
      await pool.query(`
        ALTER TABLE rsvps ALTER COLUMN year TYPE VARCHAR(100);
        ALTER TABLE rsvps ALTER COLUMN student_id TYPE VARCHAR(100);
        ALTER TABLE rsvps ALTER COLUMN phone TYPE VARCHAR(50);
        ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(100);
        ALTER TABLE users ADD CONSTRAINT users_roll_number_key UNIQUE (roll_number);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_no VARCHAR(15);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
      `);
    } catch (alterErr) {}
    
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
  }
}

initDB();

// ==========================================
// RSVP Endpoints
// ==========================================
app.get('/api/rsvps', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rsvps ORDER BY timestamp DESC');
    const rsvps = result.rows.map(row => ({
      name: row.name,
      studentId: row.student_id,
      course: row.course,
      section: row.section,
      year: row.year,
      college: row.college,
      phone: row.phone,
      timestamp: row.timestamp
    }));
    res.json(rsvps);
  } catch (err) {
    console.error('Error fetching RSVPs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/rsvps', async (req, res) => {
  try {
    const { name, studentId, course, section, year, college, phone, email } = req.body;
    
    // Check if user already registered this week
    if (email) {
      const checkQuery = `
        SELECT * FROM rsvps 
        WHERE email = $1 
        AND date_trunc('week', timestamp) = date_trunc('week', CURRENT_TIMESTAMP)
      `;
      const checkResult = await pool.query(checkQuery, [email]);
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ error: 'You have already registered for an event this week.' });
      }
    }

    const query = `
      INSERT INTO rsvps (name, student_id, course, section, year, college, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [name, studentId, course, section, year, college, phone, email]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving RSVP:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/rsvps', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE rsvps RESTART IDENTITY');
    res.json({ message: 'All RSVPs deleted' });
  } catch (err) {
    console.error('Error deleting RSVPs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Admin & User Management Endpoints
// ==========================================

// Google Sign-In backend verification & user tracking
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0 && existingUser.rows[0].is_banned) {
      return res.status(403).json({ error: 'Your account has been banned from the portal.' });
    }

    const query = `
      INSERT INTO users (email, name, picture, last_login)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, picture = EXCLUDED.picture, last_login = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [email, name, picture]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/user/profile/:email', async (req, res) => {
  try {
    const result = await pool.query('SELECT email, name, picture, role, username, year, roll_number, contact_no, is_banned FROM users WHERE email = $1', [req.params.email]);
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(404).json({ error: 'User not found' });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/user/profile', async (req, res) => {
  try {
    const { email, name, username, picture, year, rollNumber, contactNo } = req.body;
    
    // Check if username, rollNumber and contactNo are required
    if (!username) {
      return res.status(400).json({ error: 'Username is mandatory.' });
    }
    if (!rollNumber) {
      return res.status(400).json({ error: 'Roll Number is mandatory.' });
    }
    if (!/^(25VV1A02|26VV1A02)(0[1-9]|[1-5][0-9]|6[0-6])$/.test(rollNumber)) {
      return res.status(400).json({ error: 'Roll number must start with 25VV1A02 or 26VV1A02 followed by a number between 01 and 66.' });
    }
    if (!contactNo || contactNo.length !== 10 || !/^\d{10}$/.test(contactNo)) {
      return res.status(400).json({ error: 'A valid 10-digit Contact No is mandatory.' });
    }

    const query = `
      UPDATE users SET name = $1, username = $2, picture = COALESCE($3, picture), year = $4, roll_number = $5, contact_no = $6
      WHERE email = $7 RETURNING email, name, picture, role, username, year, roll_number, contact_no
    `;
    const result = await pool.query(query, [name, username, picture, year, rollNumber, contactNo, email]);
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(404).json({ error: 'User not found' });
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'users_username_key' || err.constraint === 'users_username_key1') {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      if (err.constraint === 'users_roll_number_key') {
        return res.status(409).json({ error: 'Roll number is already registered to another account.' });
      }
    }
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user RSVP history
app.get('/api/user/history/:email', async (req, res) => {
  try {
    const query = 'SELECT * FROM rsvps WHERE email = $1 ORDER BY timestamp DESC';
    const result = await pool.query(query, [req.params.email]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin login verification
app.post('/api/admin/login', async (req, res) => {
  try {
    const { adminId, adminPass, googleEmail } = req.body;

    // Login via Google OAuth
    if (googleEmail) {
      const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [googleEmail]);
      if (userRes.rows.length > 0 && userRes.rows[0].role === 'admin') {
        if (userRes.rows[0].is_banned) {
          return res.status(403).json({ success: false, error: 'Your admin account has been banned.' });
        }
        return res.json({ success: true, user: userRes.rows[0] });
      }
      return res.status(401).json({ success: false, error: 'Unauthorized: Not an admin.' });
    }

    // Login via .env credentials (master override)
    if (
      adminId &&
      adminId.toLowerCase() === (process.env.ADMIN_ID || 'admin_123').toLowerCase() &&
      adminPass === (process.env.ADMIN_PASS || 'admin@123')
    ) {
      return res.json({ success: true, user: { role: 'admin', permissions: ['manage_users', 'manage_rsvps', 'manage_event'] } });
    }

    res.status(401).json({ success: false, error: 'Invalid credentials' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch all users for admin dashboard
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY last_login DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a user's role/permissions
app.put('/api/admin/users/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { role, permissions } = req.body;
    
    const query = `
      UPDATE users SET role = $1, permissions = $2
      WHERE email = $3
      RETURNING *
    `;
    const result = await pool.query(query, [role, JSON.stringify(permissions || []), email]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle ban status
app.put('/api/admin/users/:email/ban', async (req, res) => {
  try {
    const { email } = req.params;
    const { is_banned } = req.body;
    
    const query = `
      UPDATE users SET is_banned = $1
      WHERE email = $2
      RETURNING *
    `;
    const result = await pool.query(query, [is_banned, email]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating ban status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Config / Event Endpoints
// ==========================================
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "712129213277-vvlrfsfcto664s31bb025v4j1dgulvbj.apps.googleusercontent.com"
  });
});

app.get('/api/config/event', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM app_config WHERE key = 'event_details'");
    if (result.rows.length > 0) {
      res.json(result.rows[0].value);
    } else {
      res.json({ date: 'Every Saturday', time: 'Morning 9:30 AM / Afternoon 2:00 PM', venue: 'EEE Classroom' });
    }
  } catch (err) {
    console.error('Error fetching event config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/config/event', async (req, res) => {
  try {
    const { date, time, venue } = req.body;
    const value = JSON.stringify({ date, time, venue });
    const query = `
      INSERT INTO app_config (key, value) VALUES ('event_details', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      RETURNING value;
    `;
    const result = await pool.query(query, [value]);
    res.json(result.rows[0].value);
  } catch (err) {
    console.error('Error updating event config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/config/winners', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM app_config WHERE key = 'past_winners'");
    if (result.rows.length > 0) {
      res.json(result.rows[0].value);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error('Error fetching winners:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/config/winners', async (req, res) => {
  try {
    const { winners } = req.body;
    const value = JSON.stringify(winners || []);
    const query = `
      INSERT INTO app_config (key, value) VALUES ('past_winners', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      RETURNING value;
    `;
    const result = await pool.query(query, [value]);
    res.json(result.rows[0].value);
  } catch (err) {
    console.error('Error updating winners:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
