import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'
import { translateToGerman, translateToEnglish } from '../services/translation.js'

const router = new Hono()

// Built-in common phrases with meanings and examples
const BUILT_IN_PHRASES = [
  {
    category: "Phrases",
    phrase: "Meiner Meinung nach...",
    meaning: "In my opinion...",
    example_german: "Meiner Meinung nach ist das eine sehr gute Idee.",
    example_english: "In my opinion, that is a very good idea.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Das kommt darauf an.",
    meaning: "That depends.",
    example_german: "Gehen wir heute spazieren? Das kommt auf das Wetter an.",
    example_english: "Are we going for a walk today? That depends on the weather.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Ich hätte gern...",
    meaning: "I would like to have...",
    example_german: "Ich hätte gern ein Glas Wasser, bitte.",
    example_english: "I would like to have a glass of water, please.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Ehrlich gesagt...",
    meaning: "To be honest...",
    example_german: "Ehrlich gesagt habe ich heute keine Lust auf Kino.",
    example_english: "To be honest, I don't feel like going to the cinema today.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Keine Ahnung!",
    meaning: "No idea!",
    example_german: "Weißt du, wo mein Handy ist? Keine Ahnung!",
    example_english: "Do you know where my phone is? No idea!",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Das macht nichts.",
    meaning: "It doesn't matter / No problem.",
    example_german: "Entschuldigung für die Verspätung! Das macht nichts.",
    example_english: "Sorry for the delay! It doesn't matter.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Wie bitte?",
    meaning: "Pardon? / What did you say?",
    example_german: "Wie bitte? Könnten Sie das noch einmal wiederholen?",
    example_english: "Pardon? Could you repeat that once more?",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Schönen Feierabend!",
    meaning: "Have a nice evening (after work)!",
    example_german: "Ich gehe jetzt nach Hause. Schönen Feierabend!",
    example_english: "I'm going home now. Have a nice evening!",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Vielen Dank im Voraus.",
    meaning: "Many thanks in advance.",
    example_german: "Könnten Sie mir die Informationen schicken? Vielen Dank im Voraus.",
    example_english: "Could you send me the information? Many thanks in advance.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Es tut mir leid, dass...",
    meaning: "I am sorry that...",
    example_german: "Es tut mir leid, dass ich dich so lange warten ließ.",
    example_english: "I am sorry that I kept you waiting for so long.",
    builtin: true
  }
];

/**
 * GET /api/phrases
 * Get all phrases (built-in + custom) with optional category filtering
 */
router.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const category_id = c.req.query('category_id');

    let query = supabase
      .from('custom_phrases')
      .select('id, english, german, meaning, example_english, example_german, created_at, times_reviewed, category_id');

    // Add category filter
    if (category_id && category_id !== 'all') {
      query = query.eq('category_id', category_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data: customPhrases, error } = await query;

    if (error) throw error;

    const customWithFlag = (customPhrases || []).map(p => ({
      ...p,
      phrase: p.german,
      builtin: false
    }));
    const allPhrases = [...BUILT_IN_PHRASES, ...customWithFlag];

    return c.json({
      success: true,
      data: allPhrases,
      count: {
        total: allPhrases.length,
        builtin: BUILT_IN_PHRASES.length,
        custom: customWithFlag.length
      }
    });
  } catch (error) {
    console.error('Error fetching phrases:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch phrases'
    }, 500);
  }
});

/**
 * GET /api/phrases/categories
 * Get all phrase categories
 */
router.get('/categories', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: categories, error } = await supabase
      .from('phrase_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return c.json({
      success: true,
      data: categories || []
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch categories'
    }, 500);
  }
});

/**
 * POST /api/phrases/categories
 * Add a new phrase category
 */
router.post('/categories', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { name } = await c.req.json();
    if (!name || name.trim().length === 0) {
      return c.json({ success: false, error: 'Category name is required' }, 400);
    }

    const { data: category, error } = await supabase
      .from('phrase_categories')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint
        return c.json({ success: false, error: 'Category already exists' }, 409);
      }
      throw error;
    }

    return c.json({
      success: true,
      data: category
    }, 201);
  } catch (error) {
    console.error('Error adding category:', error);
    return c.json({
      success: false,
      error: 'Failed to add category'
    }, 500);
  }
});

/**
 * DELETE /api/phrases/categories/:id
 * Delete a phrase category (sets phrases' category_id to NULL)
 */
router.delete('/categories/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id');

    // First, set category_id to NULL for all phrases in this category
    await supabase
      .from('custom_phrases')
      .update({ category_id: null })
      .eq('category_id', id);

    // Then delete the category
    const { error } = await supabase
      .from('phrase_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({
      success: false,
      error: 'Failed to delete category'
    }, 500);
  }
});

/**
 * POST /api/phrases
 * Add a custom phrase with auto-translation and example generation
 */
router.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { english, german, category_id } = await c.req.json();

    if (!english) {
      return c.json({
        success: false,
        error: 'English phrase is required'
      }, 400);
    }

    const cleanEnglish = english.trim();

    if (cleanEnglish.length === 0) {
      return c.json({
        success: false,
        error: 'English phrase cannot be empty'
      }, 400);
    }

    // Auto-translate to German if not provided
    let cleanGerman = german ? german.trim() : '';
    let meaning = cleanEnglish;
    let exampleEnglish = `For example: ${cleanEnglish}`;
    let exampleGerman = '';

    if (!cleanGerman) {
      try {
        cleanGerman = await translateToGerman(cleanEnglish, c.env);
      } catch (error) {
        console.error('Translation error:', error);
        return c.json({
          success: false,
          error: 'Failed to translate phrase. Please provide German translation manually.'
        }, 500);
      }
    }

    // Generate example sentences
    try {
      exampleGerman = await translateToGerman(exampleEnglish, c.env);
    } catch (error) {
      console.warn('Failed to generate German example:', error);
      exampleGerman = cleanGerman;
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('custom_phrases')
      .select('*')
      .or(`english.ilike.${cleanEnglish},german.ilike.${cleanGerman}`)
      .single();

    if (existing) {
      return c.json({
        success: false,
        error: 'This phrase already exists',
        data: existing
      }, 409);
    }

    const { data: newPhrase, error } = await supabase
      .from('custom_phrases')
      .insert({
        english: cleanEnglish,
        german: cleanGerman,
        meaning: meaning,
        example_english: exampleEnglish,
        example_german: exampleGerman,
        times_reviewed: 0,
        category_id: category_id || null
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      data: {
        ...newPhrase,
        phrase: newPhrase.german,
        builtin: false
      }
    }, 201);
  } catch (error) {
    console.error('Error adding custom phrase:', error);
    return c.json({
      success: false,
      error: 'Failed to add custom phrase'
    }, 500);
  }
});

/**
 * GET /api/phrases/:id
 * Get a specific phrase by ID
 */
router.get('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id');

    const { data: phrase, error } = await supabase
      .from('custom_phrases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Phrase not found'
        }, 404);
      }
      throw error;
    }

    return c.json({
      success: true,
      data: {
        ...phrase,
        phrase: phrase.german,
        builtin: false
      }
    });
  } catch (error) {
    console.error('Error fetching phrase:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch phrase'
    }, 500);
  }
});

/**
 * PUT /api/phrases/:id
 * Edit an existing custom phrase
 */
router.put('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id');
    const { english, german, meaning, example_english, example_german, category_id } = await c.req.json();

    if (!english || !german) {
      return c.json({
        success: false,
        error: 'Both English and German text are required'
      }, 400);
    }

    const cleanEnglish = english.trim();
    const cleanGerman = german.trim();

    if (cleanEnglish.length === 0 || cleanGerman.length === 0) {
      return c.json({
        success: false,
        error: 'English and German text cannot be empty'
      }, 400);
    }

    // Check if phrase exists
    const { data: existing, error: fetchError } = await supabase
      .from('custom_phrases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Custom phrase not found'
        }, 404);
      }
      throw fetchError;
    }

    // Check for duplicates (excluding current phrase)
    const { data: duplicate } = await supabase
      .from('custom_phrases')
      .select('*')
      .neq('id', id)
      .or(`english.ilike.${cleanEnglish},german.ilike.${cleanGerman}`)
      .single();

    if (duplicate) {
      return c.json({
        success: false,
        error: 'A phrase with this text already exists',
        data: duplicate
      }, 409);
    }

    // Update the phrase
    const { data: updatedPhrase, error } = await supabase
      .from('custom_phrases')
      .update({
        english: cleanEnglish,
        german: cleanGerman,
        meaning: meaning || cleanEnglish,
        example_english: example_english || `For example: ${cleanEnglish}`,
        example_german: example_german || cleanGerman,
        category_id: category_id || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      data: {
        ...updatedPhrase,
        phrase: updatedPhrase.german,
        builtin: false
      }
    });
  } catch (error) {
    console.error('Error updating custom phrase:', error);
    return c.json({
      success: false,
      error: 'Failed to update custom phrase'
    }, 500);
  }
});

/**
 * DELETE /api/phrases/:id
 * Delete a custom phrase
 */
router.delete('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id');
    const { error } = await supabase
      .from('custom_phrases')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Custom phrase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom phrase:', error);
    return c.json({
      success: false,
      error: 'Failed to delete custom phrase'
    }, 500);
  }
});

/**
 * PUT /api/phrases/:id/review
 * Increment review count for a phrase
 */
router.put('/:id/review', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { data: phrase, error: fetchError } = await supabase
      .from('custom_phrases')
      .select('times_reviewed')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Custom phrase not found'
        }, 404);
      }
      throw fetchError;
    }

    const { error } = await supabase
      .from('custom_phrases')
      .update({ times_reviewed: (phrase.times_reviewed || 0) + 1 })
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Phrase review count updated'
    });
  } catch (error) {
    console.error('Error updating phrase review count:', error);
    return c.json({
      success: false,
      error: 'Failed to update phrase'
    }, 500);
  }
});

export default router