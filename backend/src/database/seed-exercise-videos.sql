-- Seed exercise video links
-- Purpose: Add YouTube demonstration videos for top 20 exercises
-- Created: 2025-10-04
-- Sources: AthleanX, Jeff Nippard, Renaissance Periodization channels

-- UPPER BODY EXERCISES

-- Chest
UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
WHERE name = 'Barbell Bench Press';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=BYKScL2sgCs'
WHERE name = 'Dumbbell Bench Press';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=SrqOu55lrYU'
WHERE name = 'Incline Dumbbell Press';

-- Shoulders
UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=2yjwXTZQDDI'
WHERE name = 'Overhead Press (Barbell)';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=3ml7BH7mNwQ'
WHERE name = 'Dumbbell Lateral Raise';

-- Back
UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ'
WHERE name = 'Barbell Row';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
WHERE name = 'Pull-ups';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=lueEJGjTuPQ'
WHERE name = 'Dumbbell Row';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=CAwf7n6Luuc'
WHERE name = 'Lat Pulldown';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=eIq5CB9JfKE'
WHERE name = 'Face Pull (Cable)';

-- Arms
UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=kwG2ipFRgfo'
WHERE name = 'Barbell Curl';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=6SS6K3lAwZ8'
WHERE name = 'Cable Tricep Extension';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=oJYrMwGaKOU'
WHERE name = 'Dips';

-- LOWER BODY EXERCISES

-- Quads/Glutes/Hamstrings
UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=ultWZbUMPL8'
WHERE name = 'Barbell Back Squat';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=r4MzxtBKyNE'
WHERE name = 'Barbell Deadlift';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=XX3bww4Plas'
WHERE name = 'Romanian Deadlift';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'
WHERE name = 'Leg Press';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=YyvSfVjQeL0'
WHERE name = 'Leg Extension';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=1Tq3QdYUuHs'
WHERE name = 'Lying Leg Curl';

-- CORE EXERCISES

-- Abs
UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=ASdvN_XEl_c'
WHERE name = 'Plank';

UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=3nT_1yVdOjg'
WHERE name = 'Cable Crunch';
