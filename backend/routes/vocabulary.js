const express = require('express');
const router = express.Router();
const db = require('../database');
const { getVocabularyStats } = require('../services/vocabulary-extractor');

/**
 * GET /api/vocabulary
 * Get all vocabulary words with optional filtering and sorting
 */
router.get('/', (req, res) => {
  try {
    const { sort, search } = req.query;
    let query = 'SELECT * FROM vocabulary';
    const params = [];

    // Add search filter
    if (search) {
      query += ' WHERE word LIKE ?';
      params.push(`%${search}%`);
    }

    // Add sorting
    switch (sort) {
      case 'az':
        query += ' ORDER BY word ASC';
        break;
      case 'za':
        query += ' ORDER BY word DESC';
        break;
      case 'frequency':
        query += ' ORDER BY frequency DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY first_seen DESC';
        break;
    }

    const words = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: words,
      count: words.length
    });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vocabulary'
    });
  }
});

/**
 * GET /api/vocabulary/stats
 * Get vocabulary statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getVocabularyStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching vocabulary stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vocabulary statistics'
    });
  }
});

/**
 * POST /api/vocabulary
 * Manually add a vocabulary word
 */
router.post('/', (req, res) => {
  try {
    const { word } = req.body;

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid word is required'
      });
    }

    const cleanWord = word.trim();

    // Check if word already exists
    const existing = db.prepare('SELECT * FROM vocabulary WHERE LOWER(word) = LOWER(?)').get(cleanWord);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Word already exists in vocabulary',
        data: existing
      });
    }

    // Insert new word
    const result = db.prepare(`
      INSERT INTO vocabulary (word, first_seen, frequency, last_reviewed)
      VALUES (?, datetime('now'), 1, datetime('now'))
    `).run(cleanWord);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        word: cleanWord,
        first_seen: new Date().toISOString(),
        frequency: 1
      }
    });
  } catch (error) {
    console.error('Error adding vocabulary word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add vocabulary word'
    });
  }
});

/**
 * DELETE /api/vocabulary/:id
 * Delete a vocabulary word
 */
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM vocabulary WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vocabulary word not found'
      });
    }

    res.json({
      success: true,
      message: 'Vocabulary word deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vocabulary word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vocabulary word'
    });
  }
});

/**
 * PUT /api/vocabulary/:id/review
 * Mark a word as reviewed (updates last_reviewed timestamp)
 */
router.put('/:id/review', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE vocabulary 
      SET last_reviewed = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vocabulary word not found'
      });
    }

    res.json({
      success: true,
      message: 'Word marked as reviewed'
    });
  } catch (error) {
    console.error('Error updating vocabulary word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update vocabulary word'
    });
  }
});

module.exports = router;