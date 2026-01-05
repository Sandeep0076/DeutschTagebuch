-- Add text search indexes for better search performance
-- Run this in your Supabase SQL Editor

-- Enable the pg_trgm extension FIRST (for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Note: Journal entries table has been removed as the feature was discontinued