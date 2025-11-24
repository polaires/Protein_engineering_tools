import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { Resend } from 'resend';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:1420';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

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
    // Create users table with email verification and password reset fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expiry TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if they don't exist (for existing tables)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='users' AND column_name='email_verified') THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='users' AND column_name='verification_token') THEN
          ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='users' AND column_name='verification_token_expiry') THEN
          ALTER TABLE users ADD COLUMN verification_token_expiry TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='users' AND column_name='reset_token') THEN
          ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='users' AND column_name='reset_token_expiry') THEN
          ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='users' AND column_name='verification_email_sent_at') THEN
          ALTER TABLE users ADD COLUMN verification_email_sent_at TIMESTAMP;
        END IF;
      END $$;
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
// Email Service
// ============================================================================

async function sendVerificationEmail(email, token, username) {
  try {
    const verificationUrl = `${FRONTEND_URL}/?token=${token}`;

    const { data, error } = await resend.emails.send({
      from: 'Biochem Space <noreply@biochem.space>',
      to: email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🧬 Biochem Space</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Protein Engineering Tools</p>
          </div>

          <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${username}! 👋</h2>

            <p style="font-size: 16px; color: #4b5563;">
              Welcome to Biochem Space! To get started, please verify your email address.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer;">
                Verify Email Address
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Or copy and paste this link into your browser:
            </p>
            <p style="background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; word-break: break-all; color: #667eea;">
              ${verificationUrl}
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 13px; color: #9ca3af; margin: 5px 0;">
                ⏰ This link will expire in 24 hours
              </p>
              <p style="font-size: 13px; color: #9ca3af; margin: 5px 0;">
                🔒 If you didn't create an account, you can safely ignore this email
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>
              © ${new Date().getFullYear()} Biochem Space. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send verification email');
    }

    console.log('Verification email sent:', data);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

async function sendPasswordResetEmail(email, token, username) {
  try {
    const resetUrl = `${FRONTEND_URL}/?reset-token=${token}`;

    const { data, error } = await resend.emails.send({
      from: 'Biochem Space <noreply@biochem.space>',
      to: email,
      subject: 'Reset your password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Biochem Space</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Password Reset</p>
          </div>

          <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${username}! 👋</h2>

            <p style="font-size: 16px; color: #4b5563;">
              We received a request to reset your password for your Biochem Space account.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Or copy and paste this link into your browser:
            </p>
            <p style="background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; word-break: break-all; color: #667eea;">
              ${resetUrl}
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 13px; color: #9ca3af; margin: 5px 0;">
                ⏰ This link will expire in 1 hour
              </p>
              <p style="font-size: 13px; color: #9ca3af; margin: 5px 0;">
                🔒 If you didn't request a password reset, you can safely ignore this email
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>
              © ${new Date().getFullYear()} Biochem Space. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send password reset email');
    }

    console.log('Password reset email sent:', data);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with verification token
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, verification_token, verification_token_expiry, verification_email_sent_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, username, email, email_verified, created_at`,
      [username, email, passwordHash, verificationToken, tokenExpiry]
    );

    const user = result.rows[0];

    // Send verification email (don't wait for it to complete)
    sendVerificationEmail(email, verificationToken, username).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
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
      'SELECT id, username, email, password_hash, email_verified, created_at FROM users WHERE username = $1',
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
        email_verified: user.email_verified,
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

// Verify email with token
app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.json({
      success: false,
      message: 'Verification token is required'
    });
  }

  try {
    console.log('Verifying email with token:', token.substring(0, 10) + '...');

    // First, check if the token exists at all
    const tokenCheck = await pool.query(
      `SELECT id, username, email, email_verified, verification_token_expiry,
              verification_token_expiry > NOW() as is_not_expired
       FROM users
       WHERE verification_token = $1`,
      [token]
    );

    console.log('Token check result:', {
      found: tokenCheck.rows.length > 0,
      details: tokenCheck.rows.length > 0 ? {
        email_verified: tokenCheck.rows[0].email_verified,
        is_not_expired: tokenCheck.rows[0].is_not_expired,
        expiry: tokenCheck.rows[0].verification_token_expiry
      } : 'No matching token found'
    });

    const result = await pool.query(
      `SELECT id, username, email FROM users
       WHERE verification_token = $1
       AND verification_token_expiry > NOW()
       AND email_verified = FALSE`,
      [token]
    );

    if (result.rows.length === 0) {
      // Provide more specific error message
      if (tokenCheck.rows.length === 0) {
        console.log('Token not found in database');
        return res.json({
          success: false,
          message: 'Invalid verification token. Please request a new verification email.'
        });
      }

      const user = tokenCheck.rows[0];
      if (user.email_verified) {
        console.log('Email already verified');
        return res.json({
          success: false,
          message: 'Email has already been verified. You can now log in.'
        });
      }

      if (!user.is_not_expired) {
        console.log('Token expired');
        return res.json({
          success: false,
          message: 'Verification token has expired. Please request a new verification email.'
        });
      }

      return res.json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    const user = result.rows[0];
    console.log('Email verification successful for user:', user.username);

    // Mark email as verified and clear token
    await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           verification_token = NULL,
           verification_token_expiry = NULL
       WHERE id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

// Resend verification email (authenticated - for logged in users)
app.post('/api/auth/resend-verification', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, email_verified, verification_email_sent_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check cooldown period (60 seconds)
    const COOLDOWN_SECONDS = 60;
    if (user.verification_email_sent_at) {
      const lastSentAt = new Date(user.verification_email_sent_at);
      const secondsSinceLastSent = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);

      if (secondsSinceLastSent < COOLDOWN_SECONDS) {
        const remainingSeconds = COOLDOWN_SECONDS - secondsSinceLastSent;
        return res.json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting another verification email.`,
          remainingSeconds: remainingSeconds
        });
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `UPDATE users
       SET verification_token = $1,
           verification_token_expiry = $2,
           verification_email_sent_at = NOW()
       WHERE id = $3`,
      [verificationToken, tokenExpiry, user.id]
    );

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, user.username);

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
      cooldownSeconds: COOLDOWN_SECONDS
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email'
    });
  }
});

// Resend verification email (public - uses email address)
app.post('/api/auth/resend-verification-public', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const result = await pool.query(
      'SELECT id, username, email, email_verified, verification_email_sent_at FROM users WHERE email = $1',
      [email]
    );

    // For security, always return success even if email doesn't exist
    // This prevents email enumeration attacks
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an unverified account exists with that email, a verification link has been sent.',
        cooldownSeconds: 60
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({
        success: true,
        message: 'If an unverified account exists with that email, a verification link has been sent.',
        cooldownSeconds: 60
      });
    }

    // Check cooldown period (60 seconds)
    const COOLDOWN_SECONDS = 60;
    if (user.verification_email_sent_at) {
      const lastSentAt = new Date(user.verification_email_sent_at);
      const secondsSinceLastSent = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);

      if (secondsSinceLastSent < COOLDOWN_SECONDS) {
        const remainingSeconds = COOLDOWN_SECONDS - secondsSinceLastSent;
        return res.json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting another verification email.`,
          remainingSeconds: remainingSeconds
        });
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `UPDATE users
       SET verification_token = $1,
           verification_token_expiry = $2,
           verification_email_sent_at = NOW()
       WHERE id = $3`,
      [verificationToken, tokenExpiry, user.id]
    );

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, user.username);

    res.json({
      success: true,
      message: 'If an unverified account exists with that email, a verification link has been sent.',
      cooldownSeconds: COOLDOWN_SECONDS
    });
  } catch (error) {
    console.error('Resend verification public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request'
    });
  }
});

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE email = $1',
      [email]
    );

    // For security, always return success even if email doesn't exist
    // This prevents email enumeration attacks
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await pool.query(
      `UPDATE users
       SET reset_token = $1,
           reset_token_expiry = $2
       WHERE id = $3`,
      [resetToken, tokenExpiry, user.id]
    );

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken, user.username);

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Find user with valid reset token
    const result = await pool.query(
      `SELECT id, username, email FROM users
       WHERE reset_token = $1
       AND reset_token_expiry > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    const user = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_token = NULL,
           reset_token_expiry = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now login with your new password.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// Get current user (verify token)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, email_verified, created_at FROM users WHERE id = $1',
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
// HMMER/Pfam Proxy (for CORS handling)
// ============================================================================

app.post('/api/hmmer/search', async (req, res) => {
  try {
    console.log('HMMER search request received:', { hasSequence: !!req.body.sequence, database: req.body.database });

    const { sequence, database } = req.body;

    if (!sequence) {
      console.error('No sequence provided');
      return res.status(400).json({ error: 'Sequence is required' });
    }

    // HMMER API v1 expects JSON with 'input' and 'database' parameters
    const requestBody = {
      input: sequence,
      database: database || 'pfam'
    };

    console.log('Submitting to HMMER API with sequence length:', sequence.length);

    // Use the correct HMMER API v1 endpoint with JSON
    const submitResponse = await fetch('https://www.ebi.ac.uk/Tools/hmmer/api/v1/search/hmmscan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    console.log('HMMER API response status:', submitResponse.status);

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('HMMER API error response:', errorText);
      throw new Error(`HMMER API error: ${submitResponse.status} ${submitResponse.statusText}`);
    }

    const submitData = await submitResponse.json();
    console.log('HMMER API response data:', submitData);

    // API v1 returns { id: "..." } directly, not { job: { id: "..." } }
    const jobId = submitData.id || submitData.job?.id;

    if (!jobId) {
      console.error('No job ID in response:', submitData);
      throw new Error('Failed to get job ID from HMMER API');
    }

    console.log('HMMER search successful, job ID:', jobId);
    res.json({ jobId });
  } catch (error) {
    console.error('HMMER search proxy error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
});

app.get('/api/hmmer/results/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Correct API v1 endpoint: /result/{id} (singular, no /score)
    const response = await fetch(`https://www.ebi.ac.uk/Tools/hmmer/api/v1/result/${jobId}`);

    if (response.status === 200) {
      const data = await response.json();
      console.log('HMMER results received for job:', jobId);
      console.log('Results structure:', JSON.stringify(data, null, 2).substring(0, 2000)); // Log first 2000 chars
      res.json({ status: 'complete', data });
    } else if (response.status === 202) {
      console.log('Job still running:', jobId);
      res.json({ status: 'running' });
    } else {
      throw new Error(`HMMER API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('HMMER results proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint for fetch availability
app.get('/api/hmmer/test', async (req, res) => {
  try {
    console.log('Test endpoint called');
    console.log('fetch available:', typeof fetch);

    // Test a simple fetch call
    const testResponse = await fetch('https://www.ebi.ac.uk/Tools/hmmer');
    console.log('Test fetch status:', testResponse.status);

    res.json({
      success: true,
      fetchAvailable: typeof fetch !== 'undefined',
      testStatus: testResponse.status,
      message: 'Fetch is working correctly'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fetchAvailable: typeof fetch !== 'undefined'
    });
  }
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
