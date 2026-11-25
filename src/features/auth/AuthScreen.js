import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { Icon } from '../../components/common/Icon';
import { triggerHapticSelection, triggerHapticNotification } from '../../utils/haptics';

export const AuthScreen = () => {
  const { signUpWithEmail, loginWithEmail, verifyOtpSession } = useWellness();

  const [mode, setMode] = useState('SIGN_UP');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtpHint, setGeneratedOtpHint] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateEmailFormat = (value) => {
    const trimmed = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const handlePrimarySubmit = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmailFormat(cleanEmail)) {
      setErrorMessage('Please enter a valid work or personal email address.');
      return;
    }

    if (mode === 'OTP') {
      if (otpCode.trim().length < 6) {
        setErrorMessage('Enter the 6-digit local verification code.');
        return;
      }
      setLoading(true);
      try {
        await verifyOtpSession(cleanEmail, otpCode.trim());
        await triggerHapticNotification();
      } catch (err) {
        setErrorMessage(err?.message || 'Code check failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'SIGN_UP' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await triggerHapticSelection();
      if (mode === 'SIGN_UP') {
        await signUpWithEmail(cleanEmail, password);
      } else {
        await loginWithEmail(cleanEmail, password);
      }
      await triggerHapticNotification();
    } catch (err) {
      setErrorMessage(err?.message || 'Could not sign in. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = () => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(cleanEmail)) {
      setErrorMessage('Enter your email address first to generate a local demo code.');
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtpHint(code);
    setOtpCode(code);
    setMode('OTP');
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
        <View style={styles.brandBadge}>
          <Icon name="lotus" size={16} color={colors.primary} />
          <Text style={styles.brandBadgeText}>PULSECORP · WORKPLACE WELLNESS</Text>
        </View>

        <Text style={styles.title}>
          {mode === 'SIGN_UP'
            ? 'Welcome to PulseCorp'
            : mode === 'LOGIN'
              ? 'Sign in to your account'
              : 'Quick code sign-in (Demo)'}
        </Text>
        <Text style={styles.subtitle}>
          Build healthy daily habits at your own pace. Here is how setup works:
        </Text>

        {/* Clear 3-Step Onboarding Roadmap */}
        <View style={styles.roadmapCard}>
          <Text style={styles.roadmapHeader}>WHAT HAPPENS NEXT (3 QUICK STEPS)</Text>
          <View style={styles.roadmapStepRow}>
            <View style={styles.roadmapBadge}>
              <Text style={styles.roadmapBadgeText}>1</Text>
            </View>
            <Text style={styles.roadmapStepText}>
              <Text style={styles.roadmapStepBold}>Health Access (Optional): </Text>
              Choose whether to connect step sensors or log manually.
            </Text>
          </View>
          <View style={styles.roadmapStepRow}>
            <View style={styles.roadmapBadge}>
              <Text style={styles.roadmapBadgeText}>2</Text>
            </View>
            <Text style={styles.roadmapStepText}>
              <Text style={styles.roadmapStepBold}>Profile & Body Info: </Text>
              Set your name, department, and stride estimate.
            </Text>
          </View>
          <View style={styles.roadmapStepRow}>
            <View style={styles.roadmapBadge}>
              <Text style={styles.roadmapBadgeText}>3</Text>
            </View>
            <Text style={styles.roadmapStepText}>
              <Text style={styles.roadmapStepBold}>Company Workspace: </Text>
              Join your company team and optionally submit an ID photo for review.
            </Text>
          </View>
        </View>

        {/* Auth Mode Switcher */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'SIGN_UP' && styles.modeTabActive]}
            onPress={() => {
              setMode('SIGN_UP');
              setErrorMessage(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch to Sign Up"
          >
            <Text style={[styles.modeTabText, mode === 'SIGN_UP' && styles.modeTabTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'LOGIN' && styles.modeTabActive]}
            onPress={() => {
              setMode('LOGIN');
              setErrorMessage(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch to Login"
          >
            <Text style={[styles.modeTabText, mode === 'LOGIN' && styles.modeTabTextActive]}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'OTP' && styles.modeTabActive]}
            onPress={handleRequestOtp}
            accessibilityRole="button"
            accessibilityLabel="Use a demo one-time code"
          >
            <Text style={[styles.modeTabText, mode === 'OTP' && styles.modeTabTextActive]}>
              Demo Code
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="name@company.com"
            placeholderTextColor="#7A7F7A"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email address"
          />

          {mode !== 'OTP' ? (
            <>
              <Text style={styles.fieldLabel}>PASSWORD (AT LEAST 6 CHARACTERS)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#7A7F7A"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Password"
              />

              {mode === 'SIGN_UP' && (
                <>
                  <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#7A7F7A"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    accessibilityLabel="Confirm password"
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>6-DIGIT DEMO CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#7A7F7A"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
                accessibilityLabel="6-digit demo code"
              />
              {generatedOtpHint && (
                <View style={styles.otpBanner}>
                  <Icon name="check" size={14} color={colors.primary} />
                  <Text style={styles.otpBannerText}>
                    Local demo code generated for {email.trim()}: {generatedOtpHint}
                  </Text>
                </View>
              )}
            </>
          )}

          {errorMessage && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorText}>! {errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handlePrimarySubmit}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'SIGN_UP'
                ? 'Create account and continue to Step 1: Health Access'
                : mode === 'LOGIN'
                  ? 'Sign in to PulseCorp'
                  : 'Verify demo code and continue'
            }
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {mode === 'SIGN_UP'
                    ? 'Create Account & Continue to Step 1'
                    : mode === 'LOGIN'
                      ? 'Sign In'
                      : 'Verify Code & Continue'}
                </Text>
                <Icon name="arrowRight" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.securityNote}>
          <Icon name="info" size={15} color="#5C645E" />
          <Text style={styles.securityNoteText}>
            Local prototype note: Your account and wellness logs are saved on this device using
            AsyncStorage. They are not encrypted or sent to a remote server.
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#DFECE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  roadmapCard: {
    backgroundColor: '#F3F7F3',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D5E5D8',
    marginBottom: 16,
    gap: 8,
  },
  roadmapHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  roadmapStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  roadmapBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  roadmapBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roadmapStepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  roadmapStepBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C645E',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#D8D4CA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF3EC',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  otpBannerText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    backgroundColor: '#FCE8E8',
    borderWidth: 1,
    borderColor: '#F5C2C2',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#9E3333',
    fontWeight: '600',
  },
  submitBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 18,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 6,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#5C645E',
    lineHeight: 17,
    flex: 1,
  },
});
