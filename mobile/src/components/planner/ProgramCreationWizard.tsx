/**
 * Program Creation Wizard (Agent 4 - Iteration 4 Wave 2)
 *
 * Guided wizard for new users to create their first training program.
 * Addresses User POV Analysis P0-1: Empty planner screen with no guidance.
 *
 * Flow:
 * 1. Welcome screen with program overview
 * 2. Program details preview (6-day Renaissance Periodization split)
 * 3. Confirmation and creation
 *
 * Note: Backend currently only supports creating default 6-day program.
 * Future enhancement: Allow template selection (beginner 3-day, intermediate 4-day, advanced 6-day)
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Portal,
  Dialog,
  Button,
  Text,
  Paragraph,
  Card,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface ProgramCreationWizardProps {
  visible: boolean;
  onDismiss: () => void;
  onProgramCreated: () => void;
  onCreateProgram: () => Promise<void>;
}

/**
 * Program Creation Wizard Component
 *
 * Multi-step wizard to guide new users through program creation.
 * Currently creates default 6-day Renaissance Periodization split.
 */
export default function ProgramCreationWizard({
  visible,
  onDismiss,
  onProgramCreated,
  onCreateProgram,
}: ProgramCreationWizardProps) {
  const [step, setStep] = useState<'welcome' | 'preview' | 'creating' | 'success'>('welcome');
  const [error, setError] = useState<string | null>(null);

  /**
   * Reset wizard state when dismissed
   */
  const handleDismiss = () => {
    setStep('welcome');
    setError(null);
    onDismiss();
  };

  /**
   * Handle program creation
   */
  const handleCreate = async () => {
    setStep('creating');
    setError(null);

    try {
      await onCreateProgram();
      setStep('success');

      // Auto-dismiss after 2 seconds and notify parent
      setTimeout(() => {
        handleDismiss();
        onProgramCreated();
      }, 2000);
    } catch (err) {
      console.error('[ProgramCreationWizard] Error creating program:', err);
      setError(err instanceof Error ? err.message : 'Failed to create program');
      setStep('preview'); // Go back to preview to allow retry
    }
  };

  /**
   * Render welcome step
   */
  const renderWelcome = () => (
    <>
      <Dialog.Title>Welcome to FitFlow Pro</Dialog.Title>
      <Dialog.Content>
        <View style={styles.welcomeIcon}>
          <MaterialCommunityIcons name="dumbbell" size={64} color={colors.primary.main} />
        </View>
        <Paragraph style={styles.paragraph}>
          Let's get you started with a science-based training program!
        </Paragraph>
        <Paragraph style={styles.paragraph}>
          Your program will be based on{' '}
          <Text style={styles.bold}>Renaissance Periodization</Text> methodology by Dr. Mike
          Israetel.
        </Paragraph>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success.main}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Automatic progression through MEV → MAV → MRV</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success.main}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Volume targets based on muscle group landmarks</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success.main}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Smart auto-regulation via recovery tracking</Text>
          </View>
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleDismiss}>Cancel</Button>
        <Button mode="contained" onPress={() => setStep('preview')}>
          Next
        </Button>
      </Dialog.Actions>
    </>
  );

  /**
   * Render program preview step
   */
  const renderPreview = () => (
    <>
      <Dialog.Title>Your Program: 6-Day RP Split</Dialog.Title>
      <Dialog.ScrollArea>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Paragraph style={styles.paragraph}>
            Your program will include 6 training days per week:
          </Paragraph>

          <Card style={styles.previewCard}>
            <Card.Content>
              <View style={styles.dayRow}>
                <Chip icon="arm-flex" style={styles.dayChip}>
                  Monday
                </Chip>
                <Text style={styles.dayName}>Push A (Chest-Focused)</Text>
              </View>
              <Divider style={styles.dayDivider} />

              <View style={styles.dayRow}>
                <Chip icon="arm-flex" style={styles.dayChip}>
                  Tuesday
                </Chip>
                <Text style={styles.dayName}>Pull A (Lat-Focused)</Text>
              </View>
              <Divider style={styles.dayDivider} />

              <View style={styles.dayRow}>
                <Chip icon="run" style={styles.dayChip}>
                  Wednesday
                </Chip>
                <Text style={styles.dayName}>VO2max A (Norwegian 4x4)</Text>
              </View>
              <Divider style={styles.dayDivider} />

              <View style={styles.dayRow}>
                <Chip icon="arm-flex" style={styles.dayChip}>
                  Thursday
                </Chip>
                <Text style={styles.dayName}>Push B (Shoulder-Focused)</Text>
              </View>
              <Divider style={styles.dayDivider} />

              <View style={styles.dayRow}>
                <Chip icon="arm-flex" style={styles.dayChip}>
                  Friday
                </Chip>
                <Text style={styles.dayName}>Pull B (Rhomboid/Trap-Focused)</Text>
              </View>
              <Divider style={styles.dayDivider} />

              <View style={styles.dayRow}>
                <Chip icon="run" style={styles.dayChip}>
                  Saturday
                </Chip>
                <Text style={styles.dayName}>VO2max B (30/30 or Zone 2)</Text>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={colors.primary.main}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Your program starts in <Text style={styles.bold}>MEV phase</Text> (Minimum Effective
              Volume). You'll progress through MAV and MRV phases over 7-8 weeks before a deload
              week.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={colors.error.main}
                style={styles.errorIcon}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Button onPress={() => setStep('welcome')}>Back</Button>
        <Button mode="contained" onPress={handleCreate}>
          Create Program
        </Button>
      </Dialog.Actions>
    </>
  );

  /**
   * Render creating step (loading)
   */
  const renderCreating = () => (
    <>
      <Dialog.Title>Creating Your Program...</Dialog.Title>
      <Dialog.Content>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Setting up your training program</Text>
        </View>
      </Dialog.Content>
    </>
  );

  /**
   * Render success step
   */
  const renderSuccess = () => (
    <>
      <Dialog.Title>Program Created!</Dialog.Title>
      <Dialog.Content>
        <View style={styles.successContainer}>
          <MaterialCommunityIcons name="check-circle" size={80} color={colors.success.main} />
          <Text style={styles.successText}>Your training program is ready to go!</Text>
          <Paragraph style={styles.successSubtext}>
            You'll be redirected to the planner in a moment...
          </Paragraph>
        </View>
      </Dialog.Content>
    </>
  );

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return renderWelcome();
      case 'preview':
        return renderPreview();
      case 'creating':
        return renderCreating();
      case 'success':
        return renderSuccess();
      default:
        return renderWelcome();
    }
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        dismissable={step !== 'creating'}
        style={styles.dialog}
      >
        {renderStep()}
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  welcomeIcon: {
    alignItems: 'center',
    marginVertical: 16,
  },
  paragraph: {
    marginBottom: 12,
    color: colors.text.primary,
  },
  bold: {
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  featureList: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 14,
  },
  previewCard: {
    marginVertical: 16,
    backgroundColor: colors.background.tertiary,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayChip: {
    marginRight: 12,
    minWidth: 100,
  },
  dayName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
  },
  dayDivider: {
    marginVertical: 4,
    backgroundColor: colors.effects.divider,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary.main + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: colors.error.main + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    color: colors.error.main,
    fontSize: 13,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.secondary,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  successSubtext: {
    marginTop: 8,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
