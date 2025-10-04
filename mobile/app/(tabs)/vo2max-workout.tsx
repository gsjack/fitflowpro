/**
 * VO2maxWorkoutScreen (T097-T099)
 *
 * Screen for conducting VO2max cardio workouts using Norwegian 4x4 protocol.
 * Features:
 * - Pre-workout instructions with protocol details
 * - Heart rate zone calculation based on user age
 * - Norwegian4x4Timer integration with real-time HR zone display
 * - Post-workout summary with API session creation
 * - Navigation to analytics/history
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  Portal,
  Dialog,
  Paragraph,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import Norwegian4x4Timer from '../../src/components/Norwegian4x4Timer';
import { useCreateVO2maxSession } from '../../src/services/api/vo2maxApi';
import { getUserId, User } from '../../src/services/api/authApi';
import { getAuthenticatedClient } from '../../src/services/api/authApi';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/typography';
import GradientCard from '../../src/components/common/GradientCard';

interface HeartRateZone {
  min: number;
  max: number;
}

interface WorkoutPhaseZones {
  work: HeartRateZone;
  recovery: HeartRateZone;
}

/**
 * Calculate maximum heart rate using age-based formula
 * Formula: 220 - age
 */
function calculateMaxHeartRate(age: number): number {
  return 220 - age;
}

/**
 * Calculate heart rate zones for Norwegian 4x4 protocol
 * Work zone: 85-95% max HR
 * Recovery zone: 60-70% max HR
 */
function calculateHeartRateZones(age: number): WorkoutPhaseZones {
  const maxHR = calculateMaxHeartRate(age);

  return {
    work: {
      min: Math.round(maxHR * 0.85),
      max: Math.round(maxHR * 0.95),
    },
    recovery: {
      min: Math.round(maxHR * 0.6),
      max: Math.round(maxHR * 0.7),
    },
  };
}

export default function VO2maxWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [timerStarted, setTimerStarted] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [hrZones, setHrZones] = useState<WorkoutPhaseZones | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const createMutation = useCreateVO2maxSession();

  // Fetch user data to get age for HR zone calculation
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingUser(true);
        const userId = await getUserId();

        if (!userId) {
          console.error('[VO2maxWorkoutScreen] No user ID found');
          setLoadingUser(false);
          return;
        }

        const client = await getAuthenticatedClient();
        const response = await client.get<User>('/api/users/me');
        const user = response.data;

        if (user.age) {
          setUserAge(user.age);
          const zones = calculateHeartRateZones(user.age);
          setHrZones(zones);
          console.log('[VO2maxWorkoutScreen] HR zones calculated:', {
            age: user.age,
            maxHR: calculateMaxHeartRate(user.age),
            zones,
          });
        } else {
          // Default to age 30 if not set
          console.warn('[VO2maxWorkoutScreen] User age not set, defaulting to 30');
          setUserAge(30);
          const zones = calculateHeartRateZones(30);
          setHrZones(zones);
        }
      } catch (error) {
        console.error('[VO2maxWorkoutScreen] Error fetching user data:', error);
        // Fallback to age 30
        setUserAge(30);
        const zones = calculateHeartRateZones(30);
        setHrZones(zones);
      } finally {
        setLoadingUser(false);
      }
    };

    void fetchUserData();
  }, []);

  const handleStartWorkout = () => {
    setTimerStarted(true);
  };

  const handleComplete = async (data: {
    duration_minutes: number;
    intervals_completed: number;
    average_heart_rate?: number;
    peak_heart_rate?: number;
  }) => {
    try {
      console.log('[VO2maxWorkoutScreen] Timer completed, creating session:', data);

      // Create VO2max session via API
      const session = await createMutation.mutateAsync({
        date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: data.duration_minutes,
        protocol_type: 'norwegian_4x4',
        intervals_completed: data.intervals_completed,
        average_heart_rate: data.average_heart_rate,
        peak_heart_rate: data.peak_heart_rate,
      });

      console.log('[VO2maxWorkoutScreen] Session created:', session);

      // Store session data for summary
      setSessionData({
        ...data,
        session_id: session.session_id,
        estimated_vo2max: session.estimated_vo2max,
        completion_status: session.completion_status,
      });

      // Show summary modal
      setShowSummary(true);
    } catch (error) {
      console.error('[VO2maxWorkoutScreen] Error creating session:', error);
      // Still show summary even if API fails (user can retry later)
      setSessionData(data);
      setShowSummary(true);
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    router.back();
  };

  const handleViewDetails = () => {
    setShowSummary(false);
    if (sessionData?.session_id) {
      // Navigate to analytics/history with session details
      router.push({ pathname: '/(tabs)/analytics', params: { sessionId: sessionData.session_id }});
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleDone = () => {
    setShowSummary(false);
    router.replace('/(tabs)');
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Preparing your workout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!timerStarted) {
    // Instructions view
    const maxHR = userAge ? calculateMaxHeartRate(userAge) : 190;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          accessibilityRole="scrollbar"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineLarge" style={styles.title}>
              Norwegian 4x4 Protocol
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              High-Intensity Interval Training for VO2max Development
            </Text>
          </View>

          {/* Protocol Instructions */}
          <GradientCard
            gradient={[colors.primary.dark, colors.background.secondary]}
            style={styles.instructionCard}
          >
            <Text variant="titleLarge" style={styles.cardTitle}>
              Workout Protocol
            </Text>

            <View style={styles.instructionSection}>
              <Text variant="bodyLarge" style={styles.instructionText}>
                🔄 <Text style={styles.boldText}>4 intervals</Text> of:
              </Text>
              <Text variant="bodyMedium" style={styles.instructionDetail}>
                • 4 minutes work + 3 minutes recovery
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.instructionSection}>
              <Text variant="bodyLarge" style={styles.instructionText}>
                💪 <Text style={styles.boldText}>Work Phase</Text> (4 min):
              </Text>
              <Text variant="bodyMedium" style={styles.instructionDetail}>
                • Push hard at 85-95% max HR
              </Text>
              <Text variant="bodyMedium" style={styles.instructionDetail}>
                • Maintain high intensity throughout
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.instructionSection}>
              <Text variant="bodyLarge" style={styles.instructionText}>
                😌 <Text style={styles.boldText}>Recovery Phase</Text> (3 min):
              </Text>
              <Text variant="bodyMedium" style={styles.instructionDetail}>
                • Active recovery at 60-70% max HR
              </Text>
              <Text variant="bodyMedium" style={styles.instructionDetail}>
                • Keep moving, don't stop completely
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.instructionSection}>
              <Text variant="bodyLarge" style={styles.instructionText}>
                ⏱️ <Text style={styles.boldText}>Total Duration</Text>:
              </Text>
              <Text variant="bodyMedium" style={styles.instructionDetail}>
                • 28 minutes (4 intervals × 7 minutes)
              </Text>
            </View>
          </GradientCard>

          {/* Heart Rate Zones */}
          {hrZones && (
            <GradientCard
              gradient={[colors.error.dark, colors.background.secondary]}
              style={styles.zoneCard}
            >
              <Text variant="titleLarge" style={styles.cardTitle}>
                Your Heart Rate Zones
              </Text>

              <View style={styles.zoneRow}>
                <View style={styles.zoneInfo}>
                  <Text variant="labelSmall" style={styles.zoneLabel}>
                    YOUR AGE
                  </Text>
                  <Text variant="headlineSmall" style={styles.zoneValue}>
                    {userAge} years
                  </Text>
                </View>
                <View style={styles.zoneInfo}>
                  <Text variant="labelSmall" style={styles.zoneLabel}>
                    MAX HR
                  </Text>
                  <Text variant="headlineSmall" style={styles.zoneValue}>
                    {maxHR} bpm
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.zoneDetail}>
                <Chip
                  mode="flat"
                  style={styles.workChip}
                  textStyle={styles.chipText}
                  icon="trending-up"
                >
                  WORK ZONE
                </Chip>
                <Text variant="headlineMedium" style={styles.zoneRange}>
                  {hrZones.work.min}-{hrZones.work.max} bpm
                </Text>
                <Text variant="bodySmall" style={styles.zoneDescription}>
                  85-95% max HR · Push hard
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.zoneDetail}>
                <Chip
                  mode="flat"
                  style={styles.recoveryChip}
                  textStyle={styles.chipText}
                  icon="trending-down"
                >
                  RECOVERY ZONE
                </Chip>
                <Text variant="headlineMedium" style={styles.zoneRange}>
                  {hrZones.recovery.min}-{hrZones.recovery.max} bpm
                </Text>
                <Text variant="bodySmall" style={styles.zoneDescription}>
                  60-70% max HR · Active recovery
                </Text>
              </View>
            </GradientCard>
          )}

          {/* Safety Tips */}
          <View style={styles.tipsCard}>
            <Text variant="titleMedium" style={styles.tipsTitle}>
              Safety Tips
            </Text>
            <Text variant="bodyMedium" style={styles.tipText}>
              ✓ Warm up for 5-10 minutes before starting
            </Text>
            <Text variant="bodyMedium" style={styles.tipText}>
              ✓ Use a heart rate monitor for accuracy
            </Text>
            <Text variant="bodyMedium" style={styles.tipText}>
              ✓ Stay hydrated throughout the workout
            </Text>
            <Text variant="bodyMedium" style={styles.tipText}>
              ✓ Stop if you feel dizzy or unwell
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.cancelButton}
              textColor={colors.text.secondary}
              contentStyle={styles.buttonContent}
              accessibilityLabel="Cancel and go back"
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleStartWorkout}
              style={styles.startButton}
              buttonColor={colors.primary.main}
              contentStyle={styles.buttonContent}
              icon="play"
              accessibilityLabel="Start VO2max workout"
            >
              Start Workout
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Timer view
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.timerContainer}>
        {/* Heart Rate Zone Display */}
        {hrZones && (
          <View style={styles.zoneDisplayContainer}>
            <Text variant="labelMedium" style={styles.zoneDisplayLabel}>
              TARGET HEART RATE
            </Text>
            <View style={styles.zoneDisplayRow}>
              <View style={styles.zoneDisplayItem}>
                <Text variant="labelSmall" style={styles.zoneDisplaySubLabel}>
                  Work Phase
                </Text>
                <Text variant="headlineSmall" style={styles.zoneDisplayValue}>
                  {hrZones.work.min}-{hrZones.work.max} bpm
                </Text>
              </View>
              <View style={styles.zoneDivider} />
              <View style={styles.zoneDisplayItem}>
                <Text variant="labelSmall" style={styles.zoneDisplaySubLabel}>
                  Recovery Phase
                </Text>
                <Text variant="headlineSmall" style={styles.zoneDisplayValue}>
                  {hrZones.recovery.min}-{hrZones.recovery.max} bpm
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Norwegian 4x4 Timer */}
        <Norwegian4x4Timer onComplete={handleComplete} onCancel={handleCancel} />
      </View>

      {/* Cancel Confirmation Dialog */}
      <Portal>
        <Dialog visible={showCancelDialog} onDismiss={() => setShowCancelDialog(false)}>
          <Dialog.Title>Cancel Workout?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to cancel this VO2max session? Your progress will not be saved.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)}>Keep Going</Button>
            <Button onPress={confirmCancel} textColor={colors.error.main}>
              Cancel Workout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Session Summary Dialog */}
      <Portal>
        <Dialog visible={showSummary} onDismiss={handleDone} style={styles.summaryDialog}>
          <Dialog.Title style={styles.summaryTitle}>Workout Complete! 🎉</Dialog.Title>
          <Dialog.Content>
            {sessionData && (
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text variant="labelMedium" style={styles.summaryLabel}>
                    Duration
                  </Text>
                  <Text variant="titleLarge" style={styles.summaryValue}>
                    {sessionData.duration_minutes} min
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text variant="labelMedium" style={styles.summaryLabel}>
                    Intervals Completed
                  </Text>
                  <Text variant="titleLarge" style={styles.summaryValue}>
                    {sessionData.intervals_completed}/4
                  </Text>
                </View>

                {sessionData.average_heart_rate && (
                  <View style={styles.summaryRow}>
                    <Text variant="labelMedium" style={styles.summaryLabel}>
                      Average HR
                    </Text>
                    <Text variant="titleLarge" style={styles.summaryValue}>
                      {sessionData.average_heart_rate} bpm
                    </Text>
                  </View>
                )}

                {sessionData.peak_heart_rate && (
                  <View style={styles.summaryRow}>
                    <Text variant="labelMedium" style={styles.summaryLabel}>
                      Peak HR
                    </Text>
                    <Text variant="titleLarge" style={styles.summaryValue}>
                      {sessionData.peak_heart_rate} bpm
                    </Text>
                  </View>
                )}

                {sessionData.estimated_vo2max && (
                  <View style={[styles.summaryRow, styles.vo2maxRow]}>
                    <Text variant="labelMedium" style={styles.summaryLabel}>
                      Estimated VO2max
                    </Text>
                    <Text variant="displaySmall" style={styles.vo2maxValue}>
                      {sessionData.estimated_vo2max.toFixed(1)}
                    </Text>
                    <Text variant="bodySmall" style={styles.vo2maxUnit}>
                      ml/kg/min
                    </Text>
                  </View>
                )}

                {sessionData.completion_status === 'incomplete' && (
                  <View style={styles.incompleteWarning}>
                    <Text variant="bodySmall" style={styles.incompleteText}>
                      Session marked as incomplete (less than 4 intervals)
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.summaryActions}>
            <Button onPress={handleDone} mode="outlined" style={styles.summaryButton}>
              Done
            </Button>
            {sessionData?.session_id && (
              <Button
                onPress={handleViewDetails}
                mode="contained"
                buttonColor={colors.primary.main}
                style={styles.summaryButton}
              >
                View Details
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },

  // Header
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
  },

  // Instruction Card
  instructionCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  instructionSection: {
    marginBottom: spacing.sm,
  },
  instructionText: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  boldText: {
    fontWeight: '700',
  },
  instructionDetail: {
    color: colors.text.secondary,
    marginLeft: spacing.lg,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.effects.divider,
    marginVertical: spacing.md,
  },

  // Zone Card
  zoneCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  zoneInfo: {
    alignItems: 'center',
  },
  zoneLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  zoneValue: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  zoneDetail: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  workChip: {
    backgroundColor: colors.error.main + '30',
    marginBottom: spacing.sm,
  },
  recoveryChip: {
    backgroundColor: colors.success.main + '30',
    marginBottom: spacing.sm,
  },
  chipText: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  zoneRange: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  zoneDescription: {
    color: colors.text.secondary,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  tipsTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  tipText: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderColor: colors.text.tertiary,
  },
  startButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 56,
  },

  // Timer Container
  timerContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  zoneDisplayContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  zoneDisplayLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  zoneDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  zoneDisplayItem: {
    flex: 1,
    alignItems: 'center',
  },
  zoneDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.effects.divider,
    marginHorizontal: spacing.md,
  },
  zoneDisplaySubLabel: {
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  zoneDisplayValue: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 18,
  },

  // Summary Dialog
  summaryDialog: {
    backgroundColor: colors.background.secondary,
  },
  summaryTitle: {
    textAlign: 'center',
    fontSize: 24,
    color: colors.text.primary,
  },
  summaryContent: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
  },
  summaryLabel: {
    color: colors.text.secondary,
  },
  summaryValue: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  vo2maxRow: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary.dark + '20',
    borderRadius: borderRadius.md,
    borderBottomWidth: 0,
    marginTop: spacing.md,
  },
  vo2maxValue: {
    color: colors.primary.main,
    fontWeight: '700',
    fontSize: 48,
  },
  vo2maxUnit: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  incompleteWarning: {
    backgroundColor: colors.warning.main + '20',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning.main,
  },
  incompleteText: {
    color: colors.warning.dark,
    textAlign: 'center',
  },
  summaryActions: {
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  summaryButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
