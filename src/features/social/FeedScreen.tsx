import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  EphemeralStoryRing,
  PostType,
  SocialPost,
  SocialProfile,
  useAlgorithmicFeed,
  useFriendRequests,
} from '../../lib/supabase';
import { CrossCompanyCarousel } from './CrossCompanyCarousel';
import { RequestsInboxModal } from './RequestsInboxModal';
import { ChatRoomScreen } from './ChatRoomScreen';
import {
  triggerHapticImpact,
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

export const FeedScreen: React.FC = () => {
  const {
    currentUser,
    posts,
    stories,
    recordDwellTime,
    toggleLike,
    toggleSave,
    votePoll,
    addComment,
    createPost,
    isPostLiked,
    isPostSaved,
    getPostDwellMs,
  } = useAlgorithmicFeed();

  const {
    incomingPending,
    getRelationshipWith,
    sendRequest,
    acceptRequest,
  } = useFriendRequests();

  const [inboxVisible, setInboxVisible] = useState(false);
  const [activeChatFriendshipId, setActiveChatFriendshipId] = useState<string | null>(
    null
  );
  const [activeChatPartner, setActiveChatPartner] = useState<SocialProfile | null>(
    null
  );

  // Story Viewer Modal
  const [selectedStory, setSelectedStory] = useState<EphemeralStoryRing | null>(
    null
  );

  // Create Post Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<PostType>('HOT_TAKE');
  const [newPostTag, setNewPostTag] = useState('Cross-Company Vibe');

  // Comment Input Drafts per Post
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(
    null
  );

  // Double-Tap Heart Burst Animation State
  const [burstPostId, setBurstPostId] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const burstScale = useRef(new Animated.Value(0)).current;

  const triggerHeartBurst = async (postId: string) => {
    await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
    toggleLike(postId, true);
    setBurstPostId(postId);
    burstScale.setValue(0.3);
    Animated.spring(burstScale, {
      toValue: 1.15,
      friction: 4,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setTimeout(() => setBurstPostId(null), 550);
    });
  };

  const handleCardPress = async (postId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[postId] || 0;
    lastTapRef.current[postId] = now;

    if (now - lastTap < 320) {
      await triggerHeartBurst(postId);
    } else {
      // Simulate viewability dwell-time signal (+2500ms) & recalculate get_ranked_feed score
      recordDwellTime(postId, 2500);
    }
  };

  const handleConnectButton = async (author: SocialProfile) => {
    const rel = getRelationshipWith(author.id);
    if (rel.status === 'ACCEPTED' && rel.record) {
      await triggerHapticSelection();
      setActiveChatFriendshipId(rel.record.id);
      setActiveChatPartner(author);
      return;
    }
    if (rel.status === 'PENDING_INCOMING' && rel.record) {
      await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
      const accepted = acceptRequest(rel.record.id);
      if (accepted) {
        setActiveChatFriendshipId(accepted.id);
        setActiveChatPartner(author);
      }
      return;
    }
    if (rel.status === 'NONE') {
      await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
      sendRequest(author.id);
      return;
    }
    setInboxVisible(true);
  };

  const handlePublishPost = async () => {
    if (!newPostContent.trim()) return;
    await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
    createPost(newPostContent, newPostType, newPostTag);
    setNewPostContent('');
    setCreateModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      {/* Top Gen-Z Dark Neon Header Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topEyebrow}>⚡ 60FPS ALGORITHMIC FEED · SUPABASE</Text>
          <Text style={styles.topTitle}>VibeNet × Cross-Company</Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.inboxBtn}
            onPress={async () => {
              await triggerHapticSelection();
              setInboxVisible(true);
            }}
          >
            <Text style={styles.inboxBtnText}>
              Requests ({incomingPending.length})
            </Text>
            {incomingPending.length > 0 && <View style={styles.neonUnreadDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await triggerHapticSelection();
              setCreateModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.postCreateBtn}
            >
              <Text style={styles.postCreateBtnText}>+ Drop Take</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Live 24-Hour Ephemeral Story Rings */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
        >
          {stories.map((story) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={async () => {
                await triggerHapticSelection();
                setSelectedStory(story);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={story.gradient}
                style={styles.storyNeonRing}
              >
                <View style={styles.storyInnerAvatar}>
                  <Text style={styles.storyAvatarText}>
                    {story.profile.avatar_url}
                  </Text>
                </View>
              </LinearGradient>
              <Text style={styles.storyCompanyTag} numberOfLines={1}>
                {story.profile.company_name}
              </Text>
              <Text style={styles.storyName} numberOfLines={1}>
                {story.profile.full_name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 2. Infinite Algorithmic Feed with Variable Reward Injection */}
        {posts.map((post: SocialPost, index: number) => {
          const liked = isPostLiked(post.id);
          const saved = isPostSaved(post.id);
          const dwellMs = getPostDwellMs(post.id);
          const rel = getRelationshipWith(post.author.id);

          let connectLabel = '+ Vibe / Connect';
          if (rel.status === 'PENDING_OUTGOING') connectLabel = 'Pending ⏳';
          else if (rel.status === 'PENDING_INCOMING') connectLabel = 'Accept ⚡';
          else if (rel.status === 'ACCEPTED') connectLabel = 'Message 💬';

          return (
            <React.Fragment key={post.id}>
              {/* Inject CrossCompanyCarousel after the 2nd post (and every 5th item) */}
              {(index === 2 || (index > 0 && (index + 1) % 5 === 0)) && (
                <CrossCompanyCarousel
                  onOpenChatWithFriendship={(fId, partner) => {
                    setActiveChatFriendshipId(fId);
                    setActiveChatPartner(partner);
                  }}
                  onOpenRequestsInbox={() => setInboxVisible(true)}
                />
              )}

              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => handleCardPress(post.id)}
                style={styles.postCard}
              >
                {/* Double-Tap Heart Burst Overlay */}
                {burstPostId === post.id && (
                  <Animated.View
                    style={[
                      styles.heartBurstOverlay,
                      { transform: [{ scale: burstScale }] },
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={styles.heartBurstEmoji}>💜</Text>
                  </Animated.View>
                )}

                {/* Post Author + Company + Seniority + One-Tap Wave/Connect */}
                <View style={styles.postHeader}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorAvatarText}>
                      {post.author.avatar_url}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{post.author.full_name}</Text>
                      <View style={styles.seniorityChip}>
                        <Text style={styles.seniorityChipText}>
                          {post.author.seniority_tier}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.authorCompanyRole}>
                      {post.author.company_name} · {post.author.role_title}
                    </Text>
                  </View>

                  {post.author.id !== currentUser.id && (
                    <TouchableOpacity
                      style={[
                        styles.connectPillBtn,
                        rel.status === 'ACCEPTED' && styles.connectPillBtnAccepted,
                      ]}
                      onPress={() => handleConnectButton(post.author)}
                    >
                      <Text style={styles.connectPillBtnText}>{connectLabel}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Algorithmic Score + Topic Tag Strip */}
                <View style={styles.algoSignalBar}>
                  <Text style={styles.topicTagPill}>#{post.topic_tag}</Text>
                  <Text style={styles.algoScoreText}>
                    ⚡ RPC Score: {post.computed_score} · Dwell:{' '}
                    {post.avg_dwell_time_sec}s (+{Math.round(dwellMs / 1000)}s you)
                  </Text>
                </View>

                {/* Post Content */}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Interactive Poll Options (if post_type === 'POLL') */}
                {post.post_type === 'POLL' && post.poll_options && (
                  <View style={styles.pollBox}>
                    {post.poll_options.map((opt) => {
                      const totalVotes = post.poll_options!.reduce(
                        (acc, item) => acc + item.votes,
                        0
                      );
                      const pct = Math.round((opt.votes / Math.max(1, totalVotes)) * 100);
                      const isVoted = post.voted_option_id === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.pollOptionBtn,
                            isVoted && styles.pollOptionBtnVoted,
                          ]}
                          onPress={async () => {
                            await triggerHapticSelection();
                            votePoll(post.id, opt.id);
                          }}
                        >
                          <Text style={styles.pollOptionLabel}>{opt.label}</Text>
                          <Text style={styles.pollOptionPct}>
                            {pct}% ({opt.votes})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Bottom Dopamine Action Bar */}
                <View style={styles.postFooterRow}>
                  <TouchableOpacity
                    style={[styles.actionPill, liked && styles.actionPillLiked]}
                    onPress={async () => {
                      await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      toggleLike(post.id);
                    }}
                  >
                    <Text style={styles.actionPillText}>
                      {liked ? '💜' : '🤍'} {post.likes_count}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={async () => {
                      await triggerHapticSelection();
                      setExpandedCommentsPostId((prev) =>
                        prev === post.id ? null : post.id
                      );
                    }}
                  >
                    <Text style={styles.actionPillText}>
                      💬 {post.comments_count}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={async () => {
                      await triggerHapticSelection();
                      recordDwellTime(post.id, 3000);
                    }}
                  >
                    <Text style={styles.actionPillText}>
                      ⏱ +3s Dwell Boost
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionPill, saved && styles.actionPillSaved]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      toggleSave(post.id);
                    }}
                  >
                    <Text style={styles.actionPillText}>
                      {saved ? '🔖 Saved' : '🔖 Save'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Inline Comments Preview & Input */}
                {(expandedCommentsPostId === post.id ||
                  post.comments_preview.length > 0) && (
                  <View style={styles.commentsSection}>
                    {post.comments_preview.map((c) => (
                      <Text key={c.id} style={styles.commentLine}>
                        <Text style={styles.commentAuthor}>
                          {c.author_name} ({c.author_company}):{' '}
                        </Text>
                        {c.text}
                      </Text>
                    ))}

                    <View style={styles.commentInputRow}>
                      <TextInput
                        style={styles.commentInput}
                        value={commentDrafts[post.id] || ''}
                        onChangeText={(txt) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: txt }))
                        }
                        placeholder="Add a cross-company reply..."
                        placeholderTextColor="#71717A"
                      />
                      <TouchableOpacity
                        style={styles.commentSendBtn}
                        onPress={async () => {
                          const txt = commentDrafts[post.id];
                          if (!txt?.trim()) return;
                          await triggerHapticSelection();
                          addComment(post.id, txt);
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                        }}
                      >
                        <Text style={styles.commentSendText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* Requests Inbox Realtime Drawer */}
      <RequestsInboxModal
        visible={inboxVisible}
        onClose={() => setInboxVisible(false)}
        onOpenChat={(friendshipId, partner) => {
          setActiveChatFriendshipId(friendshipId);
          setActiveChatPartner(partner);
        }}
      />

      {/* 1-on-1 Cross-Company Realtime Chat Modal */}
      <ChatRoomScreen
        visible={activeChatFriendshipId !== null}
        friendshipId={activeChatFriendshipId}
        partner={activeChatPartner}
        onClose={() => setActiveChatFriendshipId(null)}
      />

      {/* 24-Hour Ephemeral Story Viewer Modal */}
      <Modal
        visible={selectedStory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedStory(null)}
      >
        <View style={styles.modalBackdrop}>
          {selectedStory && (
            <LinearGradient
              colors={selectedStory.gradient}
              style={styles.storyModalCard}
            >
              <View style={styles.storyModalHeader}>
                <Text style={styles.storyModalAuthor}>
                  {selectedStory.profile.full_name} ·{' '}
                  {selectedStory.profile.company_name} (
                  {selectedStory.profile.seniority_tier})
                </Text>
                <TouchableOpacity onPress={() => setSelectedStory(null)}>
                  <Text style={styles.storyCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.storyModalHeadline}>
                {selectedStory.headline}
              </Text>
              <Text style={styles.storyModalBody}>
                {selectedStory.media_caption}
              </Text>
              <TouchableOpacity
                style={styles.storyConnectBtn}
                onPress={() => {
                  const author = selectedStory.profile;
                  setSelectedStory(null);
                  handleConnectButton(author);
                }}
              >
                <Text style={styles.storyConnectBtnText}>
                  Wave / Connect with {selectedStory.profile.full_name.split(' ')[0]} ⚡
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>
      </Modal>

      {/* Drop Hot Take / Create Post Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.createModalCard}>
            <View style={styles.storyModalHeader}>
              <Text style={styles.createModalTitle}>Drop a Cross-Company Post</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.storyCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.postTypeRow}>
              {(['HOT_TAKE', 'WIN', 'UPDATE'] as PostType[]).map((pt) => {
                const active = newPostType === pt;
                return (
                  <TouchableOpacity
                    key={pt}
                    style={[
                      styles.postTypeChip,
                      active && styles.postTypeChipActive,
                    ]}
                    onPress={() => setNewPostType(pt)}
                  >
                    <Text style={styles.postTypeChipText}>{pt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.createInput}
              value={newPostTag}
              onChangeText={setNewPostTag}
              placeholder="Topic tag (e.g. AI UX, 60fps Craft)"
              placeholderTextColor="#71717A"
            />

            <TextInput
              style={[styles.createInput, { minHeight: 80, marginTop: 8 }]}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              placeholder="Share a win, spicy take, or question across all companies..."
              placeholderTextColor="#71717A"
            />

            <TouchableOpacity onPress={handlePublishPost} style={{ marginTop: 12 }}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.publishBtn}
              >
                <Text style={styles.publishBtnText}>Publish to Algorithmic Feed 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: 20,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  topEyebrow: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#A855F7',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inboxBtn: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    position: 'relative',
  },
  inboxBtnText: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '700',
  },
  neonUnreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC4899',
  },
  postCreateBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
  },
  postCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  storiesRow: {
    gap: 12,
    paddingBottom: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  storyNeonRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyInnerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
  },
  storyCompanyTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#A855F7',
    marginTop: 4,
  },
  storyName: {
    fontSize: 10,
    color: '#E4E4E7',
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: '#121216',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 14,
    position: 'relative',
  },
  heartBurstOverlay: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    zIndex: 20,
  },
  heartBurstEmoji: {
    fontSize: 54,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272A',
    borderWidth: 1.5,
    borderColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '800',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  seniorityChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  seniorityChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#67E8F9',
  },
  authorCompanyRole: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 1,
  },
  connectPillBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  connectPillBtnAccepted: {
    backgroundColor: '#06B6D4',
  },
  connectPillBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  algoSignalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  topicTagPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EC4899',
  },
  algoScoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  postContent: {
    fontSize: 13,
    color: '#F4F4F5',
    lineHeight: 19,
    marginBottom: 12,
  },
  pollBox: {
    gap: 6,
    marginBottom: 12,
  },
  pollOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pollOptionBtnVoted: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
  },
  pollOptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  pollOptionPct: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A855F7',
  },
  postFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionPill: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionPillLiked: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  actionPillSaved: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  commentsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    gap: 6,
  },
  commentLine: {
    fontSize: 11,
    color: '#D4D4D8',
  },
  commentAuthor: {
    fontWeight: '800',
    color: '#FAFAFA',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#FAFAFA',
  },
  commentSendBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
  },
  commentSendText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  storyModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
  },
  storyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  storyModalAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  storyCloseText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  storyModalHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  storyModalBody: {
    fontSize: 13,
    color: '#F4F4F5',
    lineHeight: 19,
    marginBottom: 18,
  },
  storyConnectBtn: {
    backgroundColor: '#09090B',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  storyConnectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  createModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121216',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  createModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  postTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  postTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  postTypeChipActive: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  postTypeChipText: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '800',
  },
  createInput: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: '#FAFAFA',
  },
  publishBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

