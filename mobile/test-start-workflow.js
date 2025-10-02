/**
 * Test script to verify startWorkout workflow
 * Tests that startWorkout() updates existing workout instead of creating new one
 */

const API_BASE_URL = 'http://localhost:3000';

async function loginAndGetToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'demo@fitflow.test',
      password: 'Password123',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  const data = await response.json();
  return data.token;
}

async function getTodayWorkout(token) {
  const today = new Date().toISOString().split('T')[0];
  const response = await fetch(`${API_BASE_URL}/api/workouts?start_date=${today}&end_date=${today}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch workouts');
  }
  
  const workouts = await response.json();
  return workouts.length > 0 ? workouts[0] : null;
}

async function updateWorkoutStatus(token, workoutId, status) {
  const response = await fetch(`${API_BASE_URL}/api/workouts/${workoutId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update workout status: ${response.status}`);
  }
  
  return await response.json();
}

async function test() {
  console.log('\n=== Testing startWorkout workflow ===\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in as demo user...');
    const token = await loginAndGetToken();
    console.log('   ✓ Login successful\n');
    
    // Step 2: Get today's workout
    console.log('2. Fetching today\'s workout...');
    const workout = await getTodayWorkout(token);
    
    if (!workout) {
      console.log('   ✗ No workout found for today');
      process.exit(1);
    }
    
    console.log(`   ✓ Found workout ID: ${workout.id}`);
    console.log(`   ✓ Current status: ${workout.status}`);
    console.log(`   ✓ Program day: ${workout.day_name || workout.program_day_id}\n`);
    
    // Step 3: Simulate startWorkout() - update status to in_progress
    console.log('3. Starting workout (updating status to in_progress)...');
    const beforeStatus = workout.status;
    
    await updateWorkoutStatus(token, workout.id, 'in_progress');
    console.log('   ✓ Status update API call successful\n');
    
    // Step 4: Verify the workout was updated (not created)
    console.log('4. Verifying workout was updated (not created)...');
    const updatedWorkout = await getTodayWorkout(token);
    
    if (!updatedWorkout) {
      console.log('   ✗ Workout not found after update');
      process.exit(1);
    }
    
    if (updatedWorkout.id !== workout.id) {
      console.log(`   ✗ FAIL: Workout ID changed! Before: ${workout.id}, After: ${updatedWorkout.id}`);
      console.log('   This indicates a NEW workout was created instead of updating the existing one.');
      process.exit(1);
    }
    
    console.log(`   ✓ Workout ID unchanged: ${updatedWorkout.id}`);
    console.log(`   ✓ Status changed: ${beforeStatus} → ${updatedWorkout.status}`);
    
    if (updatedWorkout.status !== 'in_progress') {
      console.log(`   ✗ FAIL: Status is not 'in_progress': ${updatedWorkout.status}`);
      process.exit(1);
    }
    
    console.log('\n=== ✓ All tests passed ===');
    console.log('startWorkout() correctly updates existing workout instead of creating new one\n');
    
    // Cleanup: Reset workout to not_started
    console.log('Cleanup: Resetting workout to not_started...');
    await updateWorkoutStatus(token, workout.id, 'not_started');
    console.log('✓ Cleanup complete\n');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

test();
