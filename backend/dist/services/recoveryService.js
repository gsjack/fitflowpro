import { stmtCreateRecoveryAssessment, calculateVolumeAdjustment, db } from '../database/db.js';
export function createAssessment(userId, date, sleepQuality, muscleSoreness, mentalMotivation) {
    if (sleepQuality < 1 || sleepQuality > 5) {
        throw new Error('Sleep quality must be between 1 and 5');
    }
    if (muscleSoreness < 1 || muscleSoreness > 5) {
        throw new Error('Muscle soreness must be between 1 and 5');
    }
    if (mentalMotivation < 1 || mentalMotivation > 5) {
        throw new Error('Mental motivation must be between 1 and 5');
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        throw new Error('Date must be in ISO format (YYYY-MM-DD)');
    }
    const totalScore = sleepQuality + muscleSoreness + mentalMotivation;
    const volumeAdjustment = calculateVolumeAdjustment(totalScore);
    const existing = db
        .prepare('SELECT id FROM recovery_assessments WHERE user_id = ? AND date = ?')
        .get(userId, date);
    const timestamp = Date.now();
    if (existing) {
        db.prepare(`
      UPDATE recovery_assessments
      SET sleep_quality = ?,
          muscle_soreness = ?,
          mental_motivation = ?,
          total_score = ?,
          volume_adjustment = ?,
          timestamp = ?
      WHERE id = ?
    `).run(sleepQuality, muscleSoreness, mentalMotivation, totalScore, volumeAdjustment, timestamp, existing.id);
        console.log(`Recovery assessment updated: id=${existing.id}, user=${userId}, date=${date}`);
    }
    else {
        stmtCreateRecoveryAssessment.run(userId, date, sleepQuality, muscleSoreness, mentalMotivation, totalScore, volumeAdjustment, timestamp);
        console.log(`Recovery assessment created: user=${userId}, date=${date}`);
    }
    console.log(`Recovery assessment created: user=${userId}, date=${date}, ` +
        `score=${totalScore} (sleep=${sleepQuality}, soreness=${muscleSoreness}, ` +
        `motivation=${mentalMotivation}), adjustment=${volumeAdjustment}`);
    return {
        total_score: totalScore,
        volume_adjustment: volumeAdjustment,
    };
}
//# sourceMappingURL=recoveryService.js.map