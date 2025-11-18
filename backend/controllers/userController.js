const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';


const register = async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      age,
      nationality,
      player_role,
      profile_photo,
    } = req.body;

    // Validation
    if (!username || !password || !full_name || !player_role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, full_name, and player_role are required'
      });
    }

    // Validate player_role enum
    const validRoles = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'KEEPER'];
    if (!validRoles.includes(player_role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player_role. Must be BATSMAN, BOWLER, ALL_ROUNDER, or KEEPER'
      });
    }

    // Validate age if provided
    if (age && (age < 15 || age > 45)) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 15 and 45'
      });
    }

    // Check if username already exists
    const [existingUsers] = await db.query(
      'SELECT user_id FROM USERS WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO USERS (username, password, full_name, age, nationality, player_role, profile_photo) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, full_name, age || null, nationality || null, player_role, profile_photo || null]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: result.insertId,
        username,
        is_admin: false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 730 * 60 * 60 * 1000,
    });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user_id: result.insertId,
        username,
        full_name,
        player_role,
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};


const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user
    const [users] = await db.query(
      'SELECT * FROM USERS WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        is_admin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 730 * 60 * 60 * 1000,
    });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        age: user.age,
        nationality: user.nationality,
        player_role: user.player_role,
        profile_photo: user.profile_photo,
        is_admin: user.is_admin,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};


const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id; // Set by auth middleware

    const [users] = await db.query(
      'SELECT user_id, username, full_name, age, nationality, player_role, profile_photo, is_admin, created_at FROM USERS WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: users[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { full_name, age, nationality, player_role, profile_photo } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (full_name) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (age) {
      if (age < 15 || age > 45) {
        return res.status(400).json({
          success: false,
          message: 'Age must be between 15 and 45'
        });
      }
      updates.push('age = ?');
      values.push(age);
    }
    if (nationality) {
      updates.push('nationality = ?');
      values.push(nationality);
    }
    if (player_role) {
      const validRoles = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'KEEPER'];
      if (!validRoles.includes(player_role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid player_role'
        });
      }
      updates.push('player_role = ?');
      values.push(player_role);
    }
    if (profile_photo !== undefined) {
      updates.push('profile_photo = ?');
      values.push(profile_photo);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(userId);

    await db.query(
      `UPDATE USERS SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    // Fetch updated user
    const [users] = await db.query(
      'SELECT user_id, username, full_name, age, nationality, player_role, profile_photo, is_admin FROM USERS WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: users[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.user_id;

    await db.query('DELETE FROM USERS WHERE user_id = ?', [userId]);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, username, full_name, age, nationality, player_role, is_admin, created_at FROM USERS'
    );

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  getAllUsers
};