const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

/**
 * GET /api/notes
 * Get all notes with optional sorting
 */
router.get('/', async (req, res) => {
    try {
        const { sort = 'newest' } = req.query;

        // Build query
        let query = supabase.from('notes').select('*');

        // Apply sorting
        if (sort === 'az') {
            query = query.order('title', { ascending: true });
        } else if (sort === 'za') {
            query = query.order('title', { ascending: false });
        } else if (sort === 'oldest') {
            query = query.order('created_at', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data: notes, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: notes || [],
            count: notes ? notes.length : 0
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notes'
        });
    }
});

/**
 * GET /api/notes/:id
 * Get a specific note by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Note not found'
                });
            }
            throw error;
        }

        res.json({
            success: true,
            data: note
        });
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch note'
        });
    }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: 'Both title and content are required'
            });
        }

        const { data: newNote, error } = await supabase
            .from('notes')
            .insert({
                title: title.trim(),
                content: content.trim()
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data: newNote
        });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create note'
        });
    }
});

/**
 * PUT /api/notes/:id
 * Update an existing note
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: 'Both title and content are required'
            });
        }

        const { data: updatedNote, error } = await supabase
            .from('notes')
            .update({
                title: title.trim(),
                content: content.trim()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Note not found'
                });
            }
            throw error;
        }

        res.json({
            success: true,
            data: updatedNote
        });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update note'
        });
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete note'
        });
    }
});

module.exports = router;
