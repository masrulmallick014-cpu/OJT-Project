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
import { Icon } from '../../components/common/Icon';
import { FeedScreen } from '../social/FeedScreen';
import {
    triggerHapticNotification,
    triggerHapticSelection,
} from '../../utils/haptics';

const TIP_CATEGORIES = [
    'Productivity',
    'Coding & Tech',
    'Time Management',
    'Work-Life Balance',
    'Communication',
];

export const CommunityScreen = () => {
    const {
        employee,
        chatRooms,
        chatMessages,
        forumPosts,
        ugcRulesAccepted,
        acceptUgcRules,
        blockCommunityUser,
        reportCommunityContent,
        sendChatMessage,
        createForumPost,
        upvoteForumPost,
        addForumReply,
        upvoteForumReply,
        markReplyAsAcceptedSolution,
    } = useWellness();

    const [subTab, setSubTab] = useState('feed');
    const [selectedRoomId, setSelectedRoomId] = useState('room-my-office');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [messageDraft, setMessageDraft] = useState('');
    const [replyDrafts, setReplyDrafts] = useState({});
    const [selectedTipCatFilter, setSelectedTipCatFilter] = useState('All');
    const [ugcRulesModalVisible, setUgcRulesModalVisible] = useState(false);

    // Create Post Modal (for Support & Ideas or Work Tips & Q&A)
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [postKind, setPostKind] = useState('WORK_DIFFICULTY');
    const [postCategory, setPostCategory] = useState('Work-Life Balance');
    const [postTitle, setPostTitle] = useState('');
    const [postBody, setPostBody] = useState('');
    const [postAnonymous, setPostAnonymous] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3000);
    };

    const activeRoom = chatRooms.find((r) => r.id === selectedRoomId) || chatRooms[0];
    const filteredRooms = chatRooms.filter(
        (r) =>
            r.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
            r.subtitle.toLowerCase().includes(chatSearchQuery.toLowerCase())
    );
    const roomMessages = chatMessages.filter((m) => m.roomId === activeRoom.id);

    const handleSendMessage = async () => {
        if (!messageDraft.trim()) return;
        if (!ugcRulesAccepted) {
            setUgcRulesModalVisible(true);
            return;
        }
        await triggerHapticSelection();
        const res = sendChatMessage(activeRoom.id, messageDraft);
        if (res && !res.ok) {
            showToast(res.error);
            return;
        }
        setMessageDraft('');
    };

    const handleCreatePost = async () => {
        if (!postTitle.trim() || !postBody.trim()) {
            showToast('Please enter both a title and description.');
            return;
        }
        if (!ugcRulesAccepted) {
            setPostModalVisible(false);
            setUgcRulesModalVisible(true);
            return;
        }
        await triggerHapticNotification();
        const res = createForumPost({
            kind: postKind,
            category: postCategory,
            title: postTitle,
            body: postBody,
            isAnonymous: postAnonymous,
        });
        if (res && !res.ok) {
            showToast(res.error);
            return;
        }
        setPostTitle('');
        setPostBody('');
        setPostAnonymous(false);
        setPostModalVisible(false);
        showToast('Published to the Community board!');
    };

    const handleSendReply = async (postId) => {
        const draft = replyDrafts[postId]?.trim();
        if (!draft) return;
        if (!ugcRulesAccepted) {
            setUgcRulesModalVisible(true);
            return;
        }
        await triggerHapticSelection();
        const res = addForumReply(postId, draft);
        if (res && !res.ok) {
            showToast(res.error);
            return;
        }
        setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
        showToast('Reply added!');
    };

    const difficultiesAndIdeasPosts = forumPosts.filter(
        (p) => p.kind === 'WORK_DIFFICULTY' || p.kind === 'IDEA'
    );
    const tipsAndQaPosts = forumPosts.filter(
        (p) =>
            (p.kind === 'PROFESSIONAL_TIP' || p.kind === 'NEED_HELP_QA') &&
            (selectedTipCatFilter === 'All' || p.category === selectedTipCatFilter)
    );

    const isSeededForumPost = (post) => post.authorId !== employee.id;

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
                        <Text style={styles.pageTitle}>Community</Text>
                        <Text style={styles.pageSubtitle}>
                            Share wellness wins, connect with coworkers, and swap practical work tips.
                        </Text>
                    </View>
                    {(subTab === 'difficulties' || subTab === 'tips') && (
                        <TouchableOpacity
                            style={styles.newPostBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Create new board post"
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
                            <Icon name="plus" size={14} color="#FFFFFF" />
                            <Text style={styles.newPostBtnText}>New Post</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 4-Tab Sub-Navigation Bar */}
                <View style={styles.subTabsBar}>
                    {[
                        { key: 'feed', label: 'Feed' },
                        { key: 'chats', label: 'Team Chats' },
                        { key: 'difficulties', label: 'Support & Ideas' },
                        { key: 'tips', label: 'Work Tips' },
                    ].map((tab) => {
                        const active = subTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.subTabBtn, active && styles.subTabBtnActive]}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={`${tab.label} tab`}
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

                {/* SUB-TAB 1: COWORKER SOCIAL FEED */}
                {subTab === 'feed' && <FeedScreen />}

                {/* SUB-TAB 2: TEAM CHATS (LOCAL DEMO) */}
                {subTab === 'chats' && (
                    <View>
                        <TextInput
                            style={styles.searchInput}
                            value={chatSearchQuery}
                            onChangeText={setChatSearchQuery}
                            placeholder="Search office groups or coworker chats..."
                            placeholderTextColor={colors.textMuted}
                            accessibilityLabel="Search chat rooms"
                        />

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
                                            ? 'CROSS-OFFICE'
                                            : '1-ON-1 CHAT';
                                return (
                                    <TouchableOpacity
                                        key={room.id}
                                        style={[
                                            styles.roomChipCard,
                                            selected && styles.roomChipCardActive,
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select chat room ${room.name}`}
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
                                                Demo
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

                        <View style={styles.chatWindowCard}>
                            <View style={styles.chatHeaderBar}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.chatHeaderTitle}>{activeRoom.name}</Text>
                                    <Text style={styles.chatHeaderSub}>{activeRoom.subtitle}</Text>
                                </View>
                                <View style={styles.demoModeBadge}>
                                    <Text style={styles.demoModeBadgeText}>Local Demo Chat</Text>
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
                                                isMine
                                                    ? styles.messageRowRight
                                                    : styles.messageRowLeft,
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
                                                    <View style={styles.msgSenderHeaderRow}>
                                                        <Text style={styles.msgSenderName}>
                                                            {msg.senderName} ·{' '}
                                                            {msg.senderOffice.split('·')[0].trim()}
                                                        </Text>
                                                        <View style={styles.msgDemoTag}>
                                                            <Text style={styles.msgDemoTagText}>
                                                                Demo
                                                            </Text>
                                                        </View>
                                                    </View>
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
                                                    {msg.timestamp}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}

                                {activeRoom.typingUser && (
                                    <Text style={styles.typingIndicatorText}>
                                        💬 {activeRoom.typingUser} is typing (Demo auto-reply)...
                                    </Text>
                                )}
                            </View>

                            <View style={styles.composerRow}>
                                <TextInput
                                    style={styles.composerInput}
                                    value={messageDraft}
                                    onChangeText={setMessageDraft}
                                    placeholder={`Message ${activeRoom.name}...`}
                                    placeholderTextColor={colors.textMuted}
                                    accessibilityLabel={`Message ${activeRoom.name}`}
                                />
                                <TouchableOpacity
                                    style={styles.sendBtn}
                                    onPress={handleSendMessage}
                                    accessibilityRole="button"
                                    accessibilityLabel="Send chat message"
                                >
                                    <Icon name="send" size={15} color="#FFFFFF" />
                                    <Text style={styles.sendBtnText}>Send</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* SUB-TAB 3: SUPPORT & IDEAS BOARD */}
                {subTab === 'difficulties' && (
                    <View>
                        <View style={styles.psychSafetyBanner}>
                            <Icon name="shield" size={16} color={colors.primary} />
                            <Text style={styles.psychSafetyText}>
                                Supportive Space: Toggle "Post Anonymously" when sharing workload
                                stress or asking for help with blockers.
                            </Text>
                        </View>

                        {difficultiesAndIdeasPosts.map((post) => {
                            const hasUpvoted = post.upvotedByIds.includes(employee.id);
                            const isDemo = isSeededForumPost(post);
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
                                                    ? '🤝 WORKLOAD SUPPORT'
                                                    : '💡 OFFICE IDEA'}
                                            </Text>
                                        </View>
                                        {isDemo && (
                                            <View style={styles.demoPillBadge}>
                                                <Text style={styles.demoPillBadgeText}>
                                                    Demo Post
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.postCategoryTag}>{post.category}</Text>
                                        <Text style={styles.postTimeText}>{post.createdAt}</Text>
                                    </View>

                                    <Text style={styles.postTitle}>{post.title}</Text>
                                    <Text style={styles.postBody}>{post.body}</Text>
                                    <Text style={styles.postAuthorLine}>
                                        Posted by{' '}
                                        {post.isAnonymous
                                            ? '🔒 Anonymous Coworker'
                                            : post.authorName}{' '}
                                        · {post.authorOffice}
                                    </Text>

                                    <View style={styles.postActionRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.upvotePill,
                                                hasUpvoted && styles.upvotePillActive,
                                            ]}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Support post ${post.title}, ${post.upvotes} upvotes`}
                                            onPress={() => upvoteForumPost(post.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.upvotePillText,
                                                    hasUpvoted && { color: '#FFFFFF' },
                                                ]}
                                            >
                                                ▲ {post.upvotes} Support
                                            </Text>
                                        </TouchableOpacity>
                                        <Text style={styles.repliesCountText}>
                                            {post.replies.length} peer replies
                                        </Text>
                                        {post.authorId !== employee.id && (
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                <TouchableOpacity
                                                    style={styles.replyUpvoteMini}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Report post ${post.title}`}
                                                    onPress={() => {
                                                        reportCommunityContent({
                                                            targetId: post.id,
                                                            targetType: 'FORUM_POST',
                                                            authorId: post.authorId,
                                                            authorName: post.authorName,
                                                            reason: 'Reported from Support Board',
                                                        });
                                                        showToast('Post reported and hidden.');
                                                    }}
                                                >
                                                    <Text style={styles.replyUpvoteMiniText}>
                                                        Report
                                                    </Text>
                                                </TouchableOpacity>
                                                {!post.isAnonymous && (
                                                    <TouchableOpacity
                                                        style={styles.replyUpvoteMini}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Block ${post.authorName}`}
                                                        onPress={() => {
                                                            blockCommunityUser(
                                                                post.authorId,
                                                                post.authorName
                                                            );
                                                            showToast(`Blocked ${post.authorName}.`);
                                                        }}
                                                    >
                                                        <Text style={styles.replyUpvoteMiniText}>
                                                            Block
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
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
                                                <Text style={styles.replyAuthor}>
                                                    {reply.authorName} (
                                                    {reply.authorOffice.split('·')[0].trim()})
                                                </Text>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.acceptSolutionBtn,
                                                        reply.isAcceptedSolution &&
                                                        styles.acceptSolutionBtnActive,
                                                    ]}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={
                                                        reply.isAcceptedSolution
                                                            ? 'Marked as helpful solution'
                                                            : 'Mark as helpful solution'
                                                    }
                                                    onPress={async () => {
                                                        await triggerHapticNotification();
                                                        markReplyAsAcceptedSolution(
                                                            post.id,
                                                            reply.id
                                                        );
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.acceptSolutionBtnText,
                                                            reply.isAcceptedSolution && {
                                                                color: '#FFFFFF',
                                                            },
                                                        ]}
                                                    >
                                                        {reply.isAcceptedSolution
                                                            ? '✓ Helpful Solution'
                                                            : 'Mark Helpful'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.replyContent}>{reply.content}</Text>
                                        </View>
                                    ))}

                                    <View style={styles.replyComposerRow}>
                                        <TextInput
                                            style={styles.replyInput}
                                            value={replyDrafts[post.id] || ''}
                                            onChangeText={(txt) =>
                                                setReplyDrafts((prev) => ({
                                                    ...prev,
                                                    [post.id]: txt,
                                                }))
                                            }
                                            placeholder="Share supportive advice or a suggestion..."
                                            placeholderTextColor={colors.textMuted}
                                            accessibilityLabel={`Reply to ${post.title}`}
                                        />
                                        <TouchableOpacity
                                            style={styles.replySendBtn}
                                            accessibilityRole="button"
                                            accessibilityLabel="Post reply"
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

                {/* SUB-TAB 4: WORK TIPS & Q&A */}
                {subTab === 'tips' && (
                    <View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tipCatRow}
                        >
                            {['All', ...TIP_CATEGORIES].map((cat) => {
                                const active = selectedTipCatFilter === cat;
                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.tipCatChip,
                                            active && styles.tipCatChipActive,
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Filter tips by ${cat}`}
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
                            })}
                        </ScrollView>

                        {tipsAndQaPosts.map((post) => {
                            const hasUpvoted = post.upvotedByIds.includes(employee.id);
                            const isDemo = isSeededForumPost(post);
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
                                                    ? '💡 WORK TIP'
                                                    : '❓ QUESTION / Q&A'}
                                            </Text>
                                        </View>
                                        {isDemo && (
                                            <View style={styles.demoPillBadge}>
                                                <Text style={styles.demoPillBadgeText}>
                                                    Demo Post
                                                </Text>
                                            </View>
                                        )}
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
                                            accessibilityRole="button"
                                            accessibilityLabel={`Mark ${post.title} as helpful`}
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
                                                <Text style={styles.replyAuthor}>
                                                    {reply.authorName}
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    <TouchableOpacity
                                                        style={styles.replyUpvoteMini}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Upvote reply by ${reply.authorName}`}
                                                        onPress={() =>
                                                            upvoteForumReply(post.id, reply.id)
                                                        }
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
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Toggle accepted solution"
                                                        onPress={async () => {
                                                            await triggerHapticNotification();
                                                            markReplyAsAcceptedSolution(
                                                                post.id,
                                                                reply.id
                                                            );
                                                            showToast('Updated solution badge!');
                                                        }}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.acceptSolutionBtnText,
                                                                reply.isAcceptedSolution && {
                                                                    color: '#FFFFFF',
                                                                },
                                                            ]}
                                                        >
                                                            {reply.isAcceptedSolution
                                                                ? '✓ Accepted Solution'
                                                                : 'Mark Solution'}
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
                                                setReplyDrafts((prev) => ({
                                                    ...prev,
                                                    [post.id]: txt,
                                                }))
                                            }
                                            placeholder="Add a practical tip or answer..."
                                            placeholderTextColor={colors.textMuted}
                                            accessibilityLabel={`Add answer to ${post.title}`}
                                        />
                                        <TouchableOpacity
                                            style={styles.replySendBtn}
                                            accessibilityRole="button"
                                            accessibilityLabel="Post answer"
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
            </ScrollView>

            {/* CREATE NEW COMMUNITY POST MODAL */}
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
                                accessibilityRole="button"
                                accessibilityLabel="Close new post modal"
                            >
                                <Icon name="close" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.fieldLabel}>POST TYPE</Text>
                        <View style={styles.kindChipsWrap}>
                            {[
                                { k: 'WORK_DIFFICULTY', label: 'Workload Support' },
                                { k: 'IDEA', label: 'Office Idea' },
                                { k: 'PROFESSIONAL_TIP', label: 'Work Tip' },
                                { k: 'NEED_HELP_QA', label: 'Question / Q&A' },
                            ].map((item) => {
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

                        <Text style={styles.fieldLabel}>CATEGORY</Text>
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
                            placeholder="Summarize your tip, idea, or question..."
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.fieldLabel}>DETAILS</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 72 }]}
                            value={postBody}
                            onChangeText={setPostBody}
                            multiline
                            placeholder="Share context so coworkers can help..."
                            placeholderTextColor={colors.textMuted}
                        />

                        <View style={styles.anonSwitchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.anonTitle}>Post Anonymously 🔒</Text>
                                <Text style={styles.anonSub}>
                                    Hide your name when discussing workload stress or blockers
                                </Text>
                            </View>
                            <Switch
                                value={postAnonymous}
                                onValueChange={setPostAnonymous}
                                trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                                thumbColor="#FFFFFF"
                                accessibilityLabel="Post anonymously"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.submitModalBtn}
                            onPress={handleCreatePost}
                            accessibilityRole="button"
                            accessibilityLabel="Publish community post"
                        >
                            <Text style={styles.submitModalBtnText}>Publish Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* COMMUNITY GUIDELINES ACCEPTANCE MODAL */}
            <Modal
                visible={ugcRulesModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setUgcRulesModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Community Guidelines</Text>
                        <Text style={[styles.postBody, { marginTop: 8 }]}>
                            Before posting, replying, or messaging, please agree to keep discussions
                            respectful, protect coworker privacy, and never share medical advice or
                            harassment. You can report content or block users at any time.
                        </Text>
                        <TouchableOpacity
                            style={styles.submitModalBtn}
                            onPress={() => {
                                acceptUgcRules();
                                setUgcRulesModalVisible(false);
                                showToast('Community Guidelines accepted. You can now post.');
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Accept community guidelines"
                        >
                            <Text style={styles.submitModalBtnText}>
                                I Agree to Community Guidelines
                            </Text>
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
        paddingVertical: 10,
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
        alignItems: 'center',
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
        fontSize: 12.5,
        color: colors.textSecondary,
        marginTop: 3,
    },
    newPostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        minHeight: 48,
        borderRadius: 14,
    },
    newPostBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    subTabsBar: {
        flexDirection: 'row',
        backgroundColor: '#EFECE6',
        borderRadius: 14,
        padding: 4,
        marginBottom: 14,
        gap: 4,
    },
    subTabBtn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    subTabBtnActive: {
        backgroundColor: '#FFFFFF',
    },
    subTabText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
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
        minHeight: 48,
        fontSize: 13,
        color: colors.textPrimary,
        marginBottom: 10,
    },
    roomsScrollRow: {
        gap: 8,
        marginBottom: 12,
    },
    roomChipCard: {
        width: 164,
        minHeight: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        justifyContent: 'center',
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
        fontSize: 9,
        fontWeight: '700',
        color: colors.primaryGlow,
        letterSpacing: 0.5,
    },
    roomOnlineCount: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
    },
    roomChipName: {
        fontSize: 12.5,
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
        gap: 8,
    },
    chatHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    chatHeaderSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    demoModeBadge: {
        backgroundColor: '#F3EFE6',
        borderWidth: 1,
        borderColor: '#E2DDD2',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
    },
    demoModeBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.textSecondary,
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
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.sandAvatarBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    msgAvatarText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.sandAvatarText,
    },
    messageBubble: {
        maxWidth: '82%',
        borderRadius: 16,
        padding: 12,
    },
    messageBubbleOther: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    messageBubbleMine: {
        backgroundColor: colors.primary,
    },
    msgSenderHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    msgSenderName: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.primaryGlow,
    },
    msgDemoTag: {
        backgroundColor: '#EFECE6',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 6,
    },
    msgDemoTagText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    msgText: {
        fontSize: 12.5,
        color: colors.textPrimary,
        lineHeight: 18,
    },
    msgMeta: {
        fontSize: 9.5,
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
        minHeight: 48,
        fontSize: 13,
        color: colors.textPrimary,
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        minHeight: 48,
        borderRadius: 14,
    },
    sendBtnText: {
        color: '#FFFFFF',
        fontSize: 12.5,
        fontWeight: '700',
    },
    psychSafetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EBF3EC',
        borderWidth: 1,
        borderColor: '#C8DEC8',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    psychSafetyText: {
        flex: 1,
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        lineHeight: 17,
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
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    kindBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    kindBadgeDifficulty: {
        backgroundColor: '#FDECEC',
    },
    kindBadgeIdea: {
        backgroundColor: '#EBF3EC',
    },
    kindBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    demoPillBadge: {
        backgroundColor: '#F3EFE6',
        borderWidth: 1,
        borderColor: '#E2DDD2',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 999,
    },
    demoPillBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    postCategoryTag: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.primaryGlow,
    },
    postTimeText: {
        fontSize: 10.5,
        color: colors.textMuted,
        marginLeft: 'auto',
    },
    postTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    postBody: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
        marginBottom: 8,
    },
    postAuthorLine: {
        fontSize: 11,
        color: colors.textMuted,
        marginBottom: 10,
    },
    postActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    upvotePill: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 14,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 999,
    },
    upvotePillActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    upvotePillText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    repliesCountText: {
        fontSize: 11.5,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    replyBox: {
        backgroundColor: '#FAF9F5',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ECEAE3',
        marginBottom: 8,
    },
    replyBoxAccepted: {
        backgroundColor: '#EBF3EC',
        borderColor: colors.primary,
    },
    replyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    replyAuthor: {
        fontSize: 11.5,
        fontWeight: '700',
        color: colors.textPrimary,
        flex: 1,
    },
    replyUpvoteMini: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 10,
        minHeight: 36,
        justifyContent: 'center',
        borderRadius: 8,
    },
    replyUpvoteMiniText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    acceptSolutionBtn: {
        backgroundColor: '#EFECE6',
        paddingHorizontal: 10,
        minHeight: 36,
        justifyContent: 'center',
        borderRadius: 8,
    },
    acceptSolutionBtnActive: {
        backgroundColor: colors.primary,
    },
    acceptSolutionBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    replyContent: {
        fontSize: 12.5,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    replyComposerRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        alignItems: 'center',
    },
    replyInput: {
        flex: 1,
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 48,
        fontSize: 12.5,
        color: colors.textPrimary,
    },
    replySendBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        minHeight: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    replySendBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    tipCatRow: {
        gap: 8,
        marginBottom: 12,
    },
    tipCatChip: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 14,
        minHeight: 48,
        justifyContent: 'center',
        borderRadius: 999,
    },
    tipCatChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tipCatChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tipCatChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(26, 30, 27, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
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
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F2EFE9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.7,
        marginTop: 8,
        marginBottom: 6,
    },
    kindChipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    input: {
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
    anonSwitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF9F5',
        borderRadius: 14,
        padding: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    anonTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    anonSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    submitModalBtn: {
        backgroundColor: colors.primary,
        minHeight: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    submitModalBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
