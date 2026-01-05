-- Remove the Journal Writing task from daily tasks
-- Run this in your Supabase SQL Editor

-- Delete the journal writing task
DELETE FROM daily_tasks 
WHERE LOWER(name) LIKE '%journal%' 
   OR LOWER(name) LIKE '%writing%';

-- Also clean up any progress records for this task
DELETE FROM daily_task_progress 
WHERE task_id NOT IN (SELECT id FROM daily_tasks);

-- Verify remaining tasks
SELECT id, name, duration_minutes, display_order 
FROM daily_tasks 
ORDER BY display_order;