const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * GET /api/progress/stats
 * Get overall progress statistics
 */
router.get('/stats', (req, res) => {
  try {
    // Total vocabulary
    const vocabCount = db.prepare('SELECT COUNT(*) as count FROM vocabulary').get();

    // Total journal entries
    const entriesCount = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get();

    // Total words written
    const totalWords = db.prepare('SELECT SUM(word_count) as total FROM journal_entries').get();

    // Total practice time
    const totalTime = db.prepare('SELECT SUM(minutes_practiced) as total FROM progress_stats').get();

    // Words learned this week
    const thisWeekWords = db.prepare(`
      SELECT COUNT(*) as count 
      FROM vocabulary 
      WHERE first_seen >= date('now', '-7 days')
    `).get();

    // Entries this week
    const thisWeekEntries = db.prepare(`
      SELECT COUNT(*) as count 
      FROM journal_entries 
      WHERE created_at >= datetime('now', '-7 days')
    `).get();

    res.json({
      success: true,
      data: {
        vocabulary: {
          total: vocabCount.count,
          thisWeek: thisWeekWords.count
        },
        entries: {
          total: entriesCount.count,
          thisWeek: thisWeekEntries.count
        },
        words: {
          total: totalWords.total || 0
        },
        time: {
          total: totalTime.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress statistics'
    });
  }
});

/**
 * GET /api/progress/streak
 * Calculate current learning streak
 */
router.get('/streak', (req, res) => {
  try {
    // Get all dates with entries, ordered by date descending
    const dates = db.prepare(`
      SELECT DISTINCT date(created_at) as date 
      FROM journal_entries 
      ORDER BY date DESC
    `).all();

    if (dates.length === 0) {
      return res.json({
        success: true,
        data: {
          current: 0,
          longest: 0,
          lastEntry: null
        }
      });
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's an entry today or yesterday
    const lastEntryDate = new Date(dates[0].date);
    lastEntryDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastEntryDate) / (1000 * 60 * 60 * 24));

    // If last entry was today or yesterday, start counting streak
    if (daysDiff <= 1) {
      currentStreak = 1;
      tempStreak = 1;

      // Count consecutive days backwards
      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i - 1].date);
        const prevDate = new Date(dates[i].date);
        currentDate.setHours(0, 0, 0, 0);
        prevDate.setHours(0, 0, 0, 0);

        const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diff === 1) {
          currentStreak++;
          tempStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i - 1].date);
      const prevDate = new Date(dates[i].date);
      currentDate.setHours(0, 0, 0, 0);
      prevDate.setHours(0, 0, 0, 0);

      const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak, 1);

    res.json({
      success: true,
      data: {
        current: currentStreak,
        longest: longestStreak,
        lastEntry: dates[0].date
      }
    });
  } catch (error) {
    console.error('Error calculating streak:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate streak'
    });
  }
});

/**
 * GET /api/progress/history
 * Get daily progress history
 */
router.get('/history', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const history = db.prepare(`
      SELECT 
        date,
        words_learned,
        entries_written,
        minutes_practiced
      FROM progress_stats
      WHERE date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `).all(days);

    // Fill in missing dates with zeros
    const result = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const existing = history.find(h => h.date === dateStr);
      
      result.push({
        date: dateStr,
        words_learned: existing ? existing.words_learned : 0,
        entries_written: existing ? existing.entries_written : 0,
        minutes_practiced: existing ? existing.minutes_practiced : 0
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching progress history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress history'
    });
  }
});

/**
 * GET /api/progress/chart-data
 * Get formatted data for Chart.js
 */
router.get('/chart-data', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const history = db.prepare(`
      SELECT 
        date,
        words_learned,
        entries_written,
        minutes_practiced
      FROM progress_stats
      WHERE date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `).all(days);

    // Create labels and data arrays
    const labels = [];
    const wordsData = [];
    const entriesData = [];
    const minutesData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Format label (e.g., "Mon", "Tue")
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels.push(dayNames[date.getDay()]);

      const existing = history.find(h => h.date === dateStr);
      wordsData.push(existing ? existing.words_learned : 0);
      entriesData.push(existing ? existing.entries_written : 0);
      minutesData.push(existing ? existing.minutes_practiced : 0);
    }

    res.json({
      success: true,
      data: {
        labels,
        datasets: {
          words: wordsData,
          entries: entriesData,
          minutes: minutesData
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

module.exports = router;