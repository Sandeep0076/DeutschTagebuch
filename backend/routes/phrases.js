const express = require('express');
const router = express.Router();
const db = require('../database');

// Built-in common phrases
const BUILT_IN_PHRASES = [
  { english: "I agree with you up to a point.", german: "Ich stimme dir bis zu einem gewissen Punkt zu.", builtin: true },
  { english: "That depends on...", german: "Das kommt darauf an...", builtin: true },
  { english: "In my opinion...", german: "Meiner Meinung nach...", builtin: true },
  { english: "I am not sure if...", german: "Ich bin mir nicht sicher, ob...", builtin: true },
  { english: "Can you please explain that?", german: "Kannst du das bitte erklären?", builtin: true },
  { english: "On the one hand... on the other hand...", german: "Einerseits... andererseits...", builtin: true },
  { english: "It makes no difference to me.", german: "Das ist mir egal.", builtin: true },
  { english: "I would like to suggest that...", german: "Ich möchte vorschlagen, dass...", builtin: true }
];

/**
 * GET /api/phrases
 * Get all phrases (built-in + custom)
 */
router.get('/', (req, res) => {
  try {
    // Get custom phrases from database
    const customPhrases = db.prepare(`
      SELECT id, english, german, created_at, times_reviewed, 0 as builtin
      FROM custom_phrases 
      ORDER BY created_at DESC
    `).all();

    // Combine built-in and custom phrases
    const allPhrases = [...BUILT_IN_PHRASES, ...customPhrases];

    res.json({
      success: true,
      data: allPhrases,
      count: {
        total: allPhrases.length,
        builtin: BUILT_IN_PHRASES.length,
        custom: customPhrases.length
      }
    });
  } catch (error) {
    console.error('Error fetching phrases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phrases'
    });
  }
});

/**
 * POST /api/phrases
 * Add a custom phrase
 */
router.post('/', (req, res) => {
  try {
    const { english, german } = req.body;

    // Validation
    if (!english || !german) {
      return res.status(400).json({
        success: false,
        error: 'Both English and German text are required'
      });
    }

    if (typeof english !== 'string' || typeof german !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'English and German text must be strings'
      });
    }

    const cleanEnglish = english.trim();
    const cleanGerman = german.trim();

    if (cleanEnglish.length === 0 || cleanGerman.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'English and German text cannot be empty'
      });
    }

    // Check if phrase already exists
    const existing = db.prepare(`
      SELECT * FROM custom_phrases 
      WHERE LOWER(english) = LOWER(?) OR LOWER(german) = LOWER(?)
    `).get(cleanEnglish, cleanGerman);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This phrase already exists',
        data: existing
      });
    }

    // Insert new phrase
    const result = db.prepare(`
      INSERT INTO custom_phrases (english, german, created_at, times_reviewed)
      VALUES (?, ?, datetime('now'), 0)
    `).run(cleanEnglish, cleanGerman);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        english: cleanEnglish,
        german: cleanGerman,
        created_at: new Date().toISOString(),
        times_reviewed: 0,
        builtin: false
      }
    });
  } catch (error) {
    console.error('Error adding custom phrase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add custom phrase'
    });
  }
});

/**
 * DELETE /api/phrases/:id
 * Delete a custom phrase
 */
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM custom_phrases WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Custom phrase not found'
      });
    }

    res.json({
      success: true,
      message: 'Custom phrase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom phrase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom phrase'
    });
  }
});

/**
 * PUT /api/phrases/:id/review
 * Increment review count for a phrase
 */
router.put('/:id/review', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE custom_phrases 
      SET times_reviewed = times_reviewed + 1
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Custom phrase not found'
      });
    }

    res.json({
      success: true,
      message: 'Phrase review count updated'
    });
  } catch (error) {
    console.error('Error updating phrase review count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phrase'
    });
  }
});

module.exports = router;