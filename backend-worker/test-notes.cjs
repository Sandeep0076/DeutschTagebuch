const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotesTable() {
    console.log('🧪 Testing notes table...');
    
    try {
        // Test 1: Check if we can query the notes table
        console.log('1. Testing SELECT query...');
        const { data: existingNotes, error: selectError } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (selectError) {
            console.error('❌ SELECT Error:', selectError);
            return;
        }
        
        console.log('✅ SELECT successful. Found', existingNotes.length, 'existing notes');
        if (existingNotes.length > 0) {
            console.log('📝 Latest notes:');
            existingNotes.slice(0, 3).forEach(note => {
                console.log(`  - ${note.title} (created: ${note.created_at})`);
            });
        }
        
        // Test 2: Try to insert a test note
        console.log('2. Testing INSERT query...');
        const testNote = {
            title: 'Test Note - ' + new Date().toISOString(),
            content: 'This is a test note to verify the database connection is working.'
        };
        
        const { data: newNote, error: insertError } = await supabase
            .from('notes')
            .insert(testNote)
            .select()
            .single();
            
        if (insertError) {
            console.error('❌ INSERT Error:', insertError);
            return;
        }
        
        console.log('✅ INSERT successful. Created note with ID:', newNote.id);
        
        // Test 3: Verify the note was saved
        console.log('3. Verifying note was saved...');
        const { data: verifyNote, error: verifyError } = await supabase
            .from('notes')
            .select('*')
            .eq('id', newNote.id)
            .single();
            
        if (verifyError) {
            console.error('❌ VERIFY Error:', verifyError);
            return;
        }
        
        console.log('✅ VERIFY successful. Note details:');
        console.log(`  ID: ${verifyNote.id}`);
        console.log(`  Title: ${verifyNote.title}`);
        console.log(`  Content: ${verifyNote.content}`);
        console.log(`  Created: ${verifyNote.created_at}`);
        
        // Test 4: Clean up - delete the test note
        console.log('4. Cleaning up test note...');
        const { error: deleteError } = await supabase
            .from('notes')
            .delete()
            .eq('id', newNote.id);
            
        if (deleteError) {
            console.error('⚠️  DELETE Error (test note may remain):', deleteError);
        } else {
            console.log('✅ Test note deleted successfully');
        }
        
        console.log('🎉 All tests passed! Notes functionality should work properly.');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

testNotesTable();
