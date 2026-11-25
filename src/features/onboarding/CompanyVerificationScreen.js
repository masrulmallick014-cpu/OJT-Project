import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { companyService } from '../../services/companyService';
import { Icon } from '../../components/common/Icon';
import { triggerHapticSelection, triggerHapticNotification } from '../../utils/haptics';

export const CompanyVerificationScreen = () => {
  const {
    userProfile,
    companies,
    selectCompanyForUser,
    registerAndSelectCompany,
    submitAndVerifyIdCard,
    advanceFromCompanyVerification,
  } = useWellness();

  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(companies.length === 0);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDomain, setNewCompanyDomain] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('Technology & Enterprise');

  const [pickedAsset, setPickedAsset] = useState(null);
  const [badgeNoteInput, setBadgeNoteInput] = useState('');
  const [busyMessage, setBusyMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusNotice, setStatusNotice] = useState(null);

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (c.corporateDomain || c.domain || '')
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()),
  );

  const handleRegisterNewCompany = async () => {
    setErrorMessage(null);
    if (!newCompanyName.trim()) {
      setErrorMessage('Please enter your company name.');
      return;
    }
    if (!newCompanyDomain.trim() || !newCompanyDomain.includes('.')) {
      setErrorMessage('Enter a valid company domain (e.g., acme.com).');
      return;
    }
    setBusyMessage('Saving company workspace locally...');
    try {
      await triggerHapticSelection();
      await registerAndSelectCompany(
        newCompanyName.trim(),
        newCompanyDomain.trim(),
        newCompanyIndustry.trim(),
      );
      setShowRegisterForm(false);
      await triggerHapticNotification();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to register company.');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleSelectExistingCompany = async (comp) => {
    setErrorMessage(null);
    setBusyMessage(`Joining ${comp.name}...`);
    try {
      await triggerHapticSelection();
      await selectCompanyForUser(comp);
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to select company.');
    } finally {
      setBusyMessage(null);
    }
  };

  const handlePickImage = async (source) => {
    setErrorMessage(null);
    setStatusNotice(null);
    if (!userProfile?.companyId) {
      setErrorMessage('Please select or register your company first.');
      return;
    }
    try {
      await triggerHapticSelection();
      const asset = await companyService.pickIdCardImage(source);
      if (!asset) return;
      setPickedAsset(asset);
    } catch (err) {
      setErrorMessage(err?.message || 'Could not capture or select ID card photo.');
    }
  };

  const handleUploadForReview = async () => {
    setErrorMessage(null);
    setStatusNotice(null);
    if (!userProfile?.companyId) {
      setErrorMessage('Please select or register your company first.');
      return;
    }
    if (!pickedAsset) {
      setErrorMessage('Please select or capture a photo of your company ID card first.');
      return;
    }

    setBusyMessage('Saving ID card photo locally for HR review...');
    try {
      await triggerHapticSelection();
      const result = await submitAndVerifyIdCard(pickedAsset, badgeNoteInput);
      if (result.status === 'REJECTED') {
        setErrorMessage(result.rejectionReason || 'Uploaded file could not be accepted.');
      } else {
        await triggerHapticNotification();
        setStatusNotice(
          'ID photo saved locally and marked "Under Review". Real verification requires HR review.',
        );
      }
    } catch (err) {
      setErrorMessage(err?.message || 'ID card submission failed.');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleContinueToApp = async () => {
    setErrorMessage(null);
    if (!userProfile?.companyId) {
      setErrorMessage('Please select or register your company workspace before continuing.');
      return;
    }
    await triggerHapticNotification();
    await advanceFromCompanyVerification();
  };

  const currentStatus = userProfile?.verificationStatus || 'PENDING_ID_UPLOAD';
  const isVerified = currentStatus === 'VERIFIED';
  const isUnderReview = currentStatus === 'UNDER_REVIEW';

  const statusLabel = isVerified
    ? 'Verified by HR'
    : isUnderReview
      ? 'Submitted · Pending HR Review'
      : currentStatus === 'REJECTED'
        ? 'Upload needs attention'
        : 'Optional ID upload not submitted yet';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepPill}>
        <Text style={styles.stepPillText}>
          STEP 3 OF 3 · COMPANY WORKSPACE &amp; ID UPLOAD
        </Text>
      </View>

      <Text style={styles.title}>Join your company workspace</Text>
      <Text style={styles.subtitle}>
        Choose or create your company workspace to see team challenges. You can optionally
        upload a photo of your company ID card for HR review, or skip the upload and enter the
        app right away.
      </Text>

      {/* Honest Verification Status Banner */}
      <View
        style={[
          styles.statusBanner,
          isVerified
            ? styles.statusBannerVerified
            : currentStatus === 'REJECTED'
              ? styles.statusBannerRejected
              : styles.statusBannerPending,
        ]}
      >
        <Icon
          name={isVerified ? 'check' : 'info'}
          size={18}
          color={isVerified ? '#1E3A2F' : currentStatus === 'REJECTED' ? '#9E3333' : '#7A5C43'}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusBannerTitle}>ID Status: {statusLabel}</Text>
          <Text style={styles.statusBannerSub}>
            {userProfile?.companyName
              ? `Workspace: ${userProfile.companyName}`
              : 'Select or register a company below'}
          </Text>
        </View>
      </View>

      {/* Section 1: Select or Register Company */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>1. Select or Register Company</Text>
          <TouchableOpacity
            onPress={() => setShowRegisterForm((prev) => !prev)}
            style={styles.toggleBtn}
            accessibilityRole="button"
            accessibilityLabel={
              showRegisterForm ? 'Search existing companies' : 'Register a new company'
            }
          >
            <Text style={styles.toggleBtnText}>
              {showRegisterForm ? 'Search Existing' : '+ New Company'}
            </Text>
          </TouchableOpacity>
        </View>

        {!showRegisterForm ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Search companies on this device..."
              placeholderTextColor="#7A7F7A"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search companies"
            />
            {filteredCompanies.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>
                  No companies saved on this device yet. Tap "+ New Company" above to add your
                  workplace.
                </Text>
              </View>
            ) : (
              <View style={styles.companyList}>
                {filteredCompanies.map((comp) => {
                  const selected = userProfile?.companyId === comp.id;
                  return (
                    <TouchableOpacity
                      key={comp.id}
                      style={[
                        styles.companyItem,
                        selected && styles.companyItemSelected,
                      ]}
                      onPress={() => handleSelectExistingCompany(comp)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select company ${comp.name}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.companyName}>{comp.name}</Text>
                        <Text style={styles.companyDomain}>
                          @{comp.corporateDomain || comp.domain} · {comp.industry}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.selectBadge,
                          selected && styles.selectBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectBadgeText,
                            selected && styles.selectBadgeTextActive,
                          ]}
                        >
                          {selected ? '✓ Selected' : 'Select'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.fieldLabel}>COMPANY NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Acme Studio"
              placeholderTextColor="#7A7F7A"
              value={newCompanyName}
              onChangeText={setNewCompanyName}
              accessibilityLabel="Company name"
            />
            <Text style={styles.fieldLabel}>COMPANY EMAIL DOMAIN</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., acme.com"
              placeholderTextColor="#7A7F7A"
              autoCapitalize="none"
              value={newCompanyDomain}
              onChangeText={setNewCompanyDomain}
              accessibilityLabel="Company email domain"
            />
            <Text style={styles.fieldLabel}>INDUSTRY</Text>
            <TextInput
              style={styles.input}
              placeholder="Technology & Enterprise"
              placeholderTextColor="#7A7F7A"
              value={newCompanyIndustry}
              onChangeText={setNewCompanyIndustry}
              accessibilityLabel="Company industry"
            />
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={handleRegisterNewCompany}
              accessibilityRole="button"
              accessibilityLabel="Register and select company"
            >
              <Text style={styles.secondaryActionBtnText}>
                Save &amp; Select Company
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section 2: Honest Optional ID Card Upload for HR Review */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Upload Company ID Card (Optional)</Text>
        <Text style={styles.sectionSub}>
          Upload a photo of your company ID card to save it locally for HR review. Note: This
          prototype checks image dimensions locally and marks your submission as "Pending HR
          Review" — it does not run cloud AI verification.
        </Text>

        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => handlePickImage('camera')}
            accessibilityRole="button"
            accessibilityLabel="Take ID card photo with camera"
          >
            <Icon name="camera" size={16} color={colors.primary} />
            <Text style={styles.pickerBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => handlePickImage('library')}
            accessibilityRole="button"
            accessibilityLabel="Choose ID card image from gallery"
          >
            <Icon name="upload" size={16} color={colors.primary} />
            <Text style={styles.pickerBtnText}>Choose Image</Text>
          </TouchableOpacity>
        </View>

        {(pickedAsset || userProfile?.idCardUri) && (
          <View style={styles.previewBox}>
            <Image
              source={{ uri: pickedAsset?.uri || userProfile?.idCardUri || '' }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.previewMeta}>
              <Text style={styles.previewMetaTitle}>
                {pickedAsset?.fileName || userProfile?.idCardFileName || 'Company_ID_Card.jpg'}
              </Text>
              <Text style={styles.previewMetaSub}>
                Resolution:{' '}
                {pickedAsset
                  ? `${pickedAsset.width}×${pickedAsset.height}px`
                  : userProfile?.idCardDimensions
                    ? `${userProfile.idCardDimensions.width}×${userProfile.idCardDimensions.height}px`
                    : 'Checked'}{' '}
                · Size:{' '}
                {pickedAsset
                  ? `${Math.max(1, Math.round(pickedAsset.fileSize / 1024))} KB`
                  : userProfile?.idCardFileSize
                    ? `${Math.max(1, Math.round(userProfile.idCardFileSize / 1024))} KB`
                    : 'Saved'}
              </Text>
            </View>
          </View>
        )}

        {(pickedAsset || userProfile?.idCardUri) && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.fieldLabel}>OPTIONAL EMPLOYEE ID / NOTE FOR HR</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Badge #1042"
              placeholderTextColor="#7A7F7A"
              value={badgeNoteInput}
              onChangeText={setBadgeNoteInput}
              accessibilityLabel="Optional employee ID or note for HR"
            />
          </View>
        )}

        {pickedAsset && !isUnderReview && (
          <TouchableOpacity
            style={styles.uploadReviewBtn}
            onPress={handleUploadForReview}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Submit ID card photo for HR review"
          >
            <Icon name="upload" size={16} color={colors.primary} />
            <Text style={styles.uploadReviewBtnText}>Save ID Photo for HR Review</Text>
          </TouchableOpacity>
        )}

        {statusNotice && (
          <View style={styles.noticeBanner}>
            <Icon name="check" size={15} color={colors.primary} />
            <Text style={styles.noticeText}>{statusNotice}</Text>
          </View>
        )}

        {busyMessage && (
          <View style={styles.busyBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.busyText}>{busyMessage}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorText}>! {errorMessage}</Text>
          </View>
        )}
      </View>

      {/* Primary CTA: Enter PulseCorp Workspace */}
      <TouchableOpacity
        style={[
          styles.primaryEnterBtn,
          !userProfile?.companyId && { opacity: 0.6 },
        ]}
        onPress={handleContinueToApp}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Finish setup and enter PulseCorp workspace"
      >
        <Text style={styles.primaryEnterBtnText}>
          {isUnderReview
            ? 'Enter Workspace (ID Pending HR Review)'
            : 'Enter PulseCorp Workspace'}
        </Text>
        <Icon name="arrowRight" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  statusBannerPending: {
    backgroundColor: '#F5EBE1',
    borderColor: '#D5C3B0',
  },
  statusBannerVerified: {
    backgroundColor: '#DFECE2',
    borderColor: '#9DC4A5',
  },
  statusBannerRejected: {
    backgroundColor: '#FCE8E8',
    borderColor: '#F5C2C2',
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    minHeight: 40,
    backgroundColor: '#DFECE2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    justifyContent: 'center',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C645E',
    letterSpacing: 0.6,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#D8D4CA',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  emptyBox: {
    padding: 14,
    backgroundColor: '#FAF9F5',
    borderRadius: 12,
    marginTop: 10,
  },
  emptyBoxText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  companyList: {
    marginTop: 10,
    gap: 8,
  },
  companyItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#D8D4CA',
  },
  companyItemSelected: {
    backgroundColor: '#EBF3EC',
    borderColor: colors.primary,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  companyDomain: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EFECE6',
  },
  selectBadgeActive: {
    backgroundColor: colors.primary,
  },
  selectBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectBadgeTextActive: {
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    minHeight: 48,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: '#C5DEC0',
    paddingVertical: 12,
    borderRadius: 12,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF9F5',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8D4CA',
    marginTop: 12,
  },
  previewImage: {
    width: 68,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EFECE6',
  },
  previewMeta: {
    flex: 1,
  },
  previewMetaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewMetaSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadReviewBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  uploadReviewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: '#9DC4A5',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  noticeText: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF3EC',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  busyText: {
    fontSize: 12.5,
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
  primaryEnterBtn: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryEnterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
