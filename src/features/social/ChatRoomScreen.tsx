import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  CURRENT_USER_PROFILE,
  SocialProfile,
  useRealtimeChat,
} from '../../lib/supabase';
import {
  triggerHapticImpact,
  triggerHapticSelection,
} from '../../utils/haptics';

interface ChatRoomScreenProps {
  visible: boolean;
  friendshipId: string | null;
  partner: SocialProfile | null;
  onClose: () => void;
}

const REACTION_EMOJIS = ['🔥', '⚡', '💜', '🚀'];

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  visible,
  friendshipId,
  partner,
  onClose,
}) => {
  const {
    rlsAllowed,
    rlsError,
    messages,
    typingUser,
    sendMessage,
    reactToMessage,
  } = useRealtimeChat(friendshipId);

  const [draft, setDraft] = useState('');

  // Generate Smart Hierarchy Icebreakers when Junior/Mid connects with Senior/Exec across companies
  const smartIcebreakers = partner
    ? [
        `Hey ${partner.full_name.split(' ')[0]}! Loved your recent take on ${
          partner.interests[0] || 'Product Craft'
        } 🔥`,
        `Quick question from a fellow ${CURRENT_USER_PROFILE.seniority_tier} builder at ${CURRENT_USER_PROFILE.company_name} 👋`,
        `Would love a 15-min coffee chat on how ${partner.company_name} approaches ${
          partner.interests[1] || 'scale'
        } ☕`,
      ]
    : [];

  const handleSend = async (customText?: string) => {
    const textToSend = customText ?? draft;
    if (!textToSend.trim()) return;
    await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Light);
    const res = sendMessage(textToSend);
    if (res.ok && !customText) {
      setDraft('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Top Realtime Presence Header */}
          <View style={styles.header}>
            <View style={styles.partnerRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {partner?.avatar_url || '💬'}
                </Text>
                <View style={styles.presenceDot} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.partnerName}>
                    {partner?.full_name || 'Cross-Company Chat'}
                  </Text>
                  {partner && (
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierBadgeText}>
                        {partner.seniority_tier}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.partnerMeta}>
                  {partner
                    ? `${partner.company_name} · ${partner.role_title}`
                    : 'Supabase Realtime Presence Active'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Database RLS Verification Banner */}
          <View
            style={[
              styles.rlsBanner,
              !rlsAllowed && styles.rlsBannerBlocked,
            ]}
          >
            <Text style={styles.rlsBannerText}>
              {rlsAllowed
                ? `🔒 RLS Policy Verified: friend_requests.status = 'ACCEPTED' (${CURRENT_USER_PROFILE.company_name} ↔ ${partner?.company_name})`
                : rlsError || '403 RLS Blocked: Friendship must be ACCEPTED'}
            </Text>
          </View>

          {/* Messages Feed */}
          <ScrollView
            style={styles.messagesScroll}
            contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isMine = msg.sender_id === CURRENT_USER_PROFILE.id;
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.msgWrap,
                    isMine ? styles.msgWrapRight : styles.msgWrapLeft,
                  ]}
                >
                  <View
                    style={[
                      styles.msgBubble,
                      isMine ? styles.msgBubbleMine : styles.msgBubblePartner,
                    ]}
                  >
                    <Text style={styles.msgText}>{msg.content}</Text>
                    <View style={styles.msgFooter}>
                      <Text style={styles.msgTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {msg.is_read ? '✓✓ Seen' : '✓ Sent'}
                      </Text>
                      {msg.reaction && (
                        <View style={styles.activeReactionPill}>
                          <Text style={{ fontSize: 11 }}>{msg.reaction}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Quick Reaction Tap Bar */}
                  <View style={styles.reactionBar}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={async () => {
                          await triggerHapticSelection();
                          reactToMessage(msg.id, emoji);
                        }}
                        style={styles.reactionMiniBtn}
                      >
                        <Text style={{ fontSize: 10 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

            {typingUser && (
              <View style={styles.typingPill}>
                <Text style={styles.typingText}>
                  ⚡ {typingUser} is typing via Supabase Broadcast...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Smart Hierarchy Icebreakers (Clickable Neon Pills Above Keyboard) */}
          {rlsAllowed && smartIcebreakers.length > 0 && (
            <View style={styles.icebreakersSection}>
              <Text style={styles.icebreakerLabel}>
                ✨ SMART HIERARCHY ICEBREAKERS ({CURRENT_USER_PROFILE.seniority_tier} →{' '}
                {partner?.seniority_tier})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.icebreakerRow}
              >
                {smartIcebreakers.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => handleSend(prompt)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(168,85,247,0.22)', 'rgba(6,182,212,0.22)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.icebreakerPill}
                    >
                      <Text style={styles.icebreakerText}>{prompt}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Message Input Bar */}
          {rlsAllowed && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={`Message ${partner?.full_name || 'colleague'}...`}
                placeholderTextColor="#71717A"
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  style={styles.sendBtn}
                >
                  <Text style={styles.sendBtnText}>Send ⚡</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  container: {
    width: '100%',
    maxWidth: 406,
    maxHeight: 680,
    backgroundColor: '#09090B',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#18181B',
    borderWidth: 2,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
  },
  presenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#09090B',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  tierBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  partnerMeta: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  rlsBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  rlsBannerBlocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  rlsBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  messagesScroll: {
    flex: 1,
    marginVertical: 6,
  },
  msgWrap: {
    maxWidth: '85%',
  },
  msgWrapRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgWrapLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgBubble: {
    borderRadius: 18,
    padding: 12,
  },
  msgBubbleMine: {
    backgroundColor: '#6D28D9',
  },
  msgBubblePartner: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  msgText: {
    color: '#FAFAFA',
    fontSize: 12,
    lineHeight: 18,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 8,
  },
  msgTime: {
    fontSize: 9,
    color: '#D4D4D8',
  },
  activeReactionPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  reactionBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  reactionMiniBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typingPill: {
    backgroundColor: '#18181B',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typingText: {
    fontSize: 10,
    color: '#06B6D4',
    fontWeight: '700',
  },
  icebreakersSection: {
    marginBottom: 10,
  },
  icebreakerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: '#A855F7',
    marginBottom: 6,
  },
  icebreakerRow: {
    gap: 8,
  },
  icebreakerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  icebreakerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F3E8FF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#FAFAFA',
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

