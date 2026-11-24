import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { ForumPostKind, TipCategoryTag } from '../../types';
import { Icon } from '../../components/common/Icon';
import { FeedScreen } from '../social/FeedScreen';
import {
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

type CommunitySubTab = 'feed' | 'chats' | 'difficulties' | 'tips';

const TIP_CATEGORIES: TipCategoryTag[] = [
  'Productivity',
  'Coding & Tech',
  'Time Management',
  'Work-Life Balance',
  'Communication',
];

export const CommunityScreen: React.FC = () => {
  const {
    employee,
    chatRooms,
    chatMessages,
    forumPosts,
    sendChatMessage,
    createForumPost,
    upvoteForumPost,
    addForumReply,
    upvoteForumReply,
    markReplyAsAcceptedSolution,
  } = useWellness();

  const [subTab, setSubTab] = useState<CommunitySubTab>('chats');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-my-office');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [selectedTipCatFilter, setSelectedTipCatFilter] = useState<
    'All' | TipCategoryTag
  >('All');

  // Create Post Modal (for Difficulties/Ideas or Work Tips/Q&A)
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postKind, setPostKind] = useState<ForumPostKind>('WORK_DIFFICULTY');
  const [postCategory, setPostCategory] = useState<TipCategoryTag>('Work-Life Balance');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3000);
  };

  const activeRoom =
    chatRooms.find((r) => r.id === selectedRoomId) || chatRooms[0];

  const filteredRooms = chatRooms.filter(
    (r) =>
      r.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const roomMessages = chatMessages.filter((m) => m.roomId === activeRoom.id);

  const handleSendMessage = async () => {
    if (!messageDraft.trim()) return;
    await triggerHapticSelection();
    sendChatMessage(activeRoom.id, messageDraft);
    setMessageDraft('');
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postBody.trim()) {
      showToast('Please enter a title and description.');
      return;
    }
    await triggerHapticNotification();
    createForumPost({
      kind: postKind,
      category: postCategory,
      title: postTitle,
      body: postBody,
      isAnonymous: postAnonymous,
    });
    setPostTitle('');
    setPostBody('');
    setPostAnonymous(false);
    setPostModalVisible(false);
    showToast('Published to the Community board!');
  };

  const handleSendReply = async (postId: string) => {
    const draft = replyDrafts[postId]?.trim();
    if (!draft) return;
    await triggerHapticSelection();
    addForumReply(postId, draft);
    setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
    showToast('Reply posted!');
  };

  const difficultiesAndIdeasPosts = forumPosts.filter(
    (p) => p.kind === 'WORK_DIFFICULTY' || p.kind === 'IDEA'
  );

  const tipsAndQaPosts = forumPosts.filter(
    (p) =>
      (p.kind === 'PROFESSIONAL_TIP' || p.kind === 'NEED_HELP_QA') &&
      (selectedTipCatFilter === 'All' || p.category === selectedTipCatFilter)
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {toastMsg && (
          <View style={styles.toastBanner}>
            <Icon name="check" size={14} color={colors.primary} />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Community & tips hub.</Text>
            <Text style={styles.pageSubtitle}>
              1-on-1 DMs, office & inter-office groups, difficulties support & work Q&A.
            </Text>
          </View>
          {subTab !== 'chats' && (
            <TouchableOpacity
              style={styles.newPostBtn}
              onPress={async () => {
                await triggerHapticSelection();
                setPostKind(
                  subTab === 'difficulties' ? 'WORK_DIFFICULTY' : 'PROFESSIONAL_TIP'
                );
                setPostCategory(
                  subTab === 'difficulties' ? 'Work-Life Balance' : 'Productivity'
                );
                setPostModalVisible(true);
              }}
            >
              <Icon name="plus" size={13} color="#FFFFFF" />
              <Text style={styles.newPostBtnText}>New Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 4-Tab Sub-Navigation Bar (Includes Gen-Z Algorithmic Feed + Chats + Difficulties + Tips) */}
        <View style={styles.subTabsBar}>
          {[
            { key: 'feed' as const, label: '⚡ Vibe Feed' },
            { key: 'chats' as const, label: 'Chats & Groups' },
            { key: 'difficulties' as const, label: 'Difficulties & Ideas' },
            { key: 'tips' as const, label: 'Work Tips & Q&A' },
          ].map((tab) => {
            const active = subTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.subTabBtn, active && styles.subTabBtnActive]}
                onPress={async () => {
                  await triggerHapticSelection();
                  setSubTab(tab.key);
                }}
              >
                <Text
                  style={[
                    styles.subTabText,
                    active && styles.subTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================================================================= */}
        {/* SUB-TAB 0: GEN-Z 60FPS ALGORITHMIC INFINITE FEED & VIBE CHECK     */}
        {/* ================================================================= */}
        {subTab === 'feed' && <FeedScreen />}

        {/* ================================================================= */}
        {/* SUB-TAB 1: 1-ON-1 DMs, MY OFFICE GROUP & INTER-OFFICE GROUPS      */}
        {/* ================================================================= */}
        {subTab === 'chats' && (
          <View>
            {/* Colleague / Channel Search */}
            <TextInput
              style={styles.searchInput}
              value={chatSearchQuery}
              onChangeText={setChatSearchQuery}
              placeholder="Search My Office, Inter-Office Groups, or 1-on-1 Colleagues..."
              placeholderTextColor={colors.textMuted}
            />

            {/* Horizontal Channel Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomsScrollRow}
            >
              {filteredRooms.map((room) => {
                const selected = room.id === activeRoom.id;
                const badgeLabel =
                  room.type === 'OFFICE_GROUP'
                    ? 'MY OFFICE'
                    : room.type === 'INTER_OFFICE_GROUP'
                    ? 'INTER-OFFICE'
                    : '1-ON-1 DM';
                return (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      styles.roomChipCard,
                      selected && styles.roomChipCardActive,
                    ]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      setSelectedRoomId(room.id);
                    }}
                  >
                    <View style={styles.roomChipTopRow}>
                      <Text
                        style={[
                          styles.roomTypeBadge,
                          selected && { color: '#FFFFFF' },
                        ]}
                      >
                        {badgeLabel}
                      </Text>
                      <Text
                        style={[
                          styles.roomOnlineCount,
                          selected && { color: '#DFECE2' },
                        ]}
                      >
                        ● {room.onlineCount}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.roomChipName,
                        selected && { color: '#FFFFFF' },
                      ]}
                      numberOfLines={1}
                    >
                      {room.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active Chat Thread Window */}
            <View style={styles.chatWindowCard}>
              <View style={styles.chatHeaderBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatHeaderTitle}>{activeRoom.name}</Text>
                  <Text style={styles.chatHeaderSub}>{activeRoom.subtitle}</Text>
                </View>
                <View style={styles.wsLiveBadge}>
                  <View style={styles.wsGreenDot} />
                  <Text style={styles.wsLiveText}>Socket.io Live</Text>
                </View>
              </View>

              <View style={styles.messagesContainer}>
                {roomMessages.map((msg) => {
                  const isMine = msg.senderId === employee.id;
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageRow,
                        isMine ? styles.messageRowRight : styles.messageRowLeft,
                      ]}
                    >
                      {!isMine && (
                        <View style={styles.msgAvatar}>
                          <Text style={styles.msgAvatarText}>
                            {msg.senderInitials}
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.messageBubble,
                          isMine
                            ? styles.messageBubbleMine
                            : styles.messageBubbleOther,
                        ]}
                      >
                        {!isMine && (
                          <Text style={styles.msgSenderName}>
                            {msg.senderName} · {msg.senderOffice.split('·')[0].trim()}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.msgText,
                            isMine && { color: '#FFFFFF' },
                          ]}
                        >
                          {msg.text}
                        </Text>
                        <Text
                          style={[
                            styles.msgMeta,
                            isMine && { color: '#DFECE2' },
                          ]}
                        >
                          {msg.timestamp} · ✓✓ Read ({msg.readByCount})
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {activeRoom.typingUser && (
                  <Text style={styles.typingIndicatorText}>
                    💬 {activeRoom.typingUser} is typing...
                  </Text>
                )}
              </View>

              {/* Message Composer Input + Send Button */}
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                  placeholder={`Message ${activeRoom.name}...`}
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleSendMessage}
                  accessibilityLabel="Send chat message"
                >
                  <Icon name="send" size={15} color="#FFFFFF" />
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB 2: IDEATION & WORKPLACE DIFFICULTIES SUPPORT BOARD        */}
        {/* ================================================================= */}
        {subTab === 'difficulties' && (
          <View>
            <View style={styles.psychSafetyBanner}>
              <Icon name="shield" size={16} color={colors.primary} />
              <Text style={styles.psychSafetyText}>
                Psychological Safety Enabled: Toggle "Post Anonymously" when sharing
                workload stress or workplace blockers.
              </Text>
            </View>

            {difficultiesAndIdeasPosts.map((post) => {
              const hasUpvoted = post.upvotedByIds.includes(employee.id);
              return (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postTopMetaRow}>
                    <View
                      style={[
                        styles.kindBadge,
                        post.kind === 'WORK_DIFFICULTY'
                          ? styles.kindBadgeDifficulty
                          : styles.kindBadgeIdea,
                      ]}
                    >
                      <Text style={styles.kindBadgeText}>
                        {post.kind === 'WORK_DIFFICULTY'
                          ? '🤝 WORK DIFFICULTY / BLOCKER'
                          : '💡 OFFICE IDEA'}
                      </Text>
                    </View>
                    <Text style={styles.postCategoryTag}>{post.category}</Text>
                    <Text style={styles.postTimeText}>{post.createdAt}</Text>
                  </View>

                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postBody}>{post.body}</Text>
                  <Text style={styles.postAuthorLine}>
                    Posted by {post.isAnonymous ? '🔒 Anonymous Colleague' : post.authorName} ·{' '}
                    {post.authorOffice}
                  </Text>

                  <View style={styles.postActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.upvotePill,
                        hasUpvoted && styles.upvotePillActive,
                      ]}
                      onPress={() => upvoteForumPost(post.id)}
                    >
                      <Text
                        style={[
                          styles.upvotePillText,
                          hasUpvoted && { color: '#FFFFFF' },
                        ]}
                      >
                        ▲ {post.upvotes} Upvotes
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.repliesCountText}>
                      {post.replies.length} peer replies
                    </Text>
                  </View>

                  {/* Replies List */}
                  {post.replies.map((reply) => (
                    <View
                      key={reply.id}
                      style={[
                        styles.replyBox,
                        reply.isAcceptedSolution && styles.replyBoxAccepted,
                      ]}
                    >
                      <View style={styles.replyHeaderRow}>
                        <Text style={styles.replyAuthor}>
                          {reply.authorName} ({reply.authorOffice.split('·')[0].trim()})
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.acceptSolutionBtn,
                            reply.isAcceptedSolution &&
                              styles.acceptSolutionBtnActive,
                          ]}
                          onPress={async () => {
                            await triggerHapticNotification();
                            markReplyAsAcceptedSolution(post.id, reply.id);
                          }}
                        >
                          <Text
                            style={[
                              styles.acceptSolutionBtnText,
                              reply.isAcceptedSolution && { color: '#FFFFFF' },
                            ]}
                          >
                            {reply.isAcceptedSolution
                              ? '✅ Accepted Solution'
                              : 'Mark Solution'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.replyContent}>{reply.content}</Text>
                    </View>
                  ))}

                  {/* Quick Reply Input */}
                  <View style={styles.replyComposerRow}>
                    <TextInput
                      style={styles.replyInput}
                      value={replyDrafts[post.id] || ''}
                      onChangeText={(txt) =>
                        setReplyDrafts((prev) => ({ ...prev, [post.id]: txt }))
                      }
                      placeholder="Share supportive advice or a solution..."
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.replySendBtn}
                      onPress={() => handleSendReply(post.id)}
                    >
                      <Text style={styles.replySendBtnText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB 3: PROFESSIONAL WORK TIPS, TRICKS & PROBLEM-SOLVING Q&A   */}
        {/* ================================================================= */}
        {subTab === 'tips' && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tipCatRow}
            >
              {(['All', ...TIP_CATEGORIES] as Array<'All' | TipCategoryTag>).map(
                (cat) => {
                  const active = selectedTipCatFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.tipCatChip,
                        active && styles.tipCatChipActive,
                      ]}
                      onPress={() => setSelectedTipCatFilter(cat)}
                    >
                      <Text
                        style={[
                          styles.tipCatChipText,
                          active && styles.tipCatChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {tipsAndQaPosts.map((post) => {
              const hasUpvoted = post.upvotedByIds.includes(employee.id);
              return (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postTopMetaRow}>
                    <View
                      style={[
                        styles.kindBadge,
                        post.kind === 'PROFESSIONAL_TIP'
                          ? styles.kindBadgeIdea
                          : styles.kindBadgeDifficulty,
                      ]}
                    >
                      <Text style={styles.kindBadgeText}>
                        {post.kind === 'PROFESSIONAL_TIP'
                          ? '⚡ PRO WORK TIP & TRICK'
                          : '❓ NEED HELP / SUGGESTION'}
                      </Text>
                    </View>
                    <Text style={styles.postCategoryTag}>{post.category}</Text>
                  </View>

                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postBody}>{post.body}</Text>
                  <Text style={styles.postAuthorLine}>
                    By {post.authorName} · {post.authorOffice}
                  </Text>

                  <View style={styles.postActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.upvotePill,
                        hasUpvoted && styles.upvotePillActive,
                      ]}
                      onPress={() => upvoteForumPost(post.id)}
                    >
                      <Text
                        style={[
                          styles.upvotePillText,
                          hasUpvoted && { color: '#FFFFFF' },
                        ]}
                      >
                        ▲ {post.upvotes} Helpful
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {post.replies.map((reply) => (
                    <View
                      key={reply.id}
                      style={[
                        styles.replyBox,
                        reply.isAcceptedSolution && styles.replyBoxAccepted,
                      ]}
                    >
                      <View style={styles.replyHeaderRow}>
                        <Text style={styles.replyAuthor}>{reply.authorName}</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.replyUpvoteMini}
                            onPress={() => upvoteForumReply(post.id, reply.id)}
                          >
                            <Text style={styles.replyUpvoteMiniText}>
                              ▲ {reply.upvotes}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.acceptSolutionBtn,
                              reply.isAcceptedSolution &&
                                styles.acceptSolutionBtnActive,
                            ]}
                            onPress={async () => {
                              await triggerHapticNotification();
                              markReplyAsAcceptedSolution(post.id, reply.id);
                              showToast('Toggled Accepted Solution badge!');
                            }}
                          >
                            <Text
                              style={[
                                styles.acceptSolutionBtnText,
                                reply.isAcceptedSolution && { color: '#FFFFFF' },
                              ]}
                            >
                              {reply.isAcceptedSolution
                                ? '✅ Accepted Solution'
                                : 'Mark Accepted Solution'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.replyContent}>{reply.content}</Text>
                    </View>
                  ))}

                  <View style={styles.replyComposerRow}>
                    <TextInput
                      style={styles.replyInput}
                      value={replyDrafts[post.id] || ''}
                      onChangeText={(txt) =>
                        setReplyDrafts((prev) => ({ ...prev, [post.id]: txt }))
                      }
                      placeholder="Add a concrete tip or solution..."
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.replySendBtn}
                      onPress={() => handleSendReply(post.id)}
                    >
                      <Text style={styles.replySendBtnText}>Post Solution</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ================================================================= */}
      {/* CREATE NEW COMMUNITY POST MODAL                                   */}
      {/* ================================================================= */}
      <Modal
        visible={postModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPostModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Community Post</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setPostModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>POST TYPE</Text>
            <View style={styles.kindChipsWrap}>
              {(
                [
                  { k: 'WORK_DIFFICULTY', label: 'Work Difficulty' },
                  { k: 'IDEA', label: 'Office Idea' },
                  { k: 'PROFESSIONAL_TIP', label: 'Pro Work Tip' },
                  { k: 'NEED_HELP_QA', label: 'Need Help Q&A' },
                ] as Array<{ k: ForumPostKind; label: string }>
              ).map((item) => {
                const active = postKind === item.k;
                return (
                  <TouchableOpacity
                    key={item.k}
                    style={[
                      styles.tipCatChip,
                      active && styles.tipCatChipActive,
                    ]}
                    onPress={() => setPostKind(item.k)}
                  >
                    <Text
                      style={[
                        styles.tipCatChipText,
                        active && styles.tipCatChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>CATEGORY TAG</Text>
            <View style={styles.kindChipsWrap}>
              {TIP_CATEGORIES.map((cat) => {
                const active = postCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.tipCatChip,
                      active && styles.tipCatChipActive,
                    ]}
                    onPress={() => setPostCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.tipCatChipText,
                        active && styles.tipCatChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput
              style={styles.input}
              value={postTitle}
              onChangeText={setPostTitle}
              placeholder="Summarize your tip, idea, or difficulty..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>DETAILS</Text>
            <TextInput
              style={[styles.input, { minHeight: 68 }]}
              value={postBody}
              onChangeText={setPostBody}
              multiline
              placeholder="Share context so colleagues across offices can help..."
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.anonSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.anonTitle}>Post Anonymously 🔒</Text>
                <Text style={styles.anonSub}>
                  Hide your name when discussing sensitive workload blockers
                </Text>
              </View>
              <Switch
                value={postAnonymous}
                onValueChange={setPostAnonymous}
                trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleCreatePost}
            >
              <Text style={styles.submitModalBtnText}>Publish Post →</Text>
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
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 112,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3EFE0',
    borderWidth: 1,
    borderColor: '#C5DEC0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginBottom: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  newPostBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  subTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subTabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  roomsScrollRow: {
    gap: 8,
    marginBottom: 12,
  },
  roomChipCard: {
    width: 156,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  roomChipCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roomChipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roomTypeBadge: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.primaryGlow,
    letterSpacing: 0.6,
  },
  roomOnlineCount: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  roomChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chatWindowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chatHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    marginBottom: 10,
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chatHeaderSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wsLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  wsGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  wsLiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  messagesContainer: {
    gap: 10,
    marginBottom: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sandAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.sandAvatarText,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 11,
  },
  messageBubbleOther: {
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
  },
  msgSenderName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryGlow,
    marginBottom: 3,
  },
  msgText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  msgMeta: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  typingIndicatorText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.primaryGlow,
    marginTop: 4,
  },
  composerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.textPrimary,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  psychSafetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: '#CBE0CF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  psychSafetyText: {
    fontSize: 11,
    color: colors.primary,
    flex: 1,
    lineHeight: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },
  postTopMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kindBadgeDifficulty: {
    backgroundColor: '#F5EBE1',
  },
  kindBadgeIdea: {
    backgroundColor: '#EBF3EC',
  },
  kindBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  postCategoryTag: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryGlow,
  },
  postTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  postBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
  },
  postAuthorLine: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
  postActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  upvotePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  upvotePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  upvotePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  repliesCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  replyBox: {
    backgroundColor: '#FAF9F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginTop: 6,
  },
  replyBoxAccepted: {
    backgroundColor: '#EFF7F0',
    borderColor: '#98C9A3',
  },
  replyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  acceptSolutionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  acceptSolutionBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  acceptSolutionBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  replyUpvoteMini: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  replyUpvoteMiniText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  replyContent: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  replyComposerRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    color: colors.textPrimary,
  },
  replySendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySendBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tipCatRow: {
    gap: 6,
    marginBottom: 12,
  },
  tipCatChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tipCatChipActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primaryGlow,
  },
  tipCatChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tipCatChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 28, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  kindChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  anonSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginTop: 10,
  },
  anonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  anonSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  submitModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

