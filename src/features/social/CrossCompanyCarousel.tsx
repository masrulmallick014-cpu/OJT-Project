import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  SocialProfile,
  useFriendRequests,
} from '../../lib/supabase';
import {
  triggerHapticImpact,
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

interface CrossCompanyCarouselProps {
  onOpenChatWithFriendship: (friendshipId: string, partner: SocialProfile) => void;
  onOpenRequestsInbox: () => void;
}

const SENIORITY_BADGE_COLORS: Record<
  SocialProfile['seniority_tier'],
  { bg: string; border: string; text: string }
> = {
  EXEC: { bg: 'rgba(168, 85, 247, 0.2)', border: '#A855F7', text: '#E9D5FF' },
  SENIOR: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06B6D4', text: '#CFFAFE' },
  MID: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', text: '#D1FAE5' },
  JUNIOR: { bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', text: '#FEF3C7' },
};

export const CrossCompanyCarousel: React.FC<CrossCompanyCarouselProps> = ({
  onOpenChatWithFriendship,
  onOpenRequestsInbox,
}) => {
  const {
    profiles,
    getRelationshipWith,
    sendRequest,
    acceptRequest,
  } = useFriendRequests();

  const handleActionPress = async (profile: SocialProfile) => {
    const rel = getRelationshipWith(profile.id);

    if (rel.status === 'ACCEPTED' && rel.record) {
      await triggerHapticSelection();
      onOpenChatWithFriendship(rel.record.id, profile);
      return;
    }

    if (rel.status === 'PENDING_INCOMING' && rel.record) {
      await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
      const accepted = acceptRequest(rel.record.id);
      if (accepted) {
        onOpenChatWithFriendship(accepted.id, profile);
      }
      return;
    }

    if (rel.status === 'NONE') {
      await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
      sendRequest(profile.id);
      return;
    }

    await triggerHapticSelection();
    onOpenRequestsInbox();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>⚡ VARIABLE REWARD · HIERARCHY-FREE BRIDGE</Text>
          <Text style={styles.title}>Cross-Company Vibe Check</Text>
          <Text style={styles.subtitle}>
            Skip cold emails — connect 1-on-1 with Junior, Senior & Exec builders across companies
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {profiles.map((profile) => {
          const rel = getRelationshipWith(profile.id);
          const tierColor = SENIORITY_BADGE_COLORS[profile.seniority_tier];

          let buttonLabel = '+ Vibe / Connect';
          let buttonGradient: readonly [string, string] = ['#8B5CF6', '#EC4899'];

          if (rel.status === 'PENDING_OUTGOING') {
            buttonLabel = 'Pending ⏳';
            buttonGradient = ['#27272A', '#3F3F46'];
          } else if (rel.status === 'PENDING_INCOMING') {
            buttonLabel = 'Accept Vibe ⚡';
            buttonGradient = ['#10B981', '#059669'];
          } else if (rel.status === 'ACCEPTED') {
            buttonLabel = 'Message 💬';
            buttonGradient = ['#06B6D4', '#3B82F6'];
          }

          return (
            <View key={profile.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{profile.avatar_url}</Text>
                  </View>
                  {profile.is_online && <View style={styles.onlineDot} />}
                </View>

                <View
                  style={[
                    styles.tierBadge,
                    {
                      backgroundColor: tierColor.bg,
                      borderColor: tierColor.border,
                    },
                  ]}
                >
                  <Text style={[styles.tierBadgeText, { color: tierColor.text }]}>
                    {profile.seniority_tier}
                  </Text>
                </View>
              </View>

              <Text style={styles.name} numberOfLines={1}>
                {profile.full_name}
              </Text>
              <Text style={styles.companyRole} numberOfLines={1}>
                {profile.company_name} · {profile.role_title}
              </Text>

              <View style={styles.vibePill}>
                <Text style={styles.vibePillText}>{profile.vibe_status}</Text>
              </View>

              <View style={styles.interestsRow}>
                {profile.interests.slice(0, 2).map((tag) => (
                  <View key={tag} style={styles.interestChip}>
                    <Text style={styles.interestChipText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => handleActionPress(profile)}
                activeOpacity={0.85}
                style={styles.actionTouch}
              >
                <LinearGradient
                  colors={buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>{buttonLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121216',
    borderRadius: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 14,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#A855F7',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FAFAFA',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 12,
  },
  card: {
    width: 196,
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#18181B',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  companyRole: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  vibePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  vibePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
    marginBottom: 12,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  interestChipText: {
    fontSize: 9,
    color: '#A1A1AA',
  },
  actionTouch: {
    marginTop: 'auto',
  },
  actionBtn: {
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

