/**
 * Motivational Fitness Quotes
 *
 * Collection of 100+ quotes for daily motivation on the dashboard.
 * Quote selection is deterministic based on date (same quote all day).
 */

export const QUOTES = [
  // Training mindset
  "The weight doesn't know how tired you are.",
  'Progressive overload is the only path to growth.',
  'Consistency beats intensity over time.',
  'Train today for the body you want tomorrow.',
  'No workout is wasted if you learned something.',

  // Recovery and rest
  'Rest days build muscle, not gym days.',
  'Sleep is the best performance enhancer.',
  'Recovered muscles are strong muscles.',
  'Listen to your body, not just your program.',
  'Deload weeks prevent injury, not weakness.',

  // Progressive overload
  'Add one rep, add one pound, add one set.',
  'Small progress is still progress.',
  'The bar gets heavier when you stop showing up.',
  'Track your lifts or repeat them forever.',
  'Your future self is watching your effort today.',

  // Mental strength
  'The last rep is where growth happens.',
  "Discipline is doing it when you don't feel like it.",
  'Your mind will quit before your body does.',
  "Excuses don't build muscle.",
  'The hardest part is showing up.',

  // Renaissance Periodization wisdom
  'Volume drives growth, but recovery permits it.',
  'MEV to MAV is where the magic happens.',
  'RIR teaches you to push without injury.',
  "Hypertrophy doesn't care about ego lifts.",
  'Autoregulation is listening to science and your body.',

  // Long-term thinking
  'Years of training beat months of motivation.',
  'Build the habit before chasing the result.',
  "You're building a body for decades, not weeks.",
  'The best program is the one you stick to.',
  'Patience in training, persistence in life.',

  // Cardio and VO2max
  'Your heart is a muscle too.',
  'VO2max today, endurance for life.',
  "Cardio doesn't kill gains, recovery does.",
  'Zone 2 builds the engine, intervals build the power.',
  'Strong lungs carry you through every set.',

  // Form and technique
  'Perfect reps build perfect muscle.',
  "Control the weight, don't let it control you.",
  'Slow eccentrics, explosive concentrics.',
  'Range of motion matters more than weight.',
  'Form first, weight second, ego never.',

  // Nutrition and recovery
  'Protein feeds muscle, carbs fuel performance.',
  "You can't out-train a bad diet.",
  'Hydration is the forgotten performance hack.',
  'Eat to recover, not just to satisfy.',
  'Calories build, protein repairs.',

  // Motivation for tough days
  "Today's soreness is tomorrow's strength.",
  "Show up even when you don't feel like it.",
  'Bad workouts still beat no workouts.',
  "The gym doesn't care how you feel.",
  'Start light, finish strong.',

  // Progress tracking
  'What gets measured gets improved.',
  "Numbers don't lie, feelings do.",
  'Log your sets or guess your progress.',
  'Data reveals what motivation hides.',
  'Track today to celebrate tomorrow.',

  // Workout-specific
  'Squat deep or stay weak.',
  'Pull-ups never get easier, you just get stronger.',
  'Deadlifts build character and glutes.',
  'Overhead press: the truth serum of upper body strength.',
  'Leg day: the day that tests your commitment.',

  // Renaissance Periodization principles
  'MEV is your baseline, MAV is your goal.',
  'MRV is a warning, not a challenge.',
  'Deload weeks are investments, not setbacks.',
  'Volume landmarks guide, not dictate.',
  'Fatigue masks fitness, recovery reveals it.',

  // Mindset shifts
  'Training is practice, not punishment.',
  'Soreness means adaptation is happening.',
  "Strength isn't built in comfort zones.",
  'Your body adapts to consistent stress.',
  'Genetics load the gun, training pulls the trigger.',

  // Time and consistency
  "Six months from now, you'll wish you started today.",
  "Missing one workout won't hurt, missing 10 will.",
  'The best time to train was yesterday, the next best is now.',
  'Consistency compounds like interest.',
  "Show up, even if it's just 80% effort.",

  // Scientific approach
  'Evidence-based training beats bro science.',
  'RIR is your honesty check.',
  'Volume, intensity, frequency: pick two, recover from three.',
  "Your muscles don't know exercises, they know tension.",
  'Proximity to failure drives adaptation.',

  // Competition with self
  "Your only competition is yesterday's version of you.",
  "Beat last week's numbers, not someone else's.",
  'Progress is personal, comparison is poison.',
  'Chase your PRs, not perfection.',
  'Every session is a chance to improve.',

  // Injury prevention
  'Pain is a signal, not a challenge.',
  'Warm-ups prevent injuries, cool-downs aid recovery.',
  'Your joints are your future, protect them.',
  'Listen to tightness before it becomes pain.',
  'Mobility work now saves surgery later.',

  // Program adherence
  'Follow the program, even when it feels easy.',
  'Deviating from the plan is planning to deviate.',
  'Trust the process, doubt the shortcuts.',
  'Your program knows more than your feelings.',
  'Stick to the plan on good days and bad.',

  // Hypertrophy focus
  'Time under tension builds size.',
  'Mind-muscle connection > heavy weight.',
  'Pump is temporary, growth is permanent.',
  'Stretch under load for maximum gains.',
  'Volume drives hypertrophy, recovery allows it.',

  // Mental resilience
  'The set starts when it gets hard.',
  'Comfort is the enemy of progress.',
  'Your mind is the weakest muscle, train it.',
  "Embrace the burn, it's growth signaling.",
  'Tough workouts build tough people.',

  // Recovery science
  'Recovery is when adaptation happens.',
  'Sleep 8 hours or train 6 months for nothing.',
  'Active recovery beats couch recovery.',
  'Stretching is maintenance, not optional.',
  'Your CNS needs rest more than your muscles.',

  // Nutrition timing
  'Pre-workout fuels performance, post-workout fuels recovery.',
  'Protein timing matters less than total intake.',
  'Carbs around training, fats away from it.',
  'Hydrate before you feel thirsty.',
  "Eat for tomorrow's workout, not yesterday's.",

  // Long-term perspective
  '10 years of training beats 10 months of intensity.',
  'Build muscle slowly, lose fat steadily.',
  'Your body is a long-term project.',
  'Patience in training, results in years.',
  'The tortoise wins the muscle-building race.',

  // Intensity and effort
  'RIR 0-2 is where hypertrophy lives.',
  'Leave reps in reserve, but not too many.',
  'Train hard, recover harder.',
  'Effort today, results tomorrow.',
  'Push yourself, but know your limits.',

  // Habit formation
  'Make training non-negotiable.',
  'Habits beat motivation every time.',
  'Build the system, results follow.',
  'Consistency is boring but effective.',
  "Show up, even when you don't want to.",
];

/**
 * Get quote of the day (deterministic based on date)
 * Same quote for the entire day across all sessions
 */
export function getQuoteOfTheDay(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Simple hash from date string
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Map hash to quote index
  const index = Math.abs(hash) % QUOTES.length;
  return QUOTES[index];
}
