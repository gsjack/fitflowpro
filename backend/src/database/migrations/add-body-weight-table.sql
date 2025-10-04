-- Migration: Add body_weight table for tracking user weight over time
-- Created: 2025-10-04

CREATE TABLE IF NOT EXISTS body_weight (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  date TEXT NOT NULL, -- ISO 8601 date (YYYY-MM-DD)
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_body_weight_user_date ON body_weight(user_id, date DESC);
