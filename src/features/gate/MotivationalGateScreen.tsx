import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { QuoteFilterCategory } from '../../types/index';
import { Icon, BloomingFlowerIllustration } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { triggerHapticImpact, triggerHapticSelection } from '../../utils/haptics';

const QUOTE_CATEGORIES: QuoteFilterCategory[] = [
  'All',
  'Stoic Focus',
  'Discipline',
  'Resilience',
  'Leadership',
  'Peak Energy',
  'Mental Toughness',
];

const STEP_PRESETS = [8000, 10000, 12500];

export const MotivationalGateScreen: React.FC = () => {
  const {
    employee,
    goals,
    currentQuote,
    selectedQuoteCategory: quoteCategory,
    favoriteQuoteIds,
    unlockDailyGate: unlockMotivationalGate,
    updateProfileAndGoals,
    refreshQuote,
    toggleFavoriteQuote,
  } = useWellness();

  const [selectedStepGoal, setSelectedStepGoal] = useState<number>(goals.dailyStepsGoal || 10000);
  const isFavorited = favoriteQuoteIds.includes(currentQuote.id);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const USE_NATIVE_DRIVER = Platform.OS !== 'web';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [USE_NATIVE_DRIVER, fadeAnim, slideAnim]);

  const handleUnlock = async () => {
    await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedStepGoal !== goals.dailyStepsGoal) {
      updateProfileAndGoals(
        {
          name: employee.name,
          email: employee.email,
          companyName: employee.companyName,
          role: employee.role,
          department: employee.department,
        },
        {
          ...goals,
          dailyStepsGoal: selectedStepGoal,
        }
      );
    }
    unlockMotivationalGate();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Subheader */}
          <View style={styles.topRow}>
            <Text style={styles.bloomLabel}>YOUR WELLNESS, IN BLOOM</Text>
            <View style={styles.streakPill}>
              <Icon name="flame" size={14} color={colors.streakIcon} />
              <Text style={styles.streakPillText}>{employee.currentStreakDays}-day streak</Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Welcome to your daily pause, {employee.name.split(' ')[0]}.</Text>
          <Text style={styles.welcomeSub}>
            Set your daily rhythm target and intention before entering your workspace.
          </Text>

          {/* Blooming Flower Illustration Banner */}
          <LinearGradient
            colors={['#EAF2E6', '#DCE9D6', '#EFF5EC']}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <Badge label={currentQuote.category} variant="emerald" />
              <View style={styles.quoteBtns}>
                <TouchableOpacity
                  onPress={() => {
                    triggerHapticSelection();
                    toggleFavoriteQuote(currentQuote.id);
                  }}
                  style={styles.iconPill}
                >
                  <Icon
                    name="heart"
                    size={14}
                    color={isFavorited ? colors.heartRate : colors.textSecondary}
                  />
                  <Text style={styles.iconPillText}>{isFavorited ? 'Saved' : 'Save'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    triggerHapticSelection();
                    refreshQuote();
                  }}
                  style={styles.iconPill}
                >
                  <Icon name="refresh" size={14} color={colors.textSecondary} />
                  <Text style={styles.iconPillText}>Shuffle</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.quoteBody}>“{currentQuote.quote}”</Text>
            <Text style={styles.quoteAuthor}>— {currentQuote.author}</Text>

            <View style={styles.flowerRight}>
              <BloomingFlowerIllustration size={96} />
            </View>
          </LinearGradient>

          {/* Mindset Filter Strip */}
          <Text style={styles.sectionLabel}>CHOOSE TODAY'S FOCUS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {QUOTE_CATEGORIES.map((category) => {
              const active = quoteCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => {
                    triggerHapticSelection();
                    refreshQuote(category);
                  }}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Daily Step Target Selector */}
          <Text style={styles.sectionLabel}>DAILY MOVEMENT RHYTHM</Text>
          <View style={styles.stepPresetRow}>
            {STEP_PRESETS.map((steps) => {
              const active = selectedStepGoal === steps;
              return (
                <TouchableOpacity
                  key={steps}
                  onPress={() => {
                    triggerHapticSelection();
                    setSelectedStepGoal(steps);
                  }}
                  style={[styles.stepPresetBtn, active && styles.stepPresetBtnActive]}
                >
                  <Text style={[styles.stepPresetNum, active && styles.stepPresetNumActive]}>
                    {steps.toLocaleString()}
                  </Text>
                  <Text style={styles.stepPresetUnit}>steps / day</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            onPress={handleUnlock}
            activeOpacity={0.88}
            style={styles.enterWorkspaceBtn}
          >
            <Text style={styles.enterWorkspaceText}>Enter my workspace</Text>
            <Icon name="arrowRight" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloomLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.streakBg,
    borderWidth: 1,
    borderColor: colors.streakBorder,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
    gap: 5,
  },
  streakPillText: {
    color: '#5C4934',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  welcomeSub: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4E4CF',
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  iconPillText: {
    color: colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  quoteBody: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 25,
    marginBottom: 8,
  },
  quoteAuthor: {
    color: '#586B5A',
    fontSize: 12.5,
    fontWeight: '500',
  },
  flowerRight: {
    alignItems: 'flex-end',
    marginTop: -12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: '#EFECE3',
  },
  filterChipActive: {
    backgroundColor: '#E7F1E5',
    borderWidth: 1,
    borderColor: '#B5D1AF',
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#2D5A3C',
    fontWeight: '700',
  },
  stepPresetRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  stepPresetBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E1D7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stepPresetBtnActive: {
    backgroundColor: '#E7F1E5',
    borderColor: colors.primary,
  },
  stepPresetNum: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepPresetNumActive: {
    color: '#2D5A3C',
  },
  stepPresetUnit: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  enterWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  enterWorkspaceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
