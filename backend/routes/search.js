const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

/**
 * Helper function to extract sentences containing a search term
 * @param {string} text - The full text to search in
 * @param {string} searchTerm - The term to search for
 * @returns {Array} Array of sentences containing the search term
 */
function extractSentencesWithTerm(text, searchTerm) {
  if (!text || !searchTerm) return [];
  
  // Split text into sentences (handles ., !, ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const searchLower = searchTerm.toLowerCase();
  const matchingSentences = [];
  
  sentences.forEach(sentence => {
    const sentenceTrimmed = sentence.trim();
    if (sentenceTrimmed.toLowerCase().includes(searchLower)) {
      matchingSentences.push(sentenceTrimmed);
    }
  });
  
  return matchingSentences;
}

/**
 * GET /api/search
 * Unified search across vocabulary and journal entries
 * Returns vocabulary words and sentences from journals containing the search term
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchTerm = q.trim();

    // Search vocabulary
    const { data: vocabResults, error: vocabError } = await supabase
      .from('vocabulary')
      .select('*')
      .or(`word.ilike.%${searchTerm}%,meaning.ilike.%${searchTerm}%`)
      .order('frequency', { ascending: false })
      .limit(50);

    if (vocabError) throw vocabError;

    // Search journal entries
    const { data: journalResults, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .or(`english_text.ilike.%${searchTerm}%,german_text.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (journalError) throw journalError;

    // Extract sentences from journal entries
    const journalSentences = [];
    
    if (journalResults && journalResults.length > 0) {
      journalResults.forEach(entry => {
        // Extract from German text
        const germanSentences = extractSentencesWithTerm(entry.german_text, searchTerm);
        germanSentences.forEach(sentence => {
          journalSentences.push({
            id: entry.id,
            sentence,
            language: 'german',
            date: entry.created_at,
            entry_id: entry.id
          });
        });

        // Extract from English text
        const englishSentences = extractSentencesWithTerm(entry.english_text, searchTerm);
        englishSentences.forEach(sentence => {
          journalSentences.push({
            id: `${entry.id}-en`,
            sentence,
            language: 'english',
            date: entry.created_at,
            entry_id: entry.id
          });
        });
      });
    }

    res.json({
      success: true,
      data: {
        vocabulary: vocabResults || [],
        journal_sentences: journalSentences,
        counts: {
          vocabulary: vocabResults ? vocabResults.length : 0,
          journal_sentences: journalSentences.length
        }
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
});

module.exports = router;