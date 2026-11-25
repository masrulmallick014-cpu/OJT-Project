import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAlgorithmicFeed, useFriendRequests } from '../../lib/supabase';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { CrossCompanyCarousel } from './CrossCompanyCarousel';
import { RequestsInboxModal } from './RequestsInboxModal';
import { ChatRoomScreen } from './ChatRoomScreen';
import {
    triggerHapticImpact,
    triggerHapticNotification,
    triggerHapticSelection,
} from '../../utils/haptics';

const REPORT_REASONS = [
    'Harassment or Bullying',
    'Spam or Misleading Content',
    'Inappropriate Workplace Content',
    'Privacy or Personal Data Violation',
];

export const FeedScreen = () => {
    const {
        currentUser,
        posts,
        stories,
        ugcRulesAccepted,
        toggleLike,
        toggleSave,
        votePoll,
        addComment,
        createPost,
        isPostLiked,
        isPostSaved,
    } = useAlgorithmicFeed();
    const {
        incomingPending,
        getRelationshipWith,
        sendRequest,
        acceptRequest,
    } = useFriendRequests();
    const {
        acceptUgcRules,
        blockCommunityUser,
        reportCommunityContent,
    } = useWellness();

    const [inboxVisible, setInboxVisible] = useState(false);
    const [activeChatFriendshipId, setActiveChatFriendshipId] = useState(null);
    const [activeChatPartner, setActiveChatPartner] = useState(null);

    // Highlight Viewer Modal
    const [selectedStory, setSelectedStory] = useState(null);

    // Create Post Modal
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostType, setNewPostType] = useState('WIN');
    const [newPostTag, setNewPostTag] = useState('Wellness Win');

    // UGC Rules Acceptance Modal
    const [ugcModalVisible, setUgcModalVisible] = useState(false);
    const [pendingActionAfterRules, setPendingActionAfterRules] = useState(null);

    // Report Content Modal
    const [reportModalTarget, setReportModalTarget] = useState(null);
    const [selectedReportReason, setSelectedReportReason] = useState(REPORT_REASONS[0]);
    const [reportDetails, setReportDetails] = useState('');
    const [feedNotice, setFeedNotice] = useState(null);

    // Comment Input Drafts per Post
    const [commentDrafts, setCommentDrafts] = useState({});
    const [expandedCommentsPostId, setExpandedCommentsPostId] = useState(null);

    const showNotice = (msg) => {
        setFeedNotice(msg);
        setTimeout(() => setFeedNotice((prev) => (prev === msg ? null : prev)), 3500);
    };

    const ensureUgcRulesAccepted = (onAccepted) => {
        if (ugcRulesAccepted) {
            onAccepted();
            return;
        }
        setPendingActionAfterRules(() => onAccepted);
        setUgcModalVisible(true);
    };

    const handleConnectButton = async (author) => {
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
        if (!newPostContent.trim()) {
            showNotice('Please enter a message before publishing.');
            return;
        }
        const res = createPost(newPostContent, newPostType, newPostTag);
        if (res && !res.ok) {
            if (res.requiresUgcAcceptance) {
                setCreateModalVisible(false);
                setUgcModalVisible(true);
                return;
            }
            showNotice(res.error || 'Could not publish post.');
            return;
        }
        await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
        setNewPostContent('');
        setCreateModalVisible(false);
        showNotice('Update shared with the community.');
    };

    const handleConfirmReport = async () => {
        if (!reportModalTarget) return;
        await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
        reportCommunityContent({
            targetId: reportModalTarget.id,
            targetType: 'POST',
            authorId: reportModalTarget.author.id,
            authorName: reportModalTarget.author.full_name,
            reason: selectedReportReason,
            details: reportDetails,
        });
        setReportModalTarget(null);
        setReportDetails('');
        showNotice('Report submitted for moderation review and post hidden from your feed.');
    };

    const handleBlockAuthor = async (author) => {
        await triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
        blockCommunityUser(author.id, author.full_name);
        showNotice(`Blocked ${author.full_name}. You can manage blocked users in Profile & Settings.`);
    };

    return (
        <View style={styles.screen}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.topEyebrow}>RECENT TEAM & PEER UPDATES</Text>
                    <Text style={styles.topTitle}>Coworker Feed</Text>
                </View>

                <View style={styles.topRightActions}>
                    <TouchableOpacity
                        style={styles.inboxBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Connection requests, ${incomingPending.length} pending`}
                        onPress={async () => {
                            await triggerHapticSelection();
                            setInboxVisible(true);
                        }}
                    >
                        <Text style={styles.inboxBtnText}>
                            Connections ({incomingPending.length})
                        </Text>
                        {incomingPending.length > 0 && <View style={styles.unreadDot} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.postCreateBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Share a new community update"
                        onPress={async () => {
                            await triggerHapticSelection();
                            ensureUgcRulesAccepted(() => setCreateModalVisible(true));
                        }}
                    >
                        <Text style={styles.postCreateBtnText}>+ Share Update</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.scrollContent}>
                {feedNotice && (
                    <View style={styles.noticeBanner} accessibilityRole="alert">
                        <Text style={styles.noticeText}>{feedNotice}</Text>
                    </View>
                )}

                {/* 1. Peer Wellness Highlights (Labeled Demo) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesRow}
                >
                    {stories.map((story) => (
                        <TouchableOpacity
                            key={story.id}
                            style={styles.storyItem}
                            accessibilityRole="button"
                            accessibilityLabel={`View demo highlight from ${story.profile.full_name}: ${story.headline}`}
                            onPress={async () => {
                                await triggerHapticSelection();
                                setSelectedStory(story);
                            }}
                            activeOpacity={0.85}
                        >
                            <View style={styles.storyRing}>
                                <View style={styles.storyInnerAvatar}>
                                    <Text style={styles.storyAvatarText}>
                                        {story.profile.avatar_url}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.storyDemoBadge}>DEMO</Text>
                            <Text style={styles.storyName} numberOfLines={1}>
                                {story.profile.full_name.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* 2. Recent & Relevant Posts */}
                {posts.map((post, index) => {
                    const liked = isPostLiked(post.id);
                    const saved = isPostSaved(post.id);
                    const rel = getRelationshipWith(post.author.id);
                    const isDemoPost = post.is_demo !== false;

                    let connectLabel = '+ Connect';
                    if (rel.status === 'PENDING_OUTGOING') connectLabel = 'Requested';
                    else if (rel.status === 'PENDING_INCOMING') connectLabel = 'Accept';
                    else if (rel.status === 'ACCEPTED') connectLabel = 'Message';

                    return (
                        <React.Fragment key={post.id}>
                            {index === 2 && (
                                <CrossCompanyCarousel
                                    onOpenChatWithFriendship={(fId, partner) => {
                                        setActiveChatFriendshipId(fId);
                                        setActiveChatPartner(partner);
                                    }}
                                    onOpenRequestsInbox={() => setInboxVisible(true)}
                                />
                            )}

                            <View style={styles.postCard}>
                                {/* Post Author + Company + Demo Label + Connect */}
                                <View style={styles.postHeader}>
                                    <View style={styles.authorAvatar}>
                                        <Text style={styles.authorAvatarText}>
                                            {post.author.avatar_url}
                                        </Text>
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <View style={styles.authorNameRow}>
                                            <Text style={styles.authorName}>
                                                {post.author.full_name}
                                            </Text>
                                            {isDemoPost ? (
                                                <View style={styles.demoChip}>
                                                    <Text style={styles.demoChipText}>
                                                        Demo Post
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View style={styles.yourPostChip}>
                                                    <Text style={styles.yourPostChipText}>
                                                        Your Post
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.authorCompanyRole}>
                                            {post.author.company_name} · {post.author.role_title}
                                            {post.author.is_demo ? ' · Sample Profile' : ''}
                                        </Text>
                                    </View>

                                    {post.author.id !== currentUser.id && (
                                        <TouchableOpacity
                                            style={[
                                                styles.connectPillBtn,
                                                rel.status === 'ACCEPTED' &&
                                                styles.connectPillBtnAccepted,
                                            ]}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${connectLabel} with ${post.author.full_name}`}
                                            onPress={() => handleConnectButton(post.author)}
                                        >
                                            <Text
                                                style={[
                                                    styles.connectPillBtnText,
                                                    rel.status === 'ACCEPTED' && {
                                                        color: colors.primary,
                                                    },
                                                ]}
                                            >
                                                {connectLabel}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Topic Tag Strip */}
                                <View style={styles.topicBar}>
                                    <Text style={styles.topicTagPill}>#{post.topic_tag}</Text>
                                </View>

                                {/* Post Content */}
                                <Text style={styles.postContent}>{post.content}</Text>

                                {/* Interactive Poll Options */}
                                {post.post_type === 'POLL' && post.poll_options && (
                                    <View style={styles.pollBox}>
                                        {post.poll_options.map((opt) => {
                                            const totalVotes = post.poll_options.reduce(
                                                (acc, item) => acc + item.votes,
                                                0
                                            );
                                            const pct = Math.round(
                                                (opt.votes / Math.max(1, totalVotes)) * 100
                                            );
                                            const isVoted = post.voted_option_id === opt.id;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.id}
                                                    style={[
                                                        styles.pollOptionBtn,
                                                        isVoted && styles.pollOptionBtnVoted,
                                                    ]}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Vote for ${opt.label}, ${pct}%`}
                                                    onPress={async () => {
                                                        await triggerHapticSelection();
                                                        votePoll(post.id, opt.id);
                                                    }}
                                                >
                                                    <Text style={styles.pollOptionLabel}>
                                                        {opt.label}
                                                    </Text>
                                                    <Text style={styles.pollOptionPct}>
                                                        {pct}% ({opt.votes})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Supportive Action Bar + Report & Block Controls (48dp touch targets) */}
                                <View style={styles.postFooterRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionPill,
                                            liked && styles.actionPillLiked,
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Cheer post, ${post.likes_count} cheers`}
                                        onPress={async () => {
                                            await triggerHapticImpact(
                                                Haptics.ImpactFeedbackStyle.Light
                                            );
                                            toggleLike(post.id);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.actionPillText,
                                                liked && styles.actionPillTextActive,
                                            ]}
                                        >
                                            {liked ? '👏 Cheered' : '👏 Cheer'} ({post.likes_count})
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionPill}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Toggle replies, ${post.comments_count} replies`}
                                        onPress={async () => {
                                            await triggerHapticSelection();
                                            setExpandedCommentsPostId((prev) =>
                                                prev === post.id ? null : post.id
                                            );
                                        }}
                                    >
                                        <Text style={styles.actionPillText}>
                                            💬 Replies ({post.comments_count})
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.actionPill,
                                            saved && styles.actionPillSaved,
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel={saved ? 'Remove saved post' : 'Save post'}
                                        onPress={async () => {
                                            await triggerHapticSelection();
                                            toggleSave(post.id);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.actionPillText,
                                                saved && styles.actionPillTextActive,
                                            ]}
                                        >
                                            {saved ? '🔖 Saved' : '🔖 Save'}
                                        </Text>
                                    </TouchableOpacity>

                                    {post.author.id !== currentUser.id && (
                                        <>
                                            <TouchableOpacity
                                                style={styles.moderationPill}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Report post by ${post.author.full_name}`}
                                                onPress={async () => {
                                                    await triggerHapticSelection();
                                                    setReportModalTarget(post);
                                                }}
                                            >
                                                <Text style={styles.moderationPillText}>
                                                    Report
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.moderationPill}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Block ${post.author.full_name}`}
                                                onPress={() => handleBlockAuthor(post.author)}
                                            >
                                                <Text style={styles.moderationPillText}>
                                                    Block User
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
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
                                                        setCommentDrafts((prev) => ({
                                                            ...prev,
                                                            [post.id]: txt,
                                                        }))
                                                    }
                                                    placeholder="Write a supportive reply..."
                                                    placeholderTextColor={colors.textMuted}
                                                    accessibilityLabel="Write a reply"
                                                />
                                                <TouchableOpacity
                                                    style={styles.commentSendBtn}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Send reply"
                                                    onPress={async () => {
                                                        const txt = commentDrafts[post.id];
                                                        if (!txt?.trim()) return;
                                                        await triggerHapticSelection();
                                                        ensureUgcRulesAccepted(() => {
                                                            const res = addComment(post.id, txt);
                                                            if (res && !res.ok) {
                                                                showNotice(res.error);
                                                                return;
                                                            }
                                                            setCommentDrafts((prev) => ({
                                                                ...prev,
                                                                [post.id]: '',
                                                            }));
                                                        });
                                                    }}
                                                >
                                                    <Text style={styles.commentSendText}>Reply</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                            </View>
                        </React.Fragment>
                    );
                })}

                {/* Finite Feed Completion Card ("You're all caught up") */}
                <View style={styles.caughtUpCard}>
                    <Text style={styles.caughtUpBadge}>✓ YOU’RE ALL CAUGHT UP</Text>
                    <Text style={styles.caughtUpTitle}>No endless scroll here.</Text>
                    <Text style={styles.caughtUpBody}>
                        You’ve seen all recent updates. Step away from the screen, drink a glass
                        of water, or take a quick 2-minute stretch break.
                    </Text>
                </View>
            </View>

            {/* Connections Inbox Modal */}
            <RequestsInboxModal
                visible={inboxVisible}
                onClose={() => setInboxVisible(false)}
                onOpenChat={(friendshipId, partner) => {
                    setActiveChatFriendshipId(friendshipId);
                    setActiveChatPartner(partner);
                }}
            />

            {/* 1-on-1 Direct Chat Modal */}
            <ChatRoomScreen
                visible={activeChatFriendshipId !== null}
                friendshipId={activeChatFriendshipId}
                partner={activeChatPartner}
                onClose={() => setActiveChatFriendshipId(null)}
            />

            {/* Highlight Viewer Modal */}
            <Modal
                visible={selectedStory !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedStory(null)}
            >
                <View style={styles.modalBackdrop}>
                    {selectedStory && (
                        <View style={styles.storyModalCard}>
                            <View style={styles.storyModalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.storyModalBadge}>
                                        DEMO HIGHLIGHT · SAMPLE PROFILE
                                    </Text>
                                    <Text style={styles.storyModalAuthor}>
                                        {selectedStory.profile.full_name} ·{' '}
                                        {selectedStory.profile.company_name}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.closeIconBtn}
                                    onPress={() => setSelectedStory(null)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close highlight"
                                >
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
                                accessibilityRole="button"
                                accessibilityLabel={`Connect with ${selectedStory.profile.full_name}`}
                                onPress={() => {
                                    const author = selectedStory.profile;
                                    setSelectedStory(null);
                                    handleConnectButton(author);
                                }}
                            >
                                <Text style={styles.storyConnectBtnText}>
                                    Connect with {selectedStory.profile.full_name.split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Community Guidelines (UGC Rules) Acceptance Modal */}
            <Modal
                visible={ugcModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setUgcModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.createModalCard}>
                        <Text style={styles.storyModalBadge}>COMMUNITY SAFETY & RULES</Text>
                        <Text style={[styles.createModalTitle, { marginTop: 4 }]}>
                            Community Guidelines
                        </Text>
                        <Text style={styles.ugcRulesParagraph}>
                            Before posting, commenting, or messaging in PulseCorp Community, please
                            agree to our workplace conduct rules:
                        </Text>
                        <View style={styles.ugcBulletBox}>
                            <Text style={styles.ugcBulletItem}>
                                • Be respectful and supportive. Zero tolerance for harassment, hate
                                speech, or bullying.
                            </Text>
                            <Text style={styles.ugcBulletItem}>
                                • Protect privacy. Do not share confidential company data or another
                                person’s private health information.
                            </Text>
                            <Text style={styles.ugcBulletItem}>
                                • Do not post medical advice, spam, or misleading promotions.
                            </Text>
                            <Text style={styles.ugcBulletItem}>
                                • You can report inappropriate posts or block users at any time.
                                Reported content is hidden immediately and queued for moderation.
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <TouchableOpacity
                                style={styles.cancelSecondaryBtn}
                                onPress={() => {
                                    setUgcModalVisible(false);
                                    setPendingActionAfterRules(null);
                                }}
                                accessibilityRole="button"
                            >
                                <Text style={styles.cancelSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.publishBtn, { flex: 1.4, marginTop: 0 }]}
                                onPress={async () => {
                                    await triggerHapticNotification(
                                        Haptics.NotificationFeedbackType.Success
                                    );
                                    acceptUgcRules();
                                    setUgcModalVisible(false);
                                    if (pendingActionAfterRules) {
                                        const fn = pendingActionAfterRules;
                                        setPendingActionAfterRules(null);
                                        fn();
                                    }
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Accept community guidelines"
                            >
                                <Text style={styles.publishBtnText}>I Agree to Guidelines</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Report Content Modal */}
            <Modal
                visible={reportModalTarget !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setReportModalTarget(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.createModalCard}>
                        <View style={styles.storyModalHeader}>
                            <Text style={styles.createModalTitle}>Report Content</Text>
                            <TouchableOpacity
                                style={styles.closeIconBtn}
                                onPress={() => setReportModalTarget(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Close report modal"
                            >
                                <Text style={styles.storyCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.ugcRulesParagraph}>
                            Select a reason for reporting this post by{' '}
                            {reportModalTarget?.author?.full_name || 'user'}. It will be hidden from
                            your feed immediately and added to the moderation queue.
                        </Text>

                        <View style={{ gap: 8, marginVertical: 10 }}>
                            {REPORT_REASONS.map((reason) => {
                                const active = selectedReportReason === reason;
                                return (
                                    <TouchableOpacity
                                        key={reason}
                                        style={[
                                            styles.pollOptionBtn,
                                            active && styles.pollOptionBtnVoted,
                                        ]}
                                        onPress={() => setSelectedReportReason(reason)}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.pollOptionLabel}>
                                            {active ? '● ' : '○ '}
                                            {reason}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TextInput
                            style={[styles.createInput, { minHeight: 60 }]}
                            value={reportDetails}
                            onChangeText={setReportDetails}
                            multiline
                            placeholder="Optional context for moderators..."
                            placeholderTextColor={colors.textMuted}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <TouchableOpacity
                                style={styles.cancelSecondaryBtn}
                                onPress={() => setReportModalTarget(null)}
                                accessibilityRole="button"
                            >
                                <Text style={styles.cancelSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.publishBtn, { flex: 1.4, marginTop: 0 }]}
                                onPress={handleConfirmReport}
                                accessibilityRole="button"
                                accessibilityLabel="Submit content report"
                            >
                                <Text style={styles.publishBtnText}>Submit Report</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Share Update Modal */}
            <Modal
                visible={createModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.createModalCard}>
                        <View style={styles.storyModalHeader}>
                            <Text style={styles.createModalTitle}>Share a Wellness Update</Text>
                            <TouchableOpacity
                                style={styles.closeIconBtn}
                                onPress={() => setCreateModalVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close share update modal"
                            >
                                <Text style={styles.storyCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.postTypeRow}>
                            {[
                                { key: 'WIN', label: 'Wellness Win' },
                                { key: 'UPDATE', label: 'Daily Update' },
                                { key: 'HOT_TAKE', label: 'Work Tip' },
                            ].map((pt) => {
                                const active = newPostType === pt.key;
                                return (
                                    <TouchableOpacity
                                        key={pt.key}
                                        style={[
                                            styles.postTypeChip,
                                            active && styles.postTypeChipActive,
                                        ]}
                                        onPress={() => setNewPostType(pt.key)}
                                    >
                                        <Text
                                            style={[
                                                styles.postTypeChipText,
                                                active && styles.postTypeChipTextActive,
                                            ]}
                                        >
                                            {pt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TextInput
                            style={styles.createInput}
                            value={newPostTag}
                            onChangeText={setNewPostTag}
                            placeholder="Topic tag (e.g. Walking Break, Hydration)"
                            placeholderTextColor={colors.textMuted}
                        />

                        <TextInput
                            style={[styles.createInput, { minHeight: 84, marginTop: 8 }]}
                            value={newPostContent}
                            onChangeText={setNewPostContent}
                            multiline
                            placeholder="Share a helpful habit, walk invite, or team win..."
                            placeholderTextColor={colors.textMuted}
                        />

                        <TouchableOpacity
                            onPress={handlePublishPost}
                            style={styles.publishBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Publish update to feed"
                        >
                            <Text style={styles.publishBtnText}>Publish Update</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        overflow: 'hidden',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#EFECE6',
        backgroundColor: '#FAF9F5',
        gap: 10,
    },
    topEyebrow: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: colors.primary,
    },
    topTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },
    topRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inboxBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 12,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 12,
        position: 'relative',
    },
    inboxBtnText: {
        color: colors.textPrimary,
        fontSize: 11.5,
        fontWeight: '700',
    },
    unreadDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    postCreateBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 12,
    },
    postCreateBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 14,
    },
    noticeBanner: {
        backgroundColor: '#E3EFE0',
        borderWidth: 1,
        borderColor: '#C5DEC0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    noticeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    storiesRow: {
        gap: 12,
        paddingBottom: 14,
    },
    storyItem: {
        alignItems: 'center',
        width: 72,
    },
    storyRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBF3EC',
    },
    storyInnerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyAvatarText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    storyDemoBadge: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.textMuted,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    storyName: {
        fontSize: 11,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    postCard: {
        backgroundColor: '#FAF9F5',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginBottom: 14,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    authorAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#E3EFE0',
        borderWidth: 1,
        borderColor: '#C5DEC0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorAvatarText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    authorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    demoChip: {
        backgroundColor: '#EFECE6',
        borderWidth: 1,
        borderColor: '#DFDBD2',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    demoChipText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    yourPostChip: {
        backgroundColor: '#E3EFE0',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    yourPostChipText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
    },
    authorCompanyRole: {
        fontSize: 11.5,
        color: colors.textSecondary,
        marginTop: 2,
    },
    connectPillBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 999,
    },
    connectPillBtnAccepted: {
        backgroundColor: '#E3EFE0',
        borderWidth: 1,
        borderColor: '#C5DEC0',
    },
    connectPillBtnText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '700',
    },
    topicBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    topicTagPill: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        backgroundColor: '#EBF3EC',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
    },
    postContent: {
        fontSize: 13.5,
        color: colors.textPrimary,
        lineHeight: 20,
        marginBottom: 12,
    },
    pollBox: {
        gap: 8,
        marginBottom: 12,
    },
    pollOptionBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 48,
    },
    pollOptionBtnVoted: {
        borderColor: colors.primary,
        backgroundColor: '#EBF3EC',
    },
    pollOptionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        paddingRight: 8,
    },
    pollOptionPct: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    postFooterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionPill: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 12,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 999,
    },
    actionPillLiked: {
        borderColor: colors.primary,
        backgroundColor: '#EBF3EC',
    },
    actionPillSaved: {
        borderColor: colors.primary,
        backgroundColor: '#EBF3EC',
    },
    actionPillText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    actionPillTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    moderationPill: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: '#E2DDD2',
        paddingHorizontal: 11,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 999,
    },
    moderationPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
    },
    commentsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E6E2D8',
        gap: 8,
    },
    commentLine: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    commentAuthor: {
        fontWeight: '700',
        color: colors.textPrimary,
    },
    commentInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        alignItems: 'center',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 48,
        fontSize: 12.5,
        color: colors.textPrimary,
    },
    commentSendBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        minHeight: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentSendText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    caughtUpCard: {
        backgroundColor: '#EBF3EC',
        borderWidth: 1,
        borderColor: '#C8DEC8',
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        marginTop: 4,
    },
    caughtUpBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    caughtUpTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    caughtUpBody: {
        fontSize: 12.5,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(26, 30, 27, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    storyModalCard: {
        width: '100%',
        maxWidth: 370,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    storyModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        gap: 10,
    },
    storyModalBadge: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.6,
    },
    storyModalAuthor: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },
    closeIconBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F2EFE9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyCloseText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    storyModalHeadline: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    storyModalBody: {
        fontSize: 13.5,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 18,
    },
    storyConnectBtn: {
        backgroundColor: colors.primary,
        minHeight: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyConnectBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    createModalCard: {
        width: '100%',
        maxWidth: 390,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    createModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    ugcRulesParagraph: {
        fontSize: 12.5,
        color: colors.textSecondary,
        lineHeight: 18,
        marginTop: 6,
    },
    ugcBulletBox: {
        backgroundColor: '#FAF9F5',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginTop: 10,
        gap: 6,
    },
    ugcBulletItem: {
        fontSize: 12,
        color: colors.textPrimary,
        lineHeight: 17,
    },
    cancelSecondaryBtn: {
        flex: 1,
        minHeight: 48,
        backgroundColor: '#EFECE6',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelSecondaryBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    postTypeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    postTypeChip: {
        paddingHorizontal: 12,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    postTypeChipActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    postTypeChipText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '700',
    },
    postTypeChipTextActive: {
        color: '#FFFFFF',
    },
    createInput: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 48,
        fontSize: 13,
        color: colors.textPrimary,
    },
    publishBtn: {
        backgroundColor: colors.primary,
        minHeight: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    publishBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
