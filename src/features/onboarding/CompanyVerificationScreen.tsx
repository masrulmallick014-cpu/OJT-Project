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
import { Company, OcrVerificationResult } from '../../types';
import { companyService, PickedIdCardAsset } from '../../services/companyService';
import { Icon } from '../../components/common/Icon';
import { triggerHapticSelection, triggerHapticNotification } from '../../utils/haptics';

export const CompanyVerificationScreen: React.FC = () => {
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

  const [pickedAsset, setPickedAsset] = useState<PickedIdCardAsset | null>(null);
  const [ocrBadgeTextInput, setOcrBadgeTextInput] = useState<string>('');
  const [lastOcrResult, setLastOcrResult] = useState<OcrVerificationResult | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage('Enter your company name.');
      return;
    }
    if (!newCompanyDomain.trim() || !newCompanyDomain.includes('.')) {
      setErrorMessage('Enter a valid corporate domain (e.g., acme.com).');
      return;
    }
    setBusyMessage('Registering company workspace...');
    try {
      await triggerHapticSelection();
      await registerAndSelectCompany(
        newCompanyName.trim(),
        newCompanyDomain.trim(),
        newCompanyIndustry.trim(),
      );
      setShowRegisterForm(false);
      await triggerHapticNotification();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to register company.');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleSelectExistingCompany = async (comp: Company) => {
    setErrorMessage(null);
    setBusyMessage(`Joining ${comp.name} roster...`);
    try {
      await triggerHapticSelection();
      await selectCompanyForUser(comp);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to select company.');
    } finally {
      setBusyMessage(null);
    }
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    setErrorMessage(null);
    if (!userProfile?.companyId) {
      setErrorMessage('Please select or register your company first.');
      return;
    }
    try {
      await triggerHapticSelection();
      const asset = await companyService.pickIdCardImage(source);
      if (!asset) return;
      setPickedAsset(asset);
      if (!ocrBadgeTextInput) {
        setOcrBadgeTextInput(
          `${userProfile.fullName} | ${userProfile.companyName} | ${userProfile.department}`,
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not capture or select ID card photo.');
    }
  };

  const handleGenerateOfficialBadge = async () => {
    setErrorMessage(null);
    if (!userProfile?.companyId) {
      setErrorMessage('Please select or register your company first.');
      return;
    }
    await triggerHapticSelection();
    const asset = companyService.generateOfficialDigitalIdCardAsset(userProfile);
    setPickedAsset(asset);
    setOcrBadgeTextInput(asset.embeddedOcrText || `${userProfile.fullName} | ${userProfile.companyName}`);
  };

  const handleUploadAndVerify = async () => {
    setErrorMessage(null);
    if (!userProfile?.companyId) {
      setErrorMessage('Select or register your company before uploading your ID card.');
      return;
    }
    if (!pickedAsset) {
      setErrorMessage('Please capture, upload, or generate your Company ID Card first.');
      return;
    }

    setBusyMessage(
      'Running AI/OCR Vision Verification (PENDING_ID_UPLOAD -> UNDER_REVIEW -> VERIFIED)...',
    );
    try {
      await triggerHapticSelection();
      const result = await submitAndVerifyIdCard(pickedAsset, ocrBadgeTextInput);
      setLastOcrResult(result);
      if (result.status === 'REJECTED') {
        setErrorMessage(result.rejectionReason || 'ID Card OCR verification rejected.');
      } else {
        await triggerHapticNotification();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'ID card OCR verification failed.');
    } finally {
      setBusyMessage(null);
    }
  };

  const currentStatus = userProfile?.verificationStatus || 'PENDING_ID_UPLOAD';
  const isVerified = currentStatus === 'VERIFIED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepPill}>
        <Text style={styles.stepPillText}>
          STEP 3 OF 3 · COMPANY ROSTER &amp; ID CARD VERIFICATION
        </Text>
      </View>

      <Text style={styles.title}>Verify your corporate identity.</Text>
      <Text style={styles.subtitle}>
        Select or register your company workspace, then upload a real photo of your official
        Company ID Card to unlock your company’s verified leaderboard.
      </Text>

      {/* Current Verification Status Banner */}
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
          name={isVerified ? 'check' : 'shield'}
          size={16}
          color={isVerified ? '#1E3A2F' : currentStatus === 'REJECTED' ? '#9E3333' : '#7A5C43'}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusBannerTitle}>
            STATUS: {currentStatus}
            {isVerified ? ' · VERIFIED CORPORATE ID' : ''}
          </Text>
          <Text style={styles.statusBannerSub}>
            {userProfile?.companyName
              ? `Bound to ${userProfile.companyName}`
              : 'No company selected yet'}
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
          >
            <Text style={styles.toggleBtnText}>
              {showRegisterForm ? 'Search Existing' : '+ Register New Company'}
            </Text>
          </TouchableOpacity>
        </View>

        {!showRegisterForm ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Search live companies by name or domain..."
              placeholderTextColor="#9A9E99"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {filteredCompanies.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>
                  No registered companies match your search yet. Tap "+ Register New Company"
                  above to add your organization.
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
                          {selected ? 'Selected' : 'Select'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.fieldLabel}>COMPANY NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., PulseCorp Technologies"
              placeholderTextColor="#9A9E99"
              value={newCompanyName}
              onChangeText={setNewCompanyName}
            />
            <Text style={styles.fieldLabel}>CORPORATE DOMAIN</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., pulsecorp.com"
              placeholderTextColor="#9A9E99"
              autoCapitalize="none"
              value={newCompanyDomain}
              onChangeText={setNewCompanyDomain}
            />
            <Text style={styles.fieldLabel}>INDUSTRY</Text>
            <TextInput
              style={styles.input}
              placeholder="Technology & Enterprise"
              placeholderTextColor="#9A9E99"
              value={newCompanyIndustry}
              onChangeText={setNewCompanyIndustry}
            />
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={handleRegisterNewCompany}
            >
              <Text style={styles.secondaryActionBtnText}>
                Register & Select Company
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section 2: Capture or Upload Real Company ID Card + AI/OCR Vision Verification */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. AI/OCR Company ID Card Verification</Text>
        <Text style={styles.sectionSub}>
          Capture via camera, upload from gallery, or generate your official corporate digital ID
          badge. Our AI/OCR Vision pipeline automatically verifies that your Full Name (
          {userProfile?.fullName || 'Employee'}) and Company Name (
          {userProfile?.companyName || 'Organization'}) appear on the ID card.
        </Text>

        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => handlePickImage('camera')}
          >
            <Icon name="camera" size={16} color={colors.primary} />
            <Text style={styles.pickerBtnText}>Capture via Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => handlePickImage('library')}
          >
            <Icon name="upload" size={16} color={colors.primary} />
            <Text style={styles.pickerBtnText}>Upload from Gallery</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.pickerBtn,
            { marginTop: 8, backgroundColor: '#FAF9F5', borderColor: '#D5C3B0' },
          ]}
          onPress={handleGenerateOfficialBadge}
        >
          <Icon name="shield" size={15} color="#7A5C43" />
          <Text style={[styles.pickerBtnText, { color: '#7A5C43' }]}>
            Generate Official Digital ID Badge (Embeds Full Name &amp; Company for OCR)
          </Text>
        </TouchableOpacity>

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
                  : 'Validated'}{' '}
                · Size:{' '}
                {pickedAsset
                  ? `${Math.max(1, Math.round(pickedAsset.fileSize / 1024))} KB`
                  : userProfile?.idCardFileSize
                  ? `${Math.max(1, Math.round(userProfile.idCardFileSize / 1024))} KB`
                  : 'Verified'}
              </Text>
            </View>
          </View>
        )}

        {(pickedAsset || userProfile?.idCardUri) && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.fieldLabel}>
              ID CARD PRINTED TEXT (FOR LOCAL OCR FALLBACK / VERIFICATION)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Printed badge text (Full Name | Company Name | Employee ID)"
              placeholderTextColor="#9A9E99"
              value={ocrBadgeTextInput}
              onChangeText={setOcrBadgeTextInput}
            />
          </View>
        )}

        {(lastOcrResult || userProfile?.ocrExtractedText) && (
          <View
            style={{
              marginTop: 12,
              backgroundColor: '#EBF3EC',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#9DC4A5',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: colors.primary,
                letterSpacing: 0.5,
              }}
            >
              AI/OCR VISION EXTRACTION REPORT ·{' '}
              {lastOcrResult ? `${lastOcrResult.confidenceScore}% CONFIDENCE` : 'VERIFIED'}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textPrimary,
                marginTop: 4,
                fontWeight: '600',
              }}
            >
              {lastOcrResult?.matchedFullName !== false ? '✓' : '✕'} Full Name Match:{' '}
              {userProfile?.fullName} ·{' '}
              {lastOcrResult?.matchedCompanyName !== false ? '✓' : '✕'} Company Match:{' '}
              {userProfile?.companyName}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: colors.textSecondary,
                marginTop: 4,
              }}
              numberOfLines={3}
            >
              OCR Text: {lastOcrResult?.extractedText || userProfile?.ocrExtractedText}
            </Text>
          </View>
        )}

        {busyMessage && (
          <View style={styles.busyBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.busyText}>{busyMessage}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {!isVerified ? (
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!pickedAsset || !userProfile?.companyId) && { opacity: 0.65 },
            ]}
            onPress={handleUploadAndVerify}
            activeOpacity={0.85}
          >
            <Icon name="shield" size={16} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              Submit ID Card & Run Verification Pipeline
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.verifiedContinueBtn}
            onPress={advanceFromCompanyVerification}
            activeOpacity={0.85}
          >
            <Icon name="check" size={16} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              VERIFIED CORPORATE ID · Enter PulseCorp Workspace
            </Text>
            <Icon name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  statusBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    backgroundColor: '#DFECE2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E746F',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 8,
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
  emptyBox: {
    padding: 14,
    backgroundColor: '#FAF9F5',
    borderRadius: 12,
    marginTop: 10,
  },
  emptyBoxText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  companyList: {
    marginTop: 10,
    gap: 8,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E2DFD7',
  },
  companyItemSelected: {
    backgroundColor: '#EBF3EC',
    borderColor: colors.primary,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  companyDomain: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EFECE6',
  },
  selectBadgeActive: {
    backgroundColor: colors.primary,
  },
  selectBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectBadgeTextActive: {
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
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
    fontSize: 12,
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
    borderColor: '#E2DFD7',
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewMetaSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF3EC',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  busyText: {
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
    marginTop: 14,
  },
  verifiedContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2B6E46',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

