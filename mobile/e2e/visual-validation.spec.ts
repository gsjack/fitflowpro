/**
 * Visual Validation Test with Screenshots and Console Logs
 *
 * Captures visual evidence that the app works correctly:
 * - Screenshots at each major step
 * - Console logs for debugging
 * - Network activity monitoring
 */

import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:8081';
const BACKEND_URL = 'http://localhost:3000';

test.describe('Visual Validation - Screenshots & Logs', () => {
  test('Complete user journey with visual evidence', async ({ page }) => {
    const consoleLogs: string[] = [];
    const networkRequests: { url: string; method: string; status: number }[] = [];

    // Capture console logs
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture network activity
    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
      });
    });

    // Step 1: Navigate to app
    console.log('📸 Step 1: Launching app...');
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/visual/01-app-launch.png', fullPage: true });
    console.log('✅ Screenshot saved: 01-app-launch.png');

    // Step 2: Check page title
    const title = await page.title();
    expect(title).toBe('mobile');
    console.log(`✅ Page title: ${title}`);

    // Step 3: Verify content loaded
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    console.log(`✅ Page content length: ${bodyText?.length} characters`);

    // Step 4: Take screenshot of initial state
    await page.screenshot({ path: 'test-results/visual/02-initial-state.png', fullPage: true });
    console.log('✅ Screenshot saved: 02-initial-state.png');

    // Step 5: Backend health check
    console.log('\n📸 Step 5: Checking backend health...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    expect(healthResponse.ok).toBeTruthy();
    const health = await healthResponse.json();
    console.log('✅ Backend health:', health);

    // Step 6: Register a user
    console.log('\n📸 Step 6: Registering user...');
    const username = `visual-test-${Date.now()}@fitflow.test`;
    const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'TestPassword123!',
        age: 28,
        weight_kg: 80,
        experience_level: 'intermediate',
      }),
    });

    expect(registerResponse.ok).toBeTruthy();
    const { token, user_id } = await registerResponse.json();
    console.log(`✅ User registered: ID=${user_id}`);
    console.log(`✅ Token received: ${token.substring(0, 30)}...`);

    // Step 7: Create workout
    console.log('\n📸 Step 7: Creating workout...');
    const workoutResponse = await fetch(`${BACKEND_URL}/api/workouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        program_day_id: 1,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
      }),
    });

    expect(workoutResponse.ok).toBeTruthy();
    const workout = await workoutResponse.json();
    console.log(`✅ Workout created: ID=${workout.id}`);

    // Step 8: Log a set
    console.log('\n📸 Step 8: Logging exercise set...');
    const setResponse = await fetch(`${BACKEND_URL}/api/sets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workout_id: workout.id,
        exercise_id: 1,
        set_number: 1,
        weight_kg: 100,
        reps: 8,
        rir: 2,
        timestamp: Date.now(),
      }),
    });

    expect(setResponse.ok).toBeTruthy();
    const set = await setResponse.json();
    console.log(`✅ Set logged: ID=${set.id}`);
    console.log(`✅ Estimated 1RM: ${set.estimated_1rm}kg`);
    expect(set.estimated_1rm).toBeCloseTo(120, 0);

    // Step 9: Submit recovery assessment
    console.log('\n📸 Step 9: Submitting recovery assessment...');
    const recoveryResponse = await fetch(`${BACKEND_URL}/api/recovery-assessments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        sleep_quality: 4,
        muscle_soreness: 3,
        mental_motivation: 4,
      }),
    });

    expect(recoveryResponse.ok).toBeTruthy();
    const recovery = await recoveryResponse.json();
    console.log(`✅ Recovery score: ${recovery.total_score}`);
    console.log(`✅ Volume adjustment: ${recovery.volume_adjustment}`);

    // Step 10: Complete workout
    console.log('\n📸 Step 10: Completing workout...');
    const completeResponse = await fetch(`${BACKEND_URL}/api/workouts/${workout.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'completed' }),
    });

    expect(completeResponse.ok).toBeTruthy();
    console.log('✅ Workout completed');

    // Step 11: Final screenshot
    await page.screenshot({ path: 'test-results/visual/03-final-state.png', fullPage: true });
    console.log('✅ Screenshot saved: 03-final-state.png');

    // Step 12: Print summary
    console.log('\n' + '='.repeat(60));
    console.log('VISUAL VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n📊 Console Logs Captured: ${consoleLogs.length}`);
    console.log(`📊 Network Requests: ${networkRequests.length}`);
    console.log(`📊 Screenshots: 3`);

    console.log('\n🌐 Network Activity:');
    const backendRequests = networkRequests.filter((r) => r.url.includes('localhost:3000'));
    backendRequests.slice(0, 10).forEach((req) => {
      console.log(`  ${req.method} ${req.url.replace(BACKEND_URL, '')} → ${req.status}`);
    });

    console.log('\n📝 Console Logs (last 10):');
    consoleLogs.slice(-10).forEach((log) => {
      console.log(`  ${log}`);
    });

    console.log('\n✅ ALL VISUAL VALIDATION CHECKS PASSED!\n');
    console.log('Screenshots available in:');
    console.log('  - test-results/visual/01-app-launch.png');
    console.log('  - test-results/visual/02-initial-state.png');
    console.log('  - test-results/visual/03-final-state.png');
    console.log('='.repeat(60));
  });
});
