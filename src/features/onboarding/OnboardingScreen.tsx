import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { CorporateDepartment, GenderIdentity } from '../../types';
import {
  calculateBMI,
  calculateBMR,
  calculateStrideLengthMeters,
} from '../../services/healthService';
import { Icon } from '../../components/common/Icon';
import { triggerHapticSelection, triggerHapticNotification } from '../../utils/haptics';

const DEPARTMENTS: CorporateDepartment[] = [
  'Engineering',
  'Design & Creative',
  'Product & Design',
  'People & HR',
  'Global Operations',
  'Enterprise Sales',
  'Executive Leadership',
];

export const OnboardingScreen: React.FC = () => {
  const { userProfile, saveBiometricOnboarding } = useWellness();

  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [heightInput, setHeightInput] = useState(
    userProfile?.heightCm ? String(userProfile.heightCm) : '',
  );
  const [weightInput, setWeightInput] = useState(
    userProfile?.weightKg ? String(userProfile.weightKg) : '',
  );
  const [gender, setGender] = useState<GenderIdentity>(userProfile?.gender || 'male');
  const [ageInput, setAgeInput] = useState(
    userProfile?.age ? String(userProfile.age) : '',
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    userProfile?.dateOfBirth || '1998-05-15',
  );
  const [department, setDepartment] = useState<CorporateDepartment>(
    userProfile?.department || 'Engineering',
  );
  const [jobTitle, setJobTitle] = useState(userProfile?.jobTitle || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedHeight = Number(heightInput);
  const parsedWeight = Number(weightInput);
  const parsedAge = Number(ageInput);

  const computedPreview = useMemo(() => {
    const validH = parsedHeight >= 140 && parsedHeight <= 220 ? parsedHeight : 0;
    const validW = parsedWeight >= 35 && parsedWeight <= 200 ? parsedWeight : 0;
    const validA = parsedAge >= 16 && parsedAge <= 100 ? parsedAge : 28;
    return {
      bmi: validH && validW ? calculateBMI(validW, validH) : 0,
      bmr: validH && validW ? calculateBMR(validW, validH, validA, gender) : 0,
      strideMeters: validH ? calculateStrideLengthMeters(validH, gender) : 0,
    };
  }, [parsedHeight, parsedWeight, parsedAge, gender]);

  const handleSaveBiometrics = async () => {
    setErrorMessage(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full legal or professional name.');
      return;
    }
    if (isNaN(parsedHeight) || parsedHeight < 140 || parsedHeight > 220) {
      setErrorMessage('Height must be between 140 cm and 220 cm.');
      return;
    }
    if (isNaN(parsedWeight) || parsedWeight < 35 || parsedWeight > 200) {
      setErrorMessage('Weight must be between 35 kg and 200 kg.');
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 16 || parsedAge > 100) {
      setErrorMessage('Age must be between 16 and 100 years.');
      return;
    }
    if (!jobTitle.trim()) {
      setErrorMessage('Please enter your corporate job title.');
      return;
    }

    await triggerHapticSelection();
    await saveBiometricOnboarding({
      fullName: fullName.trim(),
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      gender,
      age: parsedAge,
      dateOfBirth: dateOfBirth.trim() || `${new Date().getFullYear() - parsedAge}-01-01`,
      department,
      jobTitle: jobTitle.trim(),
    });
    await triggerHapticNotification();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>STEP 2 OF 3 · BIOMETRIC &amp; PROFILE CALIBRATION</Text>
        </View>

        <Text style={styles.title}>Personalise your biometric physics.</Text>
        <Text style={styles.subtitle}>
          Your height, weight, and biological gender calibrate your real stride length and
          Mifflin-St Jeor metabolic rate for live step distance and active calorie burn.
        </Text>

        {/* Live Computed Biometric Physics Preview Card */}
        <View style={styles.physicsPreviewCard}>
          <View style={styles.physicsMetricBox}>
            <Text style={styles.physicsMetricLabel}>BMI</Text>
            <Text style={styles.physicsMetricValue}>
              {computedPreview.bmi > 0 ? computedPreview.bmi.toFixed(1) : '—'}
            </Text>
            <Text style={styles.physicsMetricSub}>kg/m²</Text>
          </View>
          <View style={styles.physicsDivider} />
          <View style={styles.physicsMetricBox}>
            <Text style={styles.physicsMetricLabel}>BMR (MIFFLIN-ST JEOR)</Text>
            <Text style={styles.physicsMetricValue}>
              {computedPreview.bmr > 0 ? `${computedPreview.bmr}` : '—'}
            </Text>
            <Text style={styles.physicsMetricSub}>kcal / day</Text>
          </View>
          <View style={styles.physicsDivider} />
          <View style={styles.physicsMetricBox}>
            <Text style={styles.physicsMetricLabel}>STRIDE LENGTH</Text>
            <Text style={styles.physicsMetricValue}>
              {computedPreview.strideMeters > 0
                ? `${computedPreview.strideMeters.toFixed(3)}m`
                : '—'}
            </Text>
            <Text style={styles.physicsMetricSub}>
              {gender === 'male' ? 'H × 0.415' : gender === 'female' ? 'H × 0.413' : 'H × 0.414'}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Aarav Sharma"
            placeholderTextColor="#9A9E99"
            value={fullName}
            onChangeText={setFullName}
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>HEIGHT (140–220 CM)</Text>
              <TextInput
                style={styles.input}
                placeholder="175"
                placeholderTextColor="#9A9E99"
                keyboardType="numeric"
                value={heightInput}
                onChangeText={setHeightInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>WEIGHT (35–200 KG)</Text>
              <TextInput
                style={styles.input}
                placeholder="70"
                placeholderTextColor="#9A9E99"
                keyboardType="numeric"
                value={weightInput}
                onChangeText={setWeightInput}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>GENDER (STRIDE & BMR CALIBRATION)</Text>
          <View style={styles.genderRow}>
            {(['male', 'female', 'other'] as GenderIdentity[]).map((g) => {
              const active = gender === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderPill, active && styles.genderPillActive]}
                  onPress={() => setGender(g)}
                >
                  <Text
                    style={[styles.genderPillText, active && styles.genderPillTextActive]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>AGE (YEARS)</Text>
              <TextInput
                style={styles.input}
                placeholder="26"
                placeholderTextColor="#9A9E99"
                keyboardType="numeric"
                value={ageInput}
                onChangeText={setAgeInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9A9E99"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>JOB TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Senior Systems Engineer"
            placeholderTextColor="#9A9E99"
            value={jobTitle}
            onChangeText={setJobTitle}
          />

          <Text style={styles.fieldLabel}>DEPARTMENT</Text>
          <View style={styles.deptWrap}>
            {DEPARTMENTS.map((dept) => {
              const active = department === dept;
              return (
                <TouchableOpacity
                  key={dept}
                  style={[styles.deptChip, active && styles.deptChipActive]}
                  onPress={() => setDepartment(dept)}
                >
                  <Text style={[styles.deptChipText, active && styles.deptChipTextActive]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSaveBiometrics}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              Save Biometrics & Continue to Company ID Verification
            </Text>
            <Icon name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 42,
  },
  stepPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DFECE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  stepPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  physicsPreviewCard: {
    flexDirection: 'row',
    backgroundColor: '#DFECE2',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8DEC9',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  physicsMetricBox: {
    alignItems: 'center',
    flex: 1,
  },
  physicsMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3A5A46',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  physicsMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  physicsMetricSub: {
    fontSize: 10,
    color: '#4A6B56',
    marginTop: 2,
  },
  physicsDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#B8D4BA',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E746F',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E2DFD7',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E2DFD7',
    alignItems: 'center',
  },
  genderPillActive: {
    backgroundColor: '#DFECE2',
    borderColor: colors.primary,
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  genderPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  deptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  deptChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E2DFD7',
  },
  deptChipActive: {
    backgroundColor: '#DFECE2',
    borderColor: colors.primary,
  },
  deptChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deptChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FCE8E8',
    borderWidth: 1,
    borderColor: '#F5C2C2',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#9E3333',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

