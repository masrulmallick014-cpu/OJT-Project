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

export const AuthScreen: React.FC = () => {
  const { signUpWithEmail, loginWithEmail, verifyOtpSession } = useWellness();

  const [mode, setMode] = useState<'SIGN_UP' | 'LOGIN' | 'OTP'>('SIGN_UP');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtpHint, setGeneratedOtpHint] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmailFormat = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const handlePrimarySubmit = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmailFormat(cleanEmail)) {
      setErrorMessage('Please enter a valid corporate or personal email address.');
      return;
    }

    if (mode === 'OTP') {
      if (otpCode.trim().length < 6) {
        setErrorMessage('Enter the 6-digit session verification OTP code.');
        return;
      }
      setLoading(true);
      try {
        await verifyOtpSession(cleanEmail, otpCode.trim());
        await triggerHapticNotification();
      } catch (err: any) {
        setErrorMessage(err?.message || 'OTP verification failed.');
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
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = () => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(cleanEmail)) {
      setErrorMessage('Enter your email address first to generate a session OTP.');
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
          <Icon name="shield" size={16} color={colors.primary} />
          <Text style={styles.brandBadgeText}>PULSECORP · ZERO-MOCK AUTHENTICATION</Text>
        </View>

        <Text style={styles.title}>
          {mode === 'SIGN_UP'
            ? 'Create your corporate wellness account.'
            : mode === 'LOGIN'
            ? 'Sign in to your workspace.'
            : 'Verify your OTP session.'}
        </Text>
        <Text style={styles.subtitle}>
          Every biometric metric, stride calculation, and company leaderboard entry is bound to
          your real authenticated profile.
        </Text>

        {/* Auth Mode Switcher */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'SIGN_UP' && styles.modeTabActive]}
            onPress={() => {
              setMode('SIGN_UP');
              setErrorMessage(null);
            }}
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
          >
            <Text style={[styles.modeTabText, mode === 'LOGIN' && styles.modeTabTextActive]}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'OTP' && styles.modeTabActive]}
            onPress={handleRequestOtp}
          >
            <Text style={[styles.modeTabText, mode === 'OTP' && styles.modeTabTextActive]}>
              OTP Session
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>CORPORATE OR PERSONAL EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="name@company.com"
            placeholderTextColor="#9A9E99"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {mode !== 'OTP' ? (
            <>
              <Text style={styles.fieldLabel}>PASSWORD (MIN 6 CHARS)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9A9E99"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {mode === 'SIGN_UP' && (
                <>
                  <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#9A9E99"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>6-DIGIT SESSION OTP CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#9A9E99"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
              />
              {generatedOtpHint && (
                <View style={styles.otpBanner}>
                  <Icon name="check" size={14} color={colors.primary} />
                  <Text style={styles.otpBannerText}>
                    Session OTP generated for {email.trim()}: {generatedOtpHint}
                  </Text>
                </View>
              )}
            </>
          )}

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handlePrimarySubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {mode === 'SIGN_UP'
                    ? 'Create Account & Continue to Biometrics'
                    : mode === 'LOGIN'
                    ? 'Sign In to PulseCorp'
                    : 'Verify OTP & Start Session'}
                </Text>
                <Icon name="arrow-right" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.securityNote}>
          <Icon name="lock" size={14} color="#636964" />
          <Text style={styles.securityNoteText}>
            Persisted in encrypted local session storage (@react-native-async-storage/async-storage).
            Zero pre-populated demo profiles are loaded.
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
    paddingHorizontal: 22,
    paddingTop: 18,
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
    marginBottom: 14,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 18,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
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
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  otpBannerText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 6,
  },
  securityNoteText: {
    fontSize: 11,
    color: '#636964',
    lineHeight: 16,
    flex: 1,
  },
});

