import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  SocialProfile,
  useFriendRequests,
} from '../../lib/supabase';
import {
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

interface RequestsInboxModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenChat: (friendshipId: string, partner: SocialProfile) => void;
}

export const RequestsInboxModal: React.FC<RequestsInboxModalProps> = ({
  visible,
  onClose,
  onOpenChat,
}) => {
  const {
    incomingPending,
    acceptedFriendships,
    acceptRequest,
    declineRequest,
  } = useFriendRequests();

  const [celebrationBanner, setCelebrationBanner] = useState<string | null>(null);

  const handleAccept = async (requestId: string, sender: SocialProfile) => {
    await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
    const updated = acceptRequest(requestId);
    setCelebrationBanner(
      `🎉 Connected with ${sender.full_name} (${sender.company_name} · ${sender.seniority_tier})! 1-on-1 RLS Chat Unlocked.`
    );
    setTimeout(() => setCelebrationBanner(null), 4000);
    if (updated) {
      // Allow user to jump straight into chat or stay
    }
  };

  const handleDecline = async (requestId: string) => {
    await triggerHapticSelection();
    declineRequest(requestId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>
                SUPABASE REALTIME · CHANNEL('friend_requests')
              </Text>
              <Text style={styles.title}>Cross-Company Vibe Requests</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {celebrationBanner && (
            <LinearGradient
              colors={['#10B981', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.celebrationBox}
            >
              <Text style={styles.celebrationText}>{celebrationBanner}</Text>
            </LinearGradient>
          )}

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>
              INCOMING REQUESTS ({incomingPending.length})
            </Text>

            {incomingPending.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No pending incoming requests right now. Wave at builders in the feed!
                </Text>
              </View>
            ) : (
              incomingPending.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{req.sender.avatar_url}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameTierRow}>
                      <Text style={styles.name}>{req.sender.full_name}</Text>
                      <View style={styles.tierChip}>
                        <Text style={styles.tierChipText}>
                          {req.sender.seniority_tier}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.companySub}>
                      {req.sender.company_name} · {req.sender.role_title}
                    </Text>
                    <Text style={styles.vibeLine}>{req.sender.vibe_status}</Text>
                  </View>

                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(req.id, req.sender)}
                    >
                      <Text style={styles.acceptBtnText}>Accept ⚡</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleDecline(req.id)}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
              UNLOCKED CROSS-COMPANY CONNECTIONS ({acceptedFriendships.length})
            </Text>

            {acceptedFriendships.map((fr) => {
              const partner =
                fr.sender_id === 'usr-alex-01' ? fr.receiver : fr.sender;
              return (
                <View key={fr.id} style={styles.requestCard}>
                  <View style={[styles.avatarCircle, { borderColor: '#10B981' }]}>
                    <Text style={styles.avatarText}>{partner.avatar_url}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{partner.full_name}</Text>
                    <Text style={styles.companySub}>
                      {partner.company_name} · {partner.role_title} ({partner.seniority_tier})
                    </Text>
                    <Text style={styles.rlsVerifiedTag}>
                      ✓ RLS status = 'ACCEPTED' · Direct Chat Unlocked
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => {
                      onClose();
                      onOpenChat(fr.id, partner);
                    }}
                  >
                    <Text style={styles.messageBtnText}>Message 💬</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121216',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#A855F7',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FAFAFA',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  celebrationBox: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  celebrationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  emptyBox: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  emptyText: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 8,
    gap: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  nameTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  tierChip: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  companySub: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  vibeLine: {
    fontSize: 10,
    color: '#06B6D4',
    marginTop: 2,
  },
  rlsVerifiedTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 3,
  },
  actionsCol: {
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  declineBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  messageBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  messageBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

