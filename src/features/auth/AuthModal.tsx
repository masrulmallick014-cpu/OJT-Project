import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { OfficeBranch, UserRole } from '../../types';
import { Icon } from '../../components/common/Icon';
import { triggerHapticNotification, triggerHapticSelection } from '../../utils/haptics';

const OFFICE_BRANCHES: OfficeBranch[] = [
  'Acme Studio · Design & Creative',
  'Bengaluru HQ',
  'Hyderabad Tech Park',
  'Mumbai Studio',
];

export const AuthModal: React.FC = () => {
  const {
    employee,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginAsDemoEmployee,
    loginAsDemoHrAdmin,
    loginWithCredentials,
  } = useWellness();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(employee.email);
  const [password, setPassword] = useState('••••••••••••');
  const [fullName, setFullName] = useState(employee.name);
  const [selectedRole, setSelectedRole] = useState<UserRole>(employee.userRole);
  const [selectedOffice, setSelectedOffice] = useState<OfficeBranch>(employee.officeBranch);

  const handleQuickEmployee = async () => {
    await triggerHapticNotification();
    loginAsDemoEmployee();
  };

  const handleQuickHrAdmin = async () => {
    await triggerHapticNotification();
    loginAsDemoHrAdmin();
  };

  const handleManualSubmit = async () => {
    await triggerHapticNotification();
    loginWithCredentials({
      email: email || 'alex@acme.design',
      name: mode === 'signup' ? fullName : undefined,
      role: selectedRole,
      officeBranch: selectedOffice,
    });
  };

  return (
    <Modal
      visible={isAuthModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsAuthModalOpen(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>JWT ROLE-BASED AUTHENTICATION</Text>
              <Text style={styles.title}>
                {mode === 'login' ? 'Sign in to workspace' : 'Create workspace account'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsAuthModalOpen(false)}
            >
              <Icon name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
            {/* Instant Demo Quick-Login Buttons */}
            <Text style={styles.sectionLabel}>QUICK-LOGIN DEMO ACCOUNTS (1-CLICK)</Text>
            <View style={styles.demoButtonsCol}>
              <TouchableOpacity
                style={[
                  styles.demoBtn,
                  employee.userRole === 'EMPLOYEE' && styles.demoBtnActive,
                ]}
                onPress={handleQuickEmployee}
                activeOpacity={0.85}
              >
                <View style={styles.demoAvatar}>
                  <Text style={styles.demoAvatarText}>AM</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoBtnTitle}>Login as Employee (Alex)</Text>
                  <Text style={styles.demoBtnSub}>
                    alex@acme.design · Acme Studio · Design & Creative
                  </Text>
                </View>
                <Icon name="arrowRight" size={16} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.demoBtn,
                  employee.userRole === 'HR_ADMIN' && styles.demoBtnActive,
                ]}
                onPress={handleQuickHrAdmin}
                activeOpacity={0.85}
              >
                <View style={[styles.demoAvatar, { backgroundColor: '#DFECE2' }]}>
                  <Text style={[styles.demoAvatarText, { color: colors.primary }]}>PN</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoBtnTitle}>Login as HR Admin (Priya)</Text>
                  <Text style={styles.demoBtnSub}>
                    priya.hr@acme.design · Bengaluru HQ · Consented Health Portal
                  </Text>
                </View>
                <Icon name="arrowRight" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Login / Sign-Up Segmented Switcher */}
            <View style={styles.modeSwitchRow}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                onPress={async () => {
                  await triggerHapticSelection();
                  setMode('login');
                }}
              >
                <Text
                  style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}
                >
                  Manual Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                onPress={async () => {
                  await triggerHapticSelection();
                  setMode('signup');
                }}
              >
                <Text
                  style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Alex Morgan"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            <Text style={styles.inputLabel}>WORK EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="alex@acme.design"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>ACCOUNT ROLE</Text>
            <View style={styles.roleRow}>
              {(['EMPLOYEE', 'HR_ADMIN'] as UserRole[]).map((role) => {
                const active = selectedRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {role === 'EMPLOYEE' ? 'Employee' : 'HR Admin'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>OFFICE / BRANCH</Text>
            <View style={styles.officeWrap}>
              {OFFICE_BRANCHES.map((branch) => {
                const active = selectedOffice === branch;
                return (
                  <TouchableOpacity
                    key={branch}
                    style={[styles.officeChip, active && styles.officeChipActive]}
                    onPress={() => setSelectedOffice(branch)}
                  >
                    <Text
                      style={[styles.officeChipText, active && styles.officeChipTextActive]}
                    >
                      {branch}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Sign In & Sync Session →' : 'Create Account & Continue →'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 28, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 396,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primaryGlow,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 8,
  },
  demoButtonsCol: {
    gap: 8,
    marginBottom: 16,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 10,
  },
  demoBtnActive: {
    borderColor: colors.primaryGlow,
    backgroundColor: '#F4F8F4',
  },
  demoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sandAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sandAvatarText,
  },
  demoBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  demoBtnSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
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
    color: colors.textPrimary,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: colors.textSecondary,
    marginBottom: 5,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primaryGlow,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  officeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  officeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#FFFFFF',
  },
  officeChipActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primaryGlow,
  },
  officeChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  officeChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

