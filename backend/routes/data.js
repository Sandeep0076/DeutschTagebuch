const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * GET /api/data/export
 * Export all user data as JSON
 */
router.get('/export', (req, res) => {
  try {
    // Fetch all data from all tables
    const journalEntries = db.prepare('SELECT * FROM journal_entries ORDER BY created_at').all();
    const vocabulary = db.prepare('SELECT * FROM vocabulary ORDER BY first_seen').all();
    const customPhrases = db.prepare('SELECT * FROM custom_phrases ORDER BY created_at').all();
    const settings = db.prepare('SELECT * FROM user_settings LIMIT 1').get();
    const progressStats = db.prepare('SELECT * FROM progress_stats ORDER BY date').all();

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        journalEntries,
        vocabulary,
        customPhrases,
        settings: settings || {},
        progressStats
      },
      metadata: {
        totalEntries: journalEntries.length,
        totalVocabulary: vocabulary.length,
        totalCustomPhrases: customPhrases.length,
        totalProgressDays: progressStats.length
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=deutschtagebuch-backup-${new Date().toISOString().split('T')[0]}.json`);
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

/**
 * POST /api/data/import
 * Import data from JSON backup
 */
router.post('/import', (req, res) => {
  try {
    const { data, mode } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid import data format'
      });
    }

    // Validate data structure
    if (!data.data || typeof data.data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data structure'
      });
    }

    const importMode = mode || 'merge'; // 'merge' or 'replace'
    const stats = {
      journalEntries: 0,
      vocabulary: 0,
      customPhrases: 0,
      progressStats: 0,
      errors: []
    };

    // Start transaction
    const transaction = db.transaction(() => {
      // If replace mode, clear existing data
      if (importMode === 'replace') {
        db.prepare('DELETE FROM journal_entries').run();
        db.prepare('DELETE FROM vocabulary').run();
        db.prepare('DELETE FROM custom_phrases').run();
        db.prepare('DELETE FROM progress_stats').run();
      }

      // Import journal entries
      if (data.data.journalEntries && Array.isArray(data.data.journalEntries)) {
        const insertEntry = db.prepare(`
          INSERT OR IGNORE INTO journal_entries (english_text, german_text, created_at, word_count, session_duration)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const entry of data.data.journalEntries) {
          try {
            const result = insertEntry.run(
              entry.english_text,
              entry.german_text,
              entry.created_at,
              entry.word_count || 0,
              entry.session_duration || 0
            );
            if (result.changes > 0) stats.journalEntries++;
          } catch (err) {
            stats.errors.push(`Journal entry error: ${err.message}`);
          }
        }
      }

      // Import vocabulary
      if (data.data.vocabulary && Array.isArray(data.data.vocabulary)) {
        const insertVocab = db.prepare(`
          INSERT OR IGNORE INTO vocabulary (word, first_seen, frequency, last_reviewed)
          VALUES (?, ?, ?, ?)
        `);

        for (const word of data.data.vocabulary) {
          try {
            const result = insertVocab.run(
              word.word,
              word.first_seen,
              word.frequency || 1,
              word.last_reviewed
            );
            if (result.changes > 0) stats.vocabulary++;
          } catch (err) {
            stats.errors.push(`Vocabulary error: ${err.message}`);
          }
        }
      }

      // Import custom phrases
      if (data.data.customPhrases && Array.isArray(data.data.customPhrases)) {
        const insertPhrase = db.prepare(`
          INSERT OR IGNORE INTO custom_phrases (english, german, created_at, times_reviewed)
          VALUES (?, ?, ?, ?)
        `);

        for (const phrase of data.data.customPhrases) {
          try {
            const result = insertPhrase.run(
              phrase.english,
              phrase.german,
              phrase.created_at,
              phrase.times_reviewed || 0
            );
            if (result.changes > 0) stats.customPhrases++;
          } catch (err) {
            stats.errors.push(`Phrase error: ${err.message}`);
          }
        }
      }

      // Import progress stats
      if (data.data.progressStats && Array.isArray(data.data.progressStats)) {
        const insertStats = db.prepare(`
          INSERT OR REPLACE INTO progress_stats (date, words_learned, entries_written, minutes_practiced)
          VALUES (?, ?, ?, ?)
        `);

        for (const stat of data.data.progressStats) {
          try {
            const result = insertStats.run(
              stat.date,
              stat.words_learned || 0,
              stat.entries_written || 0,
              stat.minutes_practiced || 0
            );
            if (result.changes > 0) stats.progressStats++;
          } catch (err) {
            stats.errors.push(`Progress stats error: ${err.message}`);
          }
        }
      }

      // Import settings
      if (data.data.settings && typeof data.data.settings === 'object') {
        const existing = db.prepare('SELECT * FROM user_settings LIMIT 1').get();
        
        if (existing) {
          db.prepare(`
            UPDATE user_settings 
            SET daily_goal_minutes = ?, daily_sentence_goal = ?, theme = ?
            WHERE id = ?
          `).run(
            data.data.settings.daily_goal_minutes || 60,
            data.data.settings.daily_sentence_goal || 10,
            data.data.settings.theme || 'light',
            existing.id
          );
        }
      }
    });

    // Execute transaction
    transaction();

    res.json({
      success: true,
      message: 'Data imported successfully',
      stats: {
        imported: {
          journalEntries: stats.journalEntries,
          vocabulary: stats.vocabulary,
          customPhrases: stats.customPhrases,
          progressStats: stats.progressStats
        },
        errors: stats.errors.length > 0 ? stats.errors : undefined
      }
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import data',
      details: error.message
    });
  }
});

/**
 * DELETE /api/data/clear
 * Clear all user data (with confirmation)
 */
router.delete('/clear', (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'DELETE_ALL_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { "confirm": "DELETE_ALL_DATA" }'
      });
    }

    // Clear all tables
    db.prepare('DELETE FROM journal_entries').run();
    db.prepare('DELETE FROM vocabulary').run();
    db.prepare('DELETE FROM custom_phrases').run();
    db.prepare('DELETE FROM progress_stats').run();

    res.json({
      success: true,
      message: 'All data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear data'
    });
  }
});

module.exports = router;