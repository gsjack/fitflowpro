import Database from 'better-sqlite3';

export interface BodyWeightEntry {
  id: number;
  user_id: number;
  weight_kg: number;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  notes?: string;
  created_at: number;
}

export interface LogBodyWeightParams {
  user_id: number;
  weight_kg: number;
  date?: string; // Optional, defaults to today
  notes?: string;
}

const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;

/**
 * Validates weight is within physiological range
 */
function validateWeight(weight_kg: number): void {
  if (weight_kg < MIN_WEIGHT_KG || weight_kg > MAX_WEIGHT_KG) {
    throw new Error(`Weight must be between ${MIN_WEIGHT_KG}kg and ${MAX_WEIGHT_KG}kg`);
  }
}

/**
 * Validates and formats date to ISO 8601 (YYYY-MM-DD)
 * Returns undefined if no date provided (will be handled by default value in SQL)
 */
function validateAndFormatDate(date: string | undefined): string {
  if (date === undefined || date === '') {
    // Default to today
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];
    return formatted;
  }

  // Validate ISO 8601 date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Date must be in ISO 8601 format (YYYY-MM-DD)');
  }

  // Validate date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate > today) {
    throw new Error('Date cannot be in the future');
  }

  return date;
}

/**
 * Log body weight entry
 */
export function logBodyWeight(
  db: Database.Database,
  params: LogBodyWeightParams
): BodyWeightEntry {
  const { user_id, weight_kg, notes } = params;

  // Validate weight
  validateWeight(weight_kg);

  // Validate and format date
  const date = validateAndFormatDate(params.date);

  // Check if entry already exists for this date
  const existingEntry = db.prepare(`
    SELECT id FROM body_weight
    WHERE user_id = ? AND date = ?
  `).get(user_id, date) as { id: number } | undefined;

  if (existingEntry) {
    // Update existing entry
    const stmt = db.prepare(`
      UPDATE body_weight
      SET weight_kg = ?, notes = ?
      WHERE id = ?
    `);
    stmt.run(weight_kg, notes || null, existingEntry.id);

    const updated = db.prepare(`
      SELECT * FROM body_weight WHERE id = ?
    `).get(existingEntry.id) as BodyWeightEntry;

    return updated;
  }

  // Insert new entry
  const stmt = db.prepare(`
    INSERT INTO body_weight (user_id, weight_kg, date, notes)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(user_id, weight_kg, date, notes || null);

  const entry = db.prepare(`
    SELECT * FROM body_weight WHERE id = ?
  `).get(result.lastInsertRowid) as BodyWeightEntry;

  return entry;
}

/**
 * Get body weight history for a user
 */
export function getBodyWeightHistory(
  db: Database.Database,
  user_id: number,
  limit: number = 30
): BodyWeightEntry[] {
  // Validate limit
  const maxLimit = 365;
  const validLimit = Math.min(Math.max(1, limit), maxLimit);

  const stmt = db.prepare(`
    SELECT * FROM body_weight
    WHERE user_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT ?
  `);

  const entries = stmt.all(user_id, validLimit) as BodyWeightEntry[];

  return entries;
}

/**
 * Delete body weight entry
 */
export function deleteBodyWeight(
  db: Database.Database,
  user_id: number,
  id: number
): void {
  const stmt = db.prepare(`
    DELETE FROM body_weight
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(id, user_id);

  if (result.changes === 0) {
    throw new Error('Body weight entry not found');
  }
}

/**
 * Get latest body weight entry
 */
export function getLatestBodyWeight(
  db: Database.Database,
  user_id: number
): BodyWeightEntry | null {
  const stmt = db.prepare(`
    SELECT * FROM body_weight
    WHERE user_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT 1
  `);

  const entry = stmt.get(user_id) as BodyWeightEntry | undefined;

  return entry || null;
}

/**
 * Get weight change over a period
 * Returns { weight_change_kg, percentage_change }
 */
export function getWeightChange(
  db: Database.Database,
  user_id: number,
  days: number
): { weight_change_kg: number; percentage_change: number } | null {
  const latest = getLatestBodyWeight(db, user_id);
  if (!latest) {
    return null;
  }

  // Get weight from N days ago
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT * FROM body_weight
    WHERE user_id = ? AND date <= ?
    ORDER BY date DESC, created_at DESC
    LIMIT 1
  `);

  const previousEntry = stmt.get(user_id, targetDateStr) as BodyWeightEntry | undefined;

  if (!previousEntry) {
    return null;
  }

  const weight_change_kg = latest.weight_kg - previousEntry.weight_kg;
  const percentage_change = (weight_change_kg / previousEntry.weight_kg) * 100;

  return {
    weight_change_kg: Number(weight_change_kg.toFixed(2)),
    percentage_change: Number(percentage_change.toFixed(2))
  };
}
