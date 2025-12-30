-- Migration: Add meaning and example fields to custom_phrases table
-- Run this in Supabase SQL Editor

-- Add new columns to custom_phrases table
ALTER TABLE custom_phrases 
ADD COLUMN IF NOT EXISTS meaning TEXT,
ADD COLUMN IF NOT EXISTS example_english TEXT,
ADD COLUMN IF NOT EXISTS example_german TEXT,
ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES phrase_categories(id) ON DELETE SET NULL;

-- Create phrase_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS phrase_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for phrase_categories
ALTER TABLE phrase_categories DISABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_custom_phrases_category ON custom_phrases(category_id);

-- Update existing phrases with default values
UPDATE custom_phrases 
SET 
  meaning = english,
  example_english = CONCAT('For example: ', english),
  example_german = CONCAT('Zum Beispiel: ', german)
WHERE meaning IS NULL;

COMMENT ON COLUMN custom_phrases.meaning IS 'English meaning/translation of the phrase';
COMMENT ON COLUMN custom_phrases.example_english IS 'Example sentence in English';
COMMENT ON COLUMN custom_phrases.example_german IS 'Example sentence in German';
COMMENT ON COLUMN custom_phrases.category_id IS 'Optional category for organizing phrases';