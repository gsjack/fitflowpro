/**
 * Program Templates for FitFlow Pro
 *
 * Science-based program templates following Renaissance Periodization methodology.
 * All templates start in MEV (Minimum Effective Volume) phase.
 *
 * Exercise names MUST match backend database exactly.
 */

/**
 * Program exercise template (before creation)
 */
export interface ProgramExerciseTemplate {
  exercise_name: string; // MUST match backend exercise.name exactly
  sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number;
}

/**
 * Program day template
 */
export interface ProgramDayTemplate {
  day_of_week: number; // 1-7 (Monday-Sunday)
  day_type: 'strength' | 'vo2max';
  name: string; // "Full Body A", "Upper Body", etc.
  exercises: ProgramExerciseTemplate[];
}

/**
 * Program template
 */
export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  days_per_week: number;
  duration_weeks: number;
  program_days: ProgramDayTemplate[];
}

/**
 * Beginner 3-Day Full Body Split
 *
 * Target Audience: 0-1 year training experience
 * Frequency: Monday, Wednesday, Friday
 * Volume: MEV phase starting volumes per muscle group
 * - Chest: 8 sets/week
 * - Back: 10 sets/week
 * - Quads: 8 sets/week
 * - Hamstrings: 6 sets/week
 * - Shoulders: 8 sets/week
 * - Arms: 6 sets/week
 */
export const beginnerFullBodyTemplate: ProgramTemplate = {
  id: 'beginner-3day-fullbody',
  name: 'Beginner 3-Day Full Body',
  description:
    'Perfect for beginners. Train your whole body 3x/week with compound movements. Build strength and muscle with minimal time commitment.',
  experience_level: 'beginner',
  days_per_week: 3,
  duration_weeks: 8,
  program_days: [
    // Monday - Full Body A
    {
      day_of_week: 1,
      day_type: 'strength',
      name: 'Full Body A',
      exercises: [
        {
          exercise_name: 'Barbell Back Squat',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Barbell Bench Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Barbell Row',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Overhead Press',
          sets: 2,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Barbell Curl',
          sets: 2,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Wednesday - Full Body B
    {
      day_of_week: 3,
      day_type: 'strength',
      name: 'Full Body B',
      exercises: [
        {
          exercise_name: 'Romanian Deadlift',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Lat Pulldown',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Incline Dumbbell Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Lateral Raises',
          sets: 2,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Overhead Tricep Extension',
          sets: 2,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Friday - Full Body C
    {
      day_of_week: 5,
      day_type: 'strength',
      name: 'Full Body C',
      exercises: [
        {
          exercise_name: 'Leg Press',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Dumbbell Bench Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Seated Cable Row',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Dumbbell Shoulder Press',
          sets: 2,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Hammer Curl',
          sets: 2,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
  ],
};

/**
 * Intermediate 4-Day Upper/Lower Split
 *
 * Target Audience: 1-3 years training experience
 * Frequency: Monday (Upper), Tuesday (Lower), Thursday (Upper), Friday (Lower)
 * Volume: MEV phase starting volumes per muscle group
 * - Chest: 10 sets/week
 * - Back: 12 sets/week
 * - Quads: 10 sets/week
 * - Hamstrings: 8 sets/week
 * - Shoulders: 10 sets/week
 * - Arms: 8 sets/week
 */
export const intermediateUpperLowerTemplate: ProgramTemplate = {
  id: 'intermediate-4day-upperlower',
  name: 'Intermediate 4-Day Upper/Lower',
  description:
    'For intermediate lifters ready to increase training frequency. Split upper and lower body workouts across 4 days for better recovery and volume distribution.',
  experience_level: 'intermediate',
  days_per_week: 4,
  duration_weeks: 8,
  program_days: [
    // Monday - Upper Body A
    {
      day_of_week: 1,
      day_type: 'strength',
      name: 'Upper Body A',
      exercises: [
        {
          exercise_name: 'Barbell Bench Press',
          sets: 4,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Barbell Row',
          sets: 4,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Overhead Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Lat Pulldown',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Barbell Curl',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Tricep Pushdown',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Tuesday - Lower Body A
    {
      day_of_week: 2,
      day_type: 'strength',
      name: 'Lower Body A',
      exercises: [
        {
          exercise_name: 'Barbell Back Squat',
          sets: 4,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Romanian Deadlift',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Leg Press',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Lying Leg Curl',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Standing Calf Raise',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
      ],
    },
    // Thursday - Upper Body B
    {
      day_of_week: 4,
      day_type: 'strength',
      name: 'Upper Body B',
      exercises: [
        {
          exercise_name: 'Incline Barbell Bench Press',
          sets: 4,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Pull-Ups',
          sets: 3,
          target_reps_min: 6,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Dumbbell Shoulder Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Cable Flyes',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Face Pulls',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Hammer Curl',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Friday - Lower Body B
    {
      day_of_week: 5,
      day_type: 'strength',
      name: 'Lower Body B',
      exercises: [
        {
          exercise_name: 'Front Squat',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Leg Curl',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Bulgarian Split Squat',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Leg Extension',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Seated Calf Raise',
          sets: 3,
          target_reps_min: 15,
          target_reps_max: 20,
          target_rir: 2,
        },
      ],
    },
  ],
};

/**
 * Advanced 6-Day Push/Pull/Legs Split
 *
 * Target Audience: 3+ years training experience
 * Frequency: Monday (Push), Tuesday (Pull), Wednesday (Legs), Thursday (Push), Friday (Pull), Saturday (Legs)
 * Volume: MEV phase starting volumes per muscle group
 * - Chest: 12 sets/week
 * - Back: 14 sets/week
 * - Quads: 12 sets/week
 * - Hamstrings: 10 sets/week
 * - Shoulders: 12 sets/week
 * - Arms: 10 sets/week
 */
export const advancedPushPullLegsTemplate: ProgramTemplate = {
  id: 'advanced-6day-ppl',
  name: 'Advanced 6-Day Push/Pull/Legs',
  description:
    'Maximum training frequency for advanced lifters. Train each muscle group twice per week with high volume and intensity. Requires strong recovery capacity.',
  experience_level: 'advanced',
  days_per_week: 6,
  duration_weeks: 8,
  program_days: [
    // Monday - Push A
    {
      day_of_week: 1,
      day_type: 'strength',
      name: 'Push A',
      exercises: [
        {
          exercise_name: 'Barbell Bench Press',
          sets: 4,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Overhead Press',
          sets: 3,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Incline Dumbbell Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Lateral Raises',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Tricep Pushdown',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Tuesday - Pull A
    {
      day_of_week: 2,
      day_type: 'strength',
      name: 'Pull A',
      exercises: [
        {
          exercise_name: 'Barbell Row',
          sets: 4,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Pull-Ups',
          sets: 3,
          target_reps_min: 6,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Seated Cable Row',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Face Pulls',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Barbell Curl',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Wednesday - Legs A
    {
      day_of_week: 3,
      day_type: 'strength',
      name: 'Legs A',
      exercises: [
        {
          exercise_name: 'Barbell Back Squat',
          sets: 4,
          target_reps_min: 6,
          target_reps_max: 8,
          target_rir: 2,
        },
        {
          exercise_name: 'Romanian Deadlift',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Leg Press',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Lying Leg Curl',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Standing Calf Raise',
          sets: 4,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
      ],
    },
    // Thursday - Push B
    {
      day_of_week: 4,
      day_type: 'strength',
      name: 'Push B',
      exercises: [
        {
          exercise_name: 'Incline Barbell Bench Press',
          sets: 4,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Dumbbell Shoulder Press',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Cable Flyes',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Cable Lateral Raises',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Overhead Tricep Extension',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Friday - Pull B
    {
      day_of_week: 5,
      day_type: 'strength',
      name: 'Pull B',
      exercises: [
        {
          exercise_name: 'T-Bar Row',
          sets: 4,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Lat Pulldown',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Dumbbell Row',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Rear Delt Flyes',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Hammer Curl',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
      ],
    },
    // Saturday - Legs B
    {
      day_of_week: 6,
      day_type: 'strength',
      name: 'Legs B',
      exercises: [
        {
          exercise_name: 'Front Squat',
          sets: 3,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
        },
        {
          exercise_name: 'Lying Leg Curl',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Bulgarian Split Squat',
          sets: 3,
          target_reps_min: 10,
          target_reps_max: 12,
          target_rir: 2,
        },
        {
          exercise_name: 'Leg Extension',
          sets: 3,
          target_reps_min: 12,
          target_reps_max: 15,
          target_rir: 2,
        },
        {
          exercise_name: 'Seated Calf Raise',
          sets: 4,
          target_reps_min: 15,
          target_reps_max: 20,
          target_rir: 2,
        },
      ],
    },
  ],
};

/**
 * All available program templates
 */
export const programTemplates: ProgramTemplate[] = [
  beginnerFullBodyTemplate,
  intermediateUpperLowerTemplate,
  advancedPushPullLegsTemplate,
];

/**
 * Get program template by experience level
 */
export function getTemplateByExperience(
  level: 'beginner' | 'intermediate' | 'advanced'
): ProgramTemplate {
  const template = programTemplates.find((t) => t.experience_level === level);
  if (!template) {
    throw new Error(`No template found for experience level: ${level}`);
  }
  return template;
}
