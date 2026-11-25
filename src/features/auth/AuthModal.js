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
import { Icon } from '../../components/common/Icon';
import { triggerHapticNotification, triggerHapticSelection } from '../../utils/haptics';

const OFFICE_BRANCHES = [
  'Acme Studio · Design & Creative',
  'Bengaluru HQ',
  'Hyderabad Tech Park',
  'Mumbai Studio',
];

export const AuthModal = () => {
  const {
    employee,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginAsDemoEmployee,
    loginAsDemoHrAdmin,
    loginWithCredentials,
  } = useWellness();

  const [fullName, setFullName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [selectedRole, setSelectedRole] = useState(employee.userRole);
  const [selectedOffice, setSelectedOffice] = useState(employee.officeBranch);

  const handleQuickEmployee = async () => {
    await triggerHapticNotification();
    setSelectedRole('EMPLOYEE');
    loginAsDemoEmployee();
  };

  const handleQuickHrAdmin = async () => {
    await triggerHapticNotification();
    setSelectedRole('HR_ADMIN');
    loginAsDemoHrAdmin();
  };

  const handleManualSubmit = async () => {
    await triggerHapticNotification();
    loginWithCredentials({
      email: email || employee.email || 'alex@acme.design',
      name: fullName || employee.name,
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
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.eyebrow}>LOCAL DEMO ROLE SWITCHER</Text>
              <Text style={styles.title}>Account & Role Preview</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsAuthModalOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close role switcher"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            <Text style={styles.sectionLabel}>SWITCH ROLE TO TEST PRIVACY RULES (LOCAL DEMO)</Text>
            <View style={styles.demoButtonsCol}>
              <TouchableOpacity
                style={[
                  styles.demoBtn,
                  employee.userRole === 'EMPLOYEE' && styles.demoBtnActive,
                ]}
                onPress={handleQuickEmployee}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Use Employee role"
              >
                <View style={styles.demoAvatar}>
                  <Text style={styles.demoAvatarText}>EM</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoBtnTitle}>
                    Employee Role {employee.userRole === 'EMPLOYEE' ? '(Active ✓)' : ''}
                  </Text>
                  <Text style={styles.demoBtnSub}>
                    Standard employee view. Cannot inspect other employees’ HR health records.
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
                accessibilityRole="button"
                accessibilityLabel="Use HR Admin role"
              >
                <View style={[styles.demoAvatar, { backgroundColor: '#DFECE2' }]}>
                  <Text style={[styles.demoAvatarText, { color: colors.primary }]}>HR</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoBtnTitle}>
                    HR Admin Role (Demo) {employee.userRole === 'HR_ADMIN' ? '(Active ✓)' : ''}
                  </Text>
                  <Text style={styles.demoBtnSub}>
                    Can view employee health records ONLY when that employee has opted in.
                  </Text>
                </View>
                <Icon name="arrowRight" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Display name"
            />

            <Text style={styles.inputLabel}>WORK EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.com"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Work email"
            />

            <Text style={styles.inputLabel}>ROLE</Text>
            <View style={styles.roleRow}>
              {['EMPLOYEE', 'HR_ADMIN'].map((role) => {
                const active = selectedRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      setSelectedRole(role);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={role === 'EMPLOYEE' ? 'Select Employee role' : 'Select HR Admin role'}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {role === 'EMPLOYEE' ? 'Employee' : 'HR Admin (Demo)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>OFFICE / TEAM</Text>
            <View style={styles.officeWrap}>
              {OFFICE_BRANCHES.map((branch) => {
                const active = selectedOffice === branch;
                return (
                  <TouchableOpacity
                    key={branch}
                    style={[styles.officeChip, active && styles.officeChipActive]}
                    onPress={() => setSelectedOffice(branch)}
                    accessibilityRole="button"
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

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleManualSubmit}
              accessibilityRole="button"
              accessibilityLabel="Save role and profile settings"
            >
              <Text style={styles.submitBtnText}>Apply Role & Workspace</Text>
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
    alignItems: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: colors.primaryGlow,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  demoButtonsCol: {
    gap: 10,
    marginBottom: 16,
  },
  demoBtn: {
    minHeight: 56,
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
    borderColor: colors.primary,
    backgroundColor: '#F4F8F4',
  },
  demoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: colors.textSecondary,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  roleChip: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primary,
  },
  roleChipText: {
    fontSize: 13,
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
    gap: 8,
    marginBottom: 14,
  },
  officeChip: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  officeChipActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primary,
  },
  officeChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  officeChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    minHeight: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
