const express = require('express');
const router = express.Router();
const db = require('../database');
const { extractVocabulary } = require('../services/vocabulary-extractor');

/**
 * GET /api/journal/entries
 * Get all journal entries with pagination
 */
router.get('/entries', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const sort = req.query.sort || 'newest';
    let orderBy = 'created_at DESC';

    switch (sort) {
      case 'oldest': orderBy = 'created_at ASC'; break;
      case 'longest': orderBy = 'word_count DESC'; break;
      case 'shortest': orderBy = 'word_count ASC'; break;
      default: orderBy = 'created_at DESC';
    }

    const entries = db.prepare(`
      SELECT * FROM journal_entries 
      ORDER BY ${orderBy} 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get();

    res.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entries'
    });
  }
});

/**
 * GET /api/journal/entry/:id
 * Get a specific journal entry
 */
router.get('/entry/:id', (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entry'
    });
  }
});

/**
 * POST /api/journal/entry
 * Create a new journal entry
 */
router.post('/entry', async (req, res) => {
  try {
    const { english_text, german_text, session_duration } = req.body;

    // Validation
    if (!english_text || !german_text) {
      return res.status(400).json({
        success: false,
        error: 'Both English and German text are required'
      });
    }

    // Count words in German text
    const wordCount = german_text.trim().split(/\s+/).length;

    // Insert journal entry
    const result = db.prepare(`
      INSERT INTO journal_entries (english_text, german_text, word_count, session_duration)
      VALUES (?, ?, ?, ?)
    `).run(english_text, german_text, wordCount, session_duration || 0);

    // Extract vocabulary from German text (async)
    const newWords = await extractVocabulary(german_text);

    // Update progress stats for today
    const today = new Date().toISOString().split('T')[0];
    const existingStats = db.prepare('SELECT * FROM progress_stats WHERE date = ?').get(today);

    if (existingStats) {
      db.prepare(`
        UPDATE progress_stats
        SET words_learned = words_learned + ?,
            entries_written = entries_written + 1,
            minutes_practiced = minutes_practiced + ?
        WHERE date = ?
      `).run(newWords.length, session_duration || 0, today);
    } else {
      db.prepare(`
        INSERT INTO progress_stats (date, words_learned, entries_written, minutes_practiced)
        VALUES (?, ?, 1, ?)
      `).run(today, newWords.length, session_duration || 0);
    }

    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        english_text,
        german_text,
        word_count: wordCount,
        created_at: new Date().toISOString(),
        new_words: newWords
      }
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create journal entry'
    });
  }
});

/**
 * PUT /api/journal/entry/:id
 * Update a journal entry
 */
router.put('/entry/:id', async (req, res) => {
  try {
    const { english_text, german_text } = req.body;

    // Check if entry exists
    const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      });
    }

    // Count words
    const wordCount = german_text ? german_text.trim().split(/\s+/).length : existing.word_count;

    // Update entry
    db.prepare(`
      UPDATE journal_entries
      SET english_text = ?, german_text = ?, word_count = ?
      WHERE id = ?
    `).run(
      english_text || existing.english_text,
      german_text || existing.german_text,
      wordCount,
      req.params.id
    );

    // If German text changed, re-extract vocabulary (async)
    let newWords = [];
    if (german_text && german_text !== existing.german_text) {
      newWords = await extractVocabulary(german_text);
    }

    res.json({
      success: true,
      data: {
        id: req.params.id,
        english_text: english_text || existing.english_text,
        german_text: german_text || existing.german_text,
        word_count: wordCount,
        new_words: newWords
      }
    });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update journal entry'
    });
  }
});

/**
 * DELETE /api/journal/entry/:id
 * Delete a journal entry
 */
router.delete('/entry/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM journal_entries WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete journal entry'
    });
  }
});

/**
 * GET /api/journal/search
 * Search journal entries
 */
router.get('/search', (req, res) => {
  try {
    const { q, startDate, endDate } = req.query;

    if (!q && !startDate && !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Search query or date range required'
      });
    }

    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params = [];

    if (q) {
      query += ' AND (english_text LIKE ? OR german_text LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (startDate) {
      query += ' AND date(created_at) >= date(?)';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date(created_at) <= date(?)';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const results = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching journal entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search journal entries'
    });
  }
});

module.exports = router;