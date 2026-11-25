import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANIES_STORAGE_KEY = '@pulsecorp_companies_db_v2';
const ROSTER_STORAGE_KEY = '@pulsecorp_company_roster_db_v2';
const ID_SUBMISSIONS_STORAGE_KEY = '@pulsecorp_id_submissions_db_v2';

const getNativeImagePicker = () => {
  try {
    // eslint-disable-next-line no-eval
    return eval('require')('expo-image-picker');
  } catch {
    return null;
  }
};

class CompanyVerificationService {
  constructor() {
    this.leaderboardListeners = new Map();
    this.broadcastChannel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const BC = window.BroadcastChannel;
        this.broadcastChannel = new BC('pulsecorp_live_company_leaderboard');
        this.broadcastChannel.onmessage = (event) => {
          const data = event?.data;
          if (data?.type === 'ROSTER_UPDATED' && data.companyId) {
            this.notifyLeaderboardListeners(data.companyId);
          }
        };
      } catch {
        this.broadcastChannel = null;
      }
    }
  }

  async notifyLeaderboardListeners(companyId) {
    const listeners = this.leaderboardListeners.get(companyId);
    if (!listeners || listeners.size === 0) return;
    const latest = await this.getVerifiedCompanyLeaderboard(companyId);
    listeners.forEach((cb) => {
      try {
        cb(latest);
      } catch {
        // ignore listener error
      }
    });
  }

  subscribeToCompanyLeaderboard(companyId, onUpdate) {
    if (!companyId) return () => {};

    if (!this.leaderboardListeners.has(companyId)) {
      this.leaderboardListeners.set(companyId, new Set());
    }
    const set = this.leaderboardListeners.get(companyId);
    set.add(onUpdate);

    this.getVerifiedCompanyLeaderboard(companyId).then(onUpdate).catch(() => {});

    return () => {
      set.delete(onUpdate);
    };
  }

  async getCompanies() {
    try {
      const raw = await AsyncStorage.getItem(COMPANIES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore error
    }
    return [];
  }

  async saveCompanies(companies) {
    await AsyncStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  }

  async registerCompany(name, corporateDomain, industry, createdByUid) {
    const cleanName = name.trim();
    const cleanDomain = corporateDomain
      .trim()
      .toLowerCase()
      .replace(/^@/, '');

    if (!cleanName) {
      throw new Error('Company name is required.');
    }
    if (!cleanDomain || !cleanDomain.includes('.')) {
      throw new Error('Valid company email domain (e.g., acme.com) is required.');
    }

    const companies = await this.getCompanies();
    const existing = companies.find(
      (c) =>
        (c.corporateDomain || c.domain || '').toLowerCase() === cleanDomain ||
        c.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (existing) {
      return existing;
    }

    const newCompany = {
      id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: cleanDomain,
      corporateDomain: cleanDomain,
      industry: industry.trim() || 'Technology & Enterprise',
      createdAt: new Date().toISOString(),
      createdByUid,
      verifiedMemberCount: 0,
    };

    const updated = [newCompany, ...companies];
    await this.saveCompanies(updated);
    return newCompany;
  }

  async getAllRosterMembers() {
    try {
      const raw = await AsyncStorage.getItem(ROSTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  async saveAllRosterMembers(members) {
    await AsyncStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(members));
  }

  async assignUserToCompany(userProfile, company) {
    const roster = await this.getAllRosterMembers();
    const existingIdx = roster.findIndex((m) => m.uid === userProfile.uid);
    const existingSameCompany =
      existingIdx >= 0 && roster[existingIdx].companyId === company.id;

    const memberRecord = {
      uid: userProfile.uid,
      companyId: company.id,
      companyName: company.name,
      fullName: userProfile.fullName,
      email: userProfile.email,
      department: userProfile.department || 'Engineering',
      jobTitle: userProfile.jobTitle || 'Employee',
      verificationStatus: existingSameCompany
        ? roster[existingIdx].verificationStatus
        : 'PENDING_ID_UPLOAD',
      verifiedAt: existingSameCompany ? roster[existingIdx].verifiedAt : null,
      idCardSubmittedAt: existingSameCompany
        ? roster[existingIdx].idCardSubmittedAt
        : null,
      idCardVerifiedAt: existingSameCompany ? roster[existingIdx].idCardVerifiedAt : null,
      todaySteps: existingIdx >= 0 ? roster[existingIdx].todaySteps : 0,
      dailySteps: existingIdx >= 0 ? roster[existingIdx].dailySteps : 0,
      weeklySteps: existingIdx >= 0 ? roster[existingIdx].weeklySteps : 0,
      activeCalories: existingIdx >= 0 ? roster[existingIdx].activeCalories : 0,
      activeCaloriesKcal: existingIdx >= 0 ? roster[existingIdx].activeCaloriesKcal : 0,
      distanceKm: existingIdx >= 0 ? roster[existingIdx].distanceKm : 0,
      lastSyncedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      roster[existingIdx] = memberRecord;
    } else {
      roster.push(memberRecord);
    }

    await this.saveAllRosterMembers(roster);
    this.notifyLeaderboardListeners(company.id);

    return {
      companyId: company.id,
      companyName: company.name,
      corporateDomain: company.corporateDomain || company.domain,
      verificationStatus: memberRecord.verificationStatus,
    };
  }

  async pickIdCardImage(source) {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (source === 'camera') {
          input.setAttribute('capture', 'environment');
        }
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) {
            resolve(null);
            return;
          }
          if (file.size <= 0) {
            reject(new Error('Selected image file is empty (0 bytes).'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUri = typeof reader.result === 'string' ? reader.result : '';
            if (!dataUri) {
              reject(new Error('Could not read image file data.'));
              return;
            }
            const img = new window.Image();
            img.onload = () => {
              resolve({
                uri: dataUri,
                width: img.naturalWidth || 800,
                height: img.naturalHeight || 500,
                fileSize: file.size,
                mimeType: file.type || 'image/jpeg',
                fileName: file.name || `id_card_${Date.now()}.jpg`,
              });
            };
            img.onerror = () => {
              reject(new Error('Selected file is not a valid image.'));
            };
            img.src = dataUri;
          };
          reader.onerror = () => reject(new Error('Failed to read selected ID card file.'));
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }

    const ImagePicker = getNativeImagePicker();
    if (!ImagePicker) {
      throw new Error(
        'Camera / Gallery module (expo-image-picker) is not available in this build.',
      );
    }

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        throw new Error('Camera permission was denied. Please enable camera access in Settings.');
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        allowsEditing: true,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.length) return null;
      const asset = res.assets[0];
      return {
        uri: asset.uri,
        width: asset.width || 640,
        height: asset.height || 400,
        fileSize: asset.fileSize || 48000,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `id_camera_${Date.now()}.jpg`,
      };
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        throw new Error(
          'Photo library permission was denied. Please enable media access in Settings.',
        );
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        allowsEditing: true,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.length) return null;
      const asset = res.assets[0];
      return {
        uri: asset.uri,
        width: asset.width || 640,
        height: asset.height || 400,
        fileSize: asset.fileSize || 48000,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `id_gallery_${Date.now()}.jpg`,
      };
    }
  }

  async submitIdCardUpload(uid, companyId, asset) {
    if (!asset || !asset.uri || asset.fileSize <= 0) {
      throw new Error('Please choose a valid ID card photo (file size must be greater than 0 bytes).');
    }
    if (asset.width < 80 || asset.height < 80) {
      throw new Error(
        `Image resolution (${asset.width}x${asset.height}) is too small. Minimum 80x80px required.`,
      );
    }

    const nowIso = new Date().toISOString();
    const submission = {
      uid,
      companyId,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      submittedAt: nowIso,
      status: 'UNDER_REVIEW',
      reviewedAt: null,
      rejectionReason: null,
    };

    const existingRaw = await AsyncStorage.getItem(ID_SUBMISSIONS_STORAGE_KEY);
    const submissions = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = submissions.filter((s) => s.uid !== uid);
    filtered.unshift(submission);
    await AsyncStorage.setItem(ID_SUBMISSIONS_STORAGE_KEY, JSON.stringify(filtered));

    const roster = await this.getAllRosterMembers();
    const idx = roster.findIndex((m) => m.uid === uid && m.companyId === companyId);
    if (idx >= 0) {
      roster[idx].verificationStatus = 'UNDER_REVIEW';
      roster[idx].idCardSubmittedAt = nowIso;
      await this.saveAllRosterMembers(roster);
    }

    return submission;
  }

  /**
   * Honest local ID submission handler:
   * Checks basic image dimensions/integrity and records the upload as `UNDER_REVIEW`
   * ("Submitted for HR Review"). It does NOT auto-verify users through synthetic text
   * or pretend to run cloud AI verification.
   */
  async verifyEmployeeIdCard(uid, companyId, userProfile, asset, optionalNote) {
    const existingRaw = await AsyncStorage.getItem(ID_SUBMISSIONS_STORAGE_KEY);
    const submissions = existingRaw ? JSON.parse(existingRaw) : [];
    const subIdx = submissions.findIndex(
      (s) => s.uid === uid && s.companyId === companyId,
    );

    if (subIdx < 0) {
      return {
        status: 'PENDING_ID_UPLOAD',
        verifiedAt: null,
        rejectionReason: 'No ID card photo uploaded yet.',
        extractedText: '',
        matchedFullName: false,
        matchedCompanyName: false,
        confidenceScore: 0,
      };
    }

    const sub = submissions[subIdx];
    const isValidImage =
      Boolean(sub.uri) &&
      sub.fileSize > 0 &&
      sub.width >= 80 &&
      sub.height >= 80 &&
      (sub.mimeType.startsWith('image/') ||
        sub.uri.startsWith('data:image/') ||
        sub.uri.startsWith('file:') ||
        sub.uri.startsWith('content:'));

    const nowIso = new Date().toISOString();

    if (!isValidImage) {
      const reason = 'Uploaded file failed basic image dimension or format checks.';
      submissions[subIdx].status = 'REJECTED';
      submissions[subIdx].reviewedAt = nowIso;
      submissions[subIdx].rejectionReason = reason;
      await AsyncStorage.setItem(ID_SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));

      return {
        status: 'REJECTED',
        verifiedAt: null,
        rejectionReason: reason,
        extractedText: '',
        matchedFullName: false,
        matchedCompanyName: false,
        confidenceScore: 0,
      };
    }

    // Keep status honestly as UNDER_REVIEW until an HR admin reviews it
    submissions[subIdx].status = 'UNDER_REVIEW';
    submissions[subIdx].reviewedAt = null;
    submissions[subIdx].rejectionReason = null;
    await AsyncStorage.setItem(ID_SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));

    const roster = await this.getAllRosterMembers();
    const rIdx = roster.findIndex((m) => m.uid === uid && m.companyId === companyId);
    if (rIdx >= 0) {
      roster[rIdx].verificationStatus = 'UNDER_REVIEW';
      roster[rIdx].idCardSubmittedAt = sub.submittedAt;
    } else if (userProfile) {
      roster.push({
        uid: userProfile.uid,
        companyId,
        companyName: userProfile.companyName || 'Company Workspace',
        fullName: userProfile.fullName,
        email: userProfile.email,
        department: userProfile.department || 'Engineering',
        jobTitle: userProfile.jobTitle || 'Employee',
        verificationStatus: 'UNDER_REVIEW',
        verifiedAt: null,
        idCardSubmittedAt: sub.submittedAt,
        idCardVerifiedAt: null,
        todaySteps: 0,
        dailySteps: 0,
        weeklySteps: 0,
        activeCalories: 0,
        activeCaloriesKcal: 0,
        distanceKm: 0,
        lastSyncedAt: nowIso,
      });
    }
    await this.saveAllRosterMembers(roster);
    this.notifyLeaderboardListeners(companyId);

    const noteText = [
      asset?.fileName ? `File: ${asset.fileName}` : null,
      optionalNote ? `Badge ID/Note: ${optionalNote}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      status: 'UNDER_REVIEW',
      verifiedAt: null,
      rejectionReason: null,
      extractedText: noteText || 'Photo saved locally for HR review.',
      matchedFullName: false,
      matchedCompanyName: false,
      confidenceScore: 0,
    };
  }

  async syncMemberMetricsToRoster(
    userProfile,
    todaySteps,
    weeklySteps,
    activeCalories,
    distanceKm,
  ) {
    if (!userProfile.companyId) return [];

    const roster = await this.getAllRosterMembers();
    const idx = roster.findIndex(
      (m) => m.uid === userProfile.uid && m.companyId === userProfile.companyId,
    );

    const nowIso = new Date().toISOString();
    const record = {
      uid: userProfile.uid,
      companyId: userProfile.companyId,
      companyName: userProfile.companyName || 'Company Workspace',
      fullName: userProfile.fullName,
      email: userProfile.email,
      department: userProfile.department || 'Engineering',
      jobTitle: userProfile.jobTitle || 'Employee',
      verificationStatus: userProfile.verificationStatus,
      verifiedAt: userProfile.idCardVerifiedAt,
      idCardSubmittedAt: userProfile.idCardSubmittedAt,
      idCardVerifiedAt: userProfile.idCardVerifiedAt,
      todaySteps,
      dailySteps: todaySteps,
      weeklySteps: Math.max(weeklySteps, todaySteps),
      activeCalories,
      activeCaloriesKcal: activeCalories,
      distanceKm,
      lastSyncedAt: nowIso,
    };

    if (idx >= 0) {
      roster[idx] = record;
    } else {
      roster.push(record);
    }

    await this.saveAllRosterMembers(roster);
    this.notifyLeaderboardListeners(userProfile.companyId);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'ROSTER_UPDATED',
          companyId: userProfile.companyId,
        });
      } catch {
        // ignore
      }
    }

    return roster
      .filter((m) => m.companyId === userProfile.companyId)
      .sort((a, b) => b.todaySteps - a.todaySteps);
  }

  async getVerifiedCompanyLeaderboard(companyId) {
    if (!companyId) return [];
    const roster = await this.getAllRosterMembers();
    return roster
      .filter((m) => m.companyId === companyId)
      .sort((a, b) => b.todaySteps - a.todaySteps);
  }
}

export const companyService = new CompanyVerificationService();
