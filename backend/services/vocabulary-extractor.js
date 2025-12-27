const db = require('../database');

// Common German stop words to filter out
const STOP_WORDS = new Set([
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'und', 'aber', 'oder', 
  'denn', 'ist', 'bin', 'sind', 'war', 'waren', 'das', 'der', 'die', 
  'den', 'dem', 'des', 'eine', 'ein', 'einer', 'eines', 'einem', 'einen',
  'zu', 'in', 'im', 'auf', 'mit', 'von', 'für', 'an', 'bei', 'nach',
  'aus', 'um', 'über', 'unter', 'durch', 'vor', 'hinter', 'neben',
  'zwischen', 'nicht', 'auch', 'nur', 'noch', 'schon', 'sehr', 'so',
  'wie', 'was', 'wer', 'wo', 'wann', 'warum', 'haben', 'hat', 'hatte',
  'hatten', 'sein', 'wird', 'werden', 'wurde', 'wurden', 'kann', 'könnte',
  'muss', 'soll', 'will', 'mag', 'darf', 'möchte', 'würde', 'sollte'
]);

/**
 * Extract vocabulary from German text
 * @param {string} germanText - The German text to extract words from
 * @returns {Array} Array of new words added
 */
function extractVocabulary(germanText) {
  if (!germanText || typeof germanText !== 'string') {
    return [];
  }

  // Remove punctuation and split into words
  const rawWords = germanText
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()„""‚''»«›‹?]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  const newWords = [];
  const today = new Date().toISOString();

  // Process each word
  for (const word of rawWords) {
    const cleanWord = word.trim();
    const lowerWord = cleanWord.toLowerCase();

    // Skip if too short or is a stop word
    if (cleanWord.length <= 3 || STOP_WORDS.has(lowerWord)) {
      continue;
    }

    try {
      // Check if word already exists
      const existing = db.prepare('SELECT id, frequency FROM vocabulary WHERE LOWER(word) = LOWER(?)').get(cleanWord);

      if (existing) {
        // Update frequency and last_reviewed
        db.prepare(`
          UPDATE vocabulary 
          SET frequency = frequency + 1, last_reviewed = ? 
          WHERE id = ?
        `).run(today, existing.id);
      } else {
        // Insert new word
        const result = db.prepare(`
          INSERT INTO vocabulary (word, first_seen, frequency, last_reviewed)
          VALUES (?, ?, 1, ?)
        `).run(cleanWord, today, today);

        newWords.push({
          id: result.lastInsertRowid,
          word: cleanWord,
          first_seen: today
        });
      }
    } catch (error) {
      console.error(`Error processing word "${cleanWord}":`, error.message);
    }
  }

  return newWords;
}

/**
 * Get vocabulary statistics
 * @returns {Object} Statistics about vocabulary
 */
function getVocabularyStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM vocabulary').get();
  
  const thisWeek = db.prepare(`
    SELECT COUNT(*) as count 
    FROM vocabulary 
    WHERE first_seen >= date('now', '-7 days')
  `).get();

  const thisMonth = db.prepare(`
    SELECT COUNT(*) as count 
    FROM vocabulary 
    WHERE first_seen >= date('now', '-30 days')
  `).get();

  const avgPerWeek = db.prepare(`
    SELECT 
      CAST(COUNT(*) AS FLOAT) / 
      CAST(MAX(1, (julianday('now') - julianday(MIN(first_seen))) / 7) AS FLOAT) as avg
    FROM vocabulary
  `).get();

  return {
    total: total.count,
    thisWeek: thisWeek.count,
    thisMonth: thisMonth.count,
    averagePerWeek: Math.round(avgPerWeek.avg || 0)
  };
}

module.exports = {
  extractVocabulary,
  getVocabularyStats
};