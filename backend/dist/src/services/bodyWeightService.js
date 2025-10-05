import { validateBodyWeight, validateAndFormatDate } from '../utils/validation.js';
export function logBodyWeight(db, params) {
    const { user_id, weight_kg, notes } = params;
    validateBodyWeight(weight_kg);
    const date = validateAndFormatDate(params.date);
    const existingEntry = db.prepare(`
    SELECT id FROM body_weight
    WHERE user_id = ? AND date = ?
  `).get(user_id, date);
    if (existingEntry) {
        const stmt = db.prepare(`
      UPDATE body_weight
      SET weight_kg = ?, notes = ?
      WHERE id = ?
    `);
        stmt.run(weight_kg, notes || null, existingEntry.id);
        const updated = db.prepare(`
      SELECT * FROM body_weight WHERE id = ?
    `).get(existingEntry.id);
        return updated;
    }
    const stmt = db.prepare(`
    INSERT INTO body_weight (user_id, weight_kg, date, notes)
    VALUES (?, ?, ?, ?)
  `);
    const result = stmt.run(user_id, weight_kg, date, notes || null);
    const entry = db.prepare(`
    SELECT * FROM body_weight WHERE id = ?
  `).get(result.lastInsertRowid);
    return entry;
}
export function getBodyWeightHistory(db, user_id, limit = 30) {
    const maxLimit = 365;
    const validLimit = Math.min(Math.max(1, limit), maxLimit);
    const stmt = db.prepare(`
    SELECT * FROM body_weight
    WHERE user_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT ?
  `);
    const entries = stmt.all(user_id, validLimit);
    return entries;
}
export function deleteBodyWeight(db, user_id, id) {
    const stmt = db.prepare(`
    DELETE FROM body_weight
    WHERE id = ? AND user_id = ?
  `);
    const result = stmt.run(id, user_id);
    if (result.changes === 0) {
        throw new Error('Body weight entry not found');
    }
}
export function getLatestBodyWeight(db, user_id) {
    const stmt = db.prepare(`
    SELECT * FROM body_weight
    WHERE user_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT 1
  `);
    const entry = stmt.get(user_id);
    return entry || null;
}
export function getWeightChange(db, user_id, days) {
    const latest = getLatestBodyWeight(db, user_id);
    if (!latest) {
        return null;
    }
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const stmt = db.prepare(`
    SELECT * FROM body_weight
    WHERE user_id = ? AND date <= ?
    ORDER BY date DESC, created_at DESC
    LIMIT 1
  `);
    const previousEntry = stmt.get(user_id, targetDateStr);
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
//# sourceMappingURL=bodyWeightService.js.map