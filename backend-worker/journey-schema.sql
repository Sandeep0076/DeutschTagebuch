-- 30-Day Journey Map System - Database Schema
-- Run this script in Supabase SQL Editor after supabase-schema.sql

-- Journey Progress Table
-- Tracks the user's overall journey state and current position
CREATE TABLE IF NOT EXISTS journey_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT DEFAULT 1, -- Single user for now, expandable later
  journey_start_date DATE NOT NULL,
  current_day INTEGER DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 30),
  completed_days INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- Array of completed day numbers
  last_activity_date DATE,
  journey_completed_count INTEGER DEFAULT 0, -- How many 30-day journeys completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Activities Table
-- Detailed tracking of each day's learning activities
CREATE TABLE IF NOT EXISTS daily_activities (
  id BIGSERIAL PRIMARY KEY,
  activity_date DATE NOT NULL UNIQUE,
  minutes_practiced INTEGER DEFAULT 0,
  journal_entries_count INTEGER DEFAULT 0,
  vocabulary_added_count INTEGER DEFAULT 0,
  day_completed BOOLEAN DEFAULT FALSE,
  journey_day_number INTEGER, -- Which day of the 30-day journey (1-30)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements Table
-- Stores unlocked achievements and milestones
CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  achievement_key TEXT UNIQUE NOT NULL, -- e.g., 'day_7_milestone', 'first_journey_complete'
  title TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT, -- Emoji or icon identifier
  unlocked_at TIMESTAMP WITH TIME ZONE,
  journey_day INTEGER, -- Which day it was unlocked on (1-30)
  category TEXT DEFAULT 'milestone', -- 'milestone', 'streak', 'special'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journey Landmarks Table
-- Defines the themed landmarks/islands on the journey map
CREATE TABLE IF NOT EXISTS journey_landmarks (
  id BIGSERIAL PRIMARY KEY,
  landmark_key TEXT UNIQUE NOT NULL, -- e.g., 'grammar_fort', 'vocab_island'
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT,
  day_number INTEGER NOT NULL, -- Which day this landmark appears on
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON daily_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_landmarks_day ON journey_landmarks(day_number);
CREATE INDEX IF NOT EXISTS idx_journey_progress_user ON journey_progress(user_id);

-- Seed initial landmarks data (5 themed landmarks)
INSERT INTO journey_landmarks (landmark_key, name, description, icon_emoji, day_number, unlocked)
VALUES 
  ('east_blue_harbor', 'East Blue Harbor', 'Starting point of your journey', '🏴‍☠️', 1, FALSE),
  ('grammar_fort', 'Grammar Fort', 'Master the grammar fundamentals', '⚓', 7, FALSE),
  ('vocab_island', 'Vocab Island', 'Discover vocabulary treasures', '🏝️', 14, FALSE),
  ('quiz_bridge', 'Quiz Bridge', 'Test your skills in the challenge zone', '⚔️', 21, FALSE),
  ('treasure_island', 'Treasure Island', 'Complete your journey and claim your rewards', '💎', 30, FALSE)
ON CONFLICT (landmark_key) DO NOTHING;

-- Seed predefined achievement definitions
INSERT INTO achievements (achievement_key, title, description, icon_emoji, category)
VALUES
  ('day_7_milestone', 'Week Warrior', 'Completed 7 days of learning!', '⚓', 'milestone'),
  ('day_14_milestone', 'Vocab Collector', 'Reached the halfway point!', '🏝️', 'milestone'),
  ('day_21_milestone', 'Three Weeks Strong', '21 days of dedication!', '⚔️', 'milestone'),
  ('day_30_milestone', 'Journey Complete', 'Conquered the 30-day challenge!', '💎', 'milestone'),
  ('first_journey_complete', 'First Voyage', 'Completed your first 30-day journey!', '🏆', 'special'),
  ('speed_runner', 'Speed Runner', 'Completed 7 days in 7 consecutive calendar days', '⚡', 'special'),
  ('dedicated_pirate', 'Dedicated Pirate', 'Practiced 50+ minutes in a single day', '🔥', 'special'),
  ('word_hoarder', 'Word Hoarder', 'Added 20+ vocabulary words in one day', '📚', 'special'),
  ('story_teller', 'Story Teller', 'Wrote a journal entry with 100+ words', '✍️', 'special')
ON CONFLICT (achievement_key) DO NOTHING;

-- Initialize journey progress for the default user
INSERT INTO journey_progress (user_id, journey_start_date, current_day, completed_days)
VALUES (1, CURRENT_DATE, 1, ARRAY[]::INTEGER[])
ON CONFLICT DO NOTHING;

-- Disable Row Level Security for now (consistent with existing schema)
ALTER TABLE journey_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE journey_landmarks DISABLE ROW LEVEL SECURITY;