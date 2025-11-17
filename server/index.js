import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
// CORS configuration - allow requests from your frontend
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In production, you might want to restrict this to specific domains
    // For now, allow all origins for easier development
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// Database Initialization
// ============================================================================

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_recipes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_recipes (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        components JSONB NOT NULL,
        total_volume REAL NOT NULL,
        volume_unit VARCHAR(10) NOT NULL,
        ph REAL,
        instructions JSONB,
        notes TEXT,
        tags JSONB,
        created_at TIMESTAMP NOT NULL,
        modified_at TIMESTAMP NOT NULL
      )
    `);

    // Create user_measurements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_measurements (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        protein_name VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        absorbance_280 REAL NOT NULL,
        extinction_coefficient REAL NOT NULL,
        molecular_weight REAL NOT NULL,
        path_length REAL NOT NULL,
        concentration REAL NOT NULL,
        concentration_molar REAL NOT NULL,
        notes TEXT,
        sequence TEXT,
        batch_number VARCHAR(255)
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
  }
}

// ============================================================================
// Authentication Middleware
// ============================================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ============================================================================
// Authentication Routes
// ============================================================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res.json({
      success: false,
      message: 'Username, email, and password are required'
    });
  }

  if (password.length < 6) {
    return res.json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({
      success: false,
      message: 'Username and password are required'
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current user (verify token)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================================================================
// Recipe Routes
// ============================================================================

// Get all user recipes
app.get('/api/recipes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_recipes WHERE user_id = $1 ORDER BY modified_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      recipes: result.rows
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes'
    });
  }
});

// Save recipe
app.post('/api/recipes', authenticateToken, async (req, res) => {
  const { id, name, description, category, components, total_volume, volume_unit, ph, instructions, notes, tags, created_at, modified_at } = req.body;

  try {
    await pool.query(
      `INSERT INTO user_recipes (id, user_id, name, description, category, components, total_volume, volume_unit, ph, instructions, notes, tags, created_at, modified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         name = $3, description = $4, category = $5, components = $6,
         total_volume = $7, volume_unit = $8, ph = $9, instructions = $10,
         notes = $11, tags = $12, modified_at = $14`,
      [id, req.user.id, name, description, category, JSON.stringify(components), total_volume, volume_unit, ph, JSON.stringify(instructions), notes, JSON.stringify(tags), created_at, modified_at]
    );

    res.json({
      success: true,
      message: 'Recipe saved successfully'
    });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save recipe'
    });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM user_recipes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete recipe'
    });
  }
});

// ============================================================================
// Measurement Routes
// ============================================================================

// Get all user measurements
app.get('/api/measurements', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_measurements WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      measurements: result.rows
    });
  } catch (error) {
    console.error('Get measurements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch measurements'
    });
  }
});

// Save measurement
app.post('/api/measurements', authenticateToken, async (req, res) => {
  const {
    id, protein_name, date, absorbance_280, extinction_coefficient,
    molecular_weight, path_length, concentration, concentration_molar,
    notes, sequence, batch_number
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO user_measurements (id, user_id, protein_name, date, absorbance_280, extinction_coefficient, molecular_weight, path_length, concentration, concentration_molar, notes, sequence, batch_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         protein_name = $3, date = $4, absorbance_280 = $5, extinction_coefficient = $6,
         molecular_weight = $7, path_length = $8, concentration = $9, concentration_molar = $10,
         notes = $11, sequence = $12, batch_number = $13`,
      [id, req.user.id, protein_name, date, absorbance_280, extinction_coefficient, molecular_weight, path_length, concentration, concentration_molar, notes, sequence, batch_number]
    );

    res.json({
      success: true,
      message: 'Measurement saved successfully'
    });
  } catch (error) {
    console.error('Save measurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save measurement'
    });
  }
});

// Delete measurement
app.delete('/api/measurements/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM user_measurements WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Measurement deleted successfully'
    });
  } catch (error) {
    console.error('Delete measurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete measurement'
    });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Protein Engineering Tools API',
    version: '1.0.0',
    status: 'running'
  });
});

// ============================================================================
// Start Server
// ============================================================================

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
