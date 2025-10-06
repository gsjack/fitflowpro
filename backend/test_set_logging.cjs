const axios = require('axios');

const API = 'http://localhost:3000';

async function testWorkoutFlow() {
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API}/api/auth/login`, {
      username: 'asigator@googlemail.com',
      password: 'ccllccll1',
    });

    const token = loginRes.data.token;
    const userId = loginRes.data.userId;
    console.log('✅ Logged in as user', userId);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get recommended program day
    console.log('\n2. Getting recommended workout...');
    const recommendedRes = await axios.get(`${API}/api/program-days/recommended`, { headers });
    const programDayId = recommendedRes.data.id;
    console.log('✅ Recommended:', recommendedRes.data.day_name, '(ID:', programDayId + ')');

    // 3. Create workout
    console.log('\n3. Creating workout...');
    const today = '2025-10-06';
    const workoutRes = await axios.post(`${API}/api/workouts`, {
      program_day_id: programDayId,
      date: today,
    }, { headers });

    const workoutId = workoutRes.data.id;
    console.log('✅ Workout created: ID', workoutId);

    // 4. Get workout details
    console.log('\n4. Getting workout details...');
    const workoutDetailsRes = await axios.get(`${API}/api/workouts/${workoutId}`, { headers });
    const firstExercise = workoutDetailsRes.data.exercises[0];
    console.log('✅ First exercise:', firstExercise.exercise_name, '(ID:', firstExercise.exercise_id + ')');

    // 5. Log a set
    console.log('\n5. Logging set...');
    const setData = {
      workout_id: workoutId,
      exercise_id: firstExercise.exercise_id,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
    };

    console.log('Request data:', JSON.stringify(setData, null, 2));

    const setRes = await axios.post(`${API}/api/sets`, setData, { headers });

    console.log('✅ Set logged: ID', setRes.data.id);
    console.log('Set data:', setRes.data);

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testWorkoutFlow();
