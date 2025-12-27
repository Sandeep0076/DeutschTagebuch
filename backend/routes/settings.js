const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * GET /api/settings
 * Get user settings
 */
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM user_settings LIMIT 1').get();

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          daily_goal_minutes: 60,
          daily_sentence_goal: 10,
          theme: 'light'
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/settings
 * Update user settings
 */
router.put('/', (req, res) => {
  try {
    const { daily_goal_minutes, daily_sentence_goal, theme } = req.body;

    // Validation
    if (daily_goal_minutes !== undefined) {
      if (typeof daily_goal_minutes !== 'number' || daily_goal_minutes < 1 || daily_goal_minutes > 480) {
        return res.status(400).json({
          success: false,
          error: 'Daily goal minutes must be between 1 and 480'
        });
      }
    }

    if (daily_sentence_goal !== undefined) {
      if (typeof daily_sentence_goal !== 'number' || daily_sentence_goal < 1 || daily_sentence_goal > 100) {
        return res.status(400).json({
          success: false,
          error: 'Daily sentence goal must be between 1 and 100'
        });
      }
    }

    if (theme !== undefined) {
      if (!['light', 'dark'].includes(theme)) {
        return res.status(400).json({
          success: false,
          error: 'Theme must be either "light" or "dark"'
        });
      }
    }

    // Check if settings exist
    const existing = db.prepare('SELECT * FROM user_settings LIMIT 1').get();

    if (existing) {
      // Update existing settings
      const updates = [];
      const params = [];

      if (daily_goal_minutes !== undefined) {
        updates.push('daily_goal_minutes = ?');
        params.push(daily_goal_minutes);
      }
      if (daily_sentence_goal !== undefined) {
        updates.push('daily_sentence_goal = ?');
        params.push(daily_sentence_goal);
      }
      if (theme !== undefined) {
        updates.push('theme = ?');
        params.push(theme);
      }

      if (updates.length > 0) {
        params.push(existing.id);
        db.prepare(`UPDATE user_settings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }

      // Fetch updated settings
      const updated = db.prepare('SELECT * FROM user_settings WHERE id = ?').get(existing.id);
      
      res.json({
        success: true,
        data: updated
      });
    } else {
      // Create new settings
      const result = db.prepare(`
        INSERT INTO user_settings (daily_goal_minutes, daily_sentence_goal, theme)
        VALUES (?, ?, ?)
      `).run(
        daily_goal_minutes || 60,
        daily_sentence_goal || 10,
        theme || 'light'
      );

      const newSettings = db.prepare('SELECT * FROM user_settings WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        data: newSettings
      });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

module.exports = router;