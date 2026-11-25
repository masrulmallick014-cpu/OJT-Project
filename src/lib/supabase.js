import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// SUPABASE ENVIRONMENT VALIDATION & CLIENT ADAPTER
// ============================================================================
const rawSupabaseUrl =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) || '';
const rawSupabaseAnonKey =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) || '';

/**
 * Safety check: Ensure a Supabase service_role key is NEVER bundled in the mobile app.
 */
function isUnsafeServiceRoleKey(key) {
    if (!key) return false;
    try {
        const parts = key.split('.');
        if (parts.length === 3 && typeof atob === 'function') {
            const payload = JSON.parse(atob(parts[1]));
            if (payload?.role === 'service_role') return true;
        }
    } catch {
        // Not a JWT or atob unavailable
    }
    return key.toLowerCase().includes('service_role');
}

export const hasUnsafeClientKey = isUnsafeServiceRoleKey(rawSupabaseAnonKey);

export const isSupabaseConfigured = Boolean(
    rawSupabaseUrl &&
    rawSupabaseAnonKey &&
    rawSupabaseUrl.startsWith('https://') &&
    !hasUnsafeClientKey
);

const SUPABASE_AUTH_SESSION_KEY = '@pulsecorp_supabase_session_v2';
const MODERATION_STORAGE_KEY = '@pulsecorp_moderation_v2';

// ============================================================================
// PRE-SEEDED SAMPLE PROFILES & POSTS (EXPLICITLY LABELED AS DEMO DATA)
// ============================================================================
export const CURRENT_USER_PROFILE = {
    id: 'usr-alex-01',
    username: 'alex.morgan',
    full_name: 'Alex Morgan',
    avatar_url: 'AM',
    company_name: 'Acme Studio',
    role_title: 'Product Designer',
    seniority_tier: 'JUNIOR',
    vibe_status: 'Focused & Hydrated 💧',
    streak_count: 3,
    interests: ['Design Systems', 'Walking Breaks', 'React Native', 'Run Club'],
    is_online: true,
    is_demo: false,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
};

export const SEEDED_PROFILES = [
    CURRENT_USER_PROFILE,
    {
        id: 'usr-maya-exec',
        username: 'maya.lin',
        full_name: 'Maya Lin',
        avatar_url: 'ML',
        company_name: 'Stripe',
        role_title: 'VP of Product Engineering',
        seniority_tier: 'EXEC',
        vibe_status: 'Open to Coffee Walks ☕',
        streak_count: 12,
        interests: ['Walking Meetings', 'Mentorship', 'Healthy Teams'],
        is_online: true,
        is_demo: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
        id: 'usr-kai-senior',
        username: 'kai.nakamura',
        full_name: 'Kai Nakamura',
        avatar_url: 'KN',
        company_name: 'Linear',
        role_title: 'Staff Design Engineer',
        seniority_tier: 'SENIOR',
        vibe_status: 'Afternoon Stretch 🌿',
        streak_count: 9,
        interests: ['Ergonomics', 'Mobile Craft', 'Running'],
        is_online: true,
        is_demo: true,
        created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
        id: 'usr-zara-exec',
        username: 'zara.patel',
        full_name: 'Zara Patel',
        avatar_url: 'ZP',
        company_name: 'OpenAI',
        role_title: 'Head of Product UX',
        seniority_tier: 'EXEC',
        vibe_status: 'Mindful Focus 🧘',
        streak_count: 15,
        interests: ['Calm Design', 'Tea Breaks', 'Mentorship'],
        is_online: true,
        is_demo: true,
        created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
    },
    {
        id: 'usr-leo-junior',
        username: 'leo.rivera',
        full_name: 'Leo Rivera',
        avatar_url: 'LR',
        company_name: 'Vercel',
        role_title: 'Frontend Engineer',
        seniority_tier: 'JUNIOR',
        vibe_status: '15-min Walk Break 👟',
        streak_count: 6,
        interests: ['Frontend DX', 'Bouldering', 'Hydration'],
        is_online: true,
        is_demo: true,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
        id: 'usr-sana-senior',
        username: 'sana.khan',
        full_name: 'Sana Khan',
        avatar_url: 'SK',
        company_name: 'Figma',
        role_title: 'Principal Systems Architect',
        seniority_tier: 'SENIOR',
        vibe_status: 'Open to Mentorship ☕',
        streak_count: 11,
        interests: ['Design Systems', 'Posture Reset', 'Cycling'],
        is_online: false,
        is_demo: true,
        created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
    },
    {
        id: 'usr-devon-mid',
        username: 'devon.vance',
        full_name: 'Devon Vance',
        avatar_url: 'DV',
        company_name: 'Supabase',
        role_title: 'Core Systems Engineer',
        seniority_tier: 'MID',
        vibe_status: 'Standing Desk Mode 💻',
        streak_count: 8,
        interests: ['PostgreSQL', 'Outdoor Walks', 'Team Wellness'],
        is_online: true,
        is_demo: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
];

const INITIAL_POSTS = [
    {
        id: 'post-101',
        author_id: 'usr-maya-exec',
        author: SEEDED_PROFILES[1],
        content: 'Switched two of our afternoon status calls to 15-minute audio walking meetings today. Everyone came back with better energy and clearer decisions.',
        post_type: 'WIN',
        topic_tag: 'Walking Meetings',
        likes_count: 24,
        comments_count: 4,
        shares_count: 3,
        avg_dwell_time_sec: 10,
        is_demo: true,
        comments_preview: [
            {
                id: 'c-1',
                author_name: 'Kai Nakamura',
                author_company: 'Linear',
                text: 'Walking 1-on-1s are the easiest way to hit 8,000 steps on busy days.',
                created_at: '18m ago',
            },
        ],
        created_at: new Date(Date.now() - 1.2 * 3600000).toISOString(),
    },
    {
        id: 'post-102',
        author_id: 'usr-kai-senior',
        author: SEEDED_PROFILES[2],
        content: 'Quick reminder: if your shoulders are creeping up toward your ears while coding, take 2 minutes for box breathing and a glass of water.',
        post_type: 'UPDATE',
        topic_tag: 'Desk Reset',
        likes_count: 19,
        comments_count: 3,
        shares_count: 2,
        avg_dwell_time_sec: 9,
        is_demo: true,
        comments_preview: [
            {
                id: 'c-2',
                author_name: 'Devon Vance',
                author_company: 'Supabase',
                text: 'Just did the 2-minute breathing timer in the Mindful tab—helped a lot.',
                created_at: '32m ago',
            },
        ],
        created_at: new Date(Date.now() - 2.1 * 3600000).toISOString(),
    },
    {
        id: 'post-103',
        author_id: 'usr-zara-exec',
        author: SEEDED_PROFILES[3],
        content: 'Quick poll for everyone: Which mid-day reset actually helps you feel recharged during a heavy sprint?',
        post_type: 'POLL',
        topic_tag: 'Healthy Habits',
        is_demo: true,
        poll_options: [
            { id: 'opt-1', label: '15-minute outdoor walk with a teammate 👟', votes: 18 },
            { id: 'opt-2', label: '2-minute guided breathing & screen break 🌿', votes: 24 },
            { id: 'opt-3', label: 'Quick hydration & neck stretch at desk 💧', votes: 15 },
        ],
        voted_option_id: null,
        likes_count: 31,
        comments_count: 6,
        shares_count: 4,
        avg_dwell_time_sec: 12,
        comments_preview: [],
        created_at: new Date(Date.now() - 2.8 * 3600000).toISOString(),
    },
    {
        id: 'post-104',
        author_id: 'usr-sana-senior',
        author: SEEDED_PROFILES[5],
        content: 'Happy to host two 15-minute virtual coffee or walk-and-talk chats this month for junior designers or engineers looking for portfolio or systems feedback.',
        post_type: 'WIN',
        topic_tag: 'Peer Mentorship',
        likes_count: 27,
        comments_count: 5,
        shares_count: 4,
        avg_dwell_time_sec: 11,
        is_demo: true,
        comments_preview: [],
        created_at: new Date(Date.now() - 4.2 * 3600000).toISOString(),
    },
];

const INITIAL_FRIEND_REQUESTS = [
    {
        id: 'fr-accepted-maya',
        sender_id: 'usr-alex-01',
        receiver_id: 'usr-maya-exec',
        sender: CURRENT_USER_PROFILE,
        receiver: SEEDED_PROFILES[1],
        status: 'ACCEPTED',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'fr-incoming-zara',
        sender_id: 'usr-zara-exec',
        receiver_id: 'usr-alex-01',
        sender: SEEDED_PROFILES[3],
        receiver: CURRENT_USER_PROFILE,
        status: 'PENDING',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
        id: 'fr-incoming-devon',
        sender_id: 'usr-devon-mid',
        receiver_id: 'usr-alex-01',
        sender: SEEDED_PROFILES[6],
        receiver: CURRENT_USER_PROFILE,
        status: 'PENDING',
        created_at: new Date(Date.now() - 900000).toISOString(),
        updated_at: new Date(Date.now() - 900000).toISOString(),
    },
];

const INITIAL_MESSAGES = [
    {
        id: 'dm-1',
        friendship_id: 'fr-accepted-maya',
        sender_id: 'usr-maya-exec',
        receiver_id: 'usr-alex-01',
        content: 'Hi Alex! Welcome to the community demo. Always happy to connect with fellow builders and share tips on keeping a healthy work rhythm.',
        reaction: '👏',
        is_read: true,
        is_demo: true,
        created_at: new Date(Date.now() - 1800000).toISOString(),
    },
];

export const INITIAL_STORIES = [
    {
        id: 'story-1',
        profile: SEEDED_PROFILES[1],
        headline: 'Mid-day Walk Club 👟',
        media_caption: 'Demo highlight: Taking a 15-minute outdoor loop after lunch instead of scrolling at the desk.',
        gradient: ['#3B6E4C', '#689F77'],
        viewed: false,
        posted_ago: '14m ago',
        is_demo: true,
    },
    {
        id: 'story-2',
        profile: SEEDED_PROFILES[2],
        headline: 'Desk Posture Check 🌿',
        media_caption: 'Demo highlight: Lowered monitor height and took a 2-minute box breathing pause.',
        gradient: ['#4A7C59', '#2E5A3C'],
        viewed: false,
        posted_ago: '42m ago',
        is_demo: true,
    },
    {
        id: 'story-3',
        profile: SEEDED_PROFILES[3],
        headline: 'Afternoon Tea Reset ☕',
        media_caption: 'Demo highlight: Stepping away from notifications for 10 minutes with herbal tea.',
        gradient: ['#5B7A68', '#3B6E4C'],
        viewed: false,
        posted_ago: '1h ago',
        is_demo: true,
    },
    {
        id: 'story-4',
        profile: SEEDED_PROFILES[5],
        headline: 'Mentorship Hours 🤝',
        media_caption: 'Demo highlight: Open for 15-minute peer coffee chats this week.',
        gradient: ['#7C6A4A', '#5C4D34'],
        viewed: false,
        posted_ago: '2h ago',
        is_demo: true,
    },
];

class SupabaseRealtimeEngine {
    currentUser = CURRENT_USER_PROFILE;
    profiles = [...SEEDED_PROFILES];
    posts = [...INITIAL_POSTS];
    interactions = new Map();
    friendRequests = [...INITIAL_FRIEND_REQUESTS];
    messages = [...INITIAL_MESSAGES];
    stories = [...INITIAL_STORIES];
    typingByFriendship = new Map();
    listeners = new Set();

    // UGC Moderation, Blocking, Rules Acceptance & Rate Limiting
    ugcRulesAcceptedAt = null;
    blockedUserIds = new Set();
    hiddenTargetIds = new Set();
    contentReports = [];
    lastActionTimestampMs = 0;

    constructor() {
        this.loadPersistedModerationState();
    }

    async loadPersistedModerationState() {
        try {
            const raw = await AsyncStorage.getItem(MODERATION_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed.ugcRulesAcceptedAt) {
                this.ugcRulesAcceptedAt = parsed.ugcRulesAcceptedAt;
            }
            if (Array.isArray(parsed.blockedUserIds)) {
                this.blockedUserIds = new Set(parsed.blockedUserIds);
            }
            if (Array.isArray(parsed.hiddenTargetIds)) {
                this.hiddenTargetIds = new Set(parsed.hiddenTargetIds);
            }
            if (Array.isArray(parsed.contentReports)) {
                this.contentReports = parsed.contentReports;
            }
            this.notify();
        } catch {
            // ignore storage read error
        }
    }

    async persistModerationState() {
        try {
            const payload = {
                ugcRulesAcceptedAt: this.ugcRulesAcceptedAt,
                blockedUserIds: Array.from(this.blockedUserIds),
                hiddenTargetIds: Array.from(this.hiddenTargetIds),
                contentReports: this.contentReports,
            };
            await AsyncStorage.setItem(MODERATION_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            // ignore storage write error
        }
    }

    acceptUgcRules() {
        this.ugcRulesAcceptedAt = new Date().toISOString();
        this.persistModerationState();
        this.notify();
        return this.ugcRulesAcceptedAt;
    }

    checkRateLimit(cooldownMs = 2000) {
        const now = Date.now();
        if (now - this.lastActionTimestampMs < cooldownMs) {
            return {
                allowed: false,
                error: 'Please wait a moment before submitting another post or comment.',
            };
        }
        this.lastActionTimestampMs = now;
        return { allowed: true };
    }

    blockUser(targetUserId) {
        if (!targetUserId || targetUserId === this.currentUser.id) return false;
        this.blockedUserIds.add(targetUserId);
        this.persistModerationState();
        this.notify();
        return true;
    }

    unblockUser(targetUserId) {
        this.blockedUserIds.delete(targetUserId);
        this.persistModerationState();
        this.notify();
        return true;
    }

    reportContent({ targetId, targetType, authorId, authorName, reason, details = '' }) {
        if (!targetId || !reason || !reason.trim()) {
            return { ok: false, error: 'Please select a reason for reporting this content.' };
        }
        const report = {
            id: `rep-${Date.now()}`,
            targetId,
            targetType: targetType || 'POST',
            authorId: authorId || 'unknown',
            authorName: authorName || 'Community Member',
            reason: reason.trim(),
            details: details.trim(),
            status: 'PENDING_REVIEW',
            createdAt: new Date().toISOString(),
        };
        this.contentReports = [report, ...this.contentReports];
        this.hiddenTargetIds.add(targetId);
        this.persistModerationState();
        this.notify();
        return { ok: true, report };
    }

    purgeUserContent(uid) {
        this.posts = this.posts.filter(
            (p) => p.author_id !== uid && p.author_id !== this.currentUser.id
        );
        this.posts = this.posts.map((p) => ({
            ...p,
            comments_preview: p.comments_preview.filter(
                (c) => c.author_name !== this.currentUser.full_name
            ),
        }));
        this.messages = this.messages.filter(
            (m) => m.sender_id !== uid && m.sender_id !== this.currentUser.id
        );
        this.friendRequests = this.friendRequests.filter((fr) => !fr.id.startsWith('fr-1'));
        this.ugcRulesAcceptedAt = null;
        this.blockedUserIds.clear();
        this.hiddenTargetIds.clear();
        this.contentReports = [];
        AsyncStorage.removeItem(MODERATION_STORAGE_KEY).catch(() => { });
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    notify() {
        this.listeners.forEach((l) => l());
    }

    /**
     * Returns recent posts excluding blocked users and reported items.
     */
    rpcGetRankedFeed() {
        return [...this.posts]
            .filter(
                (p) =>
                    !this.blockedUserIds.has(p.author_id) &&
                    !this.hiddenTargetIds.has(p.id)
            )
            .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
    }

    recordDwellTime(postId, dwellMs) {
        if (dwellMs <= 0) return;
        const existing = this.interactions.get(postId) || {
            id: `inter-${postId}`,
            user_id: this.currentUser.id,
            post_id: postId,
            liked: false,
            saved: false,
            dwell_time_ms: 0,
            created_at: new Date().toISOString(),
        };
        existing.dwell_time_ms += dwellMs;
        this.interactions.set(postId, existing);
    }

    toggleLikePost(postId, forceLike) {
        const existing = this.interactions.get(postId) || {
            id: `inter-${postId}`,
            user_id: this.currentUser.id,
            post_id: postId,
            liked: false,
            saved: false,
            dwell_time_ms: 0,
            created_at: new Date().toISOString(),
        };
        const nextLiked = forceLike !== undefined ? forceLike : !existing.liked;
        if (nextLiked === existing.liked) return existing.liked;
        existing.liked = nextLiked;
        this.interactions.set(postId, existing);
        this.posts = this.posts.map((p) =>
            p.id === postId
                ? { ...p, likes_count: Math.max(0, p.likes_count + (nextLiked ? 1 : -1)) }
                : p
        );
        this.notify();
        return nextLiked;
    }

    toggleSavePost(postId) {
        const existing = this.interactions.get(postId) || {
            id: `inter-${postId}`,
            user_id: this.currentUser.id,
            post_id: postId,
            liked: false,
            saved: false,
            dwell_time_ms: 0,
            created_at: new Date().toISOString(),
        };
        existing.saved = !existing.saved;
        this.interactions.set(postId, existing);
        this.notify();
        return existing.saved;
    }

    voteOnPoll(postId, optionId) {
        this.posts = this.posts.map((p) => {
            if (p.id !== postId || !p.poll_options) return p;
            return {
                ...p,
                voted_option_id: optionId,
                poll_options: p.poll_options.map((o) =>
                    o.id === optionId ? { ...o, votes: o.votes + 1 } : o
                ),
            };
        });
        this.notify();
    }

    addCommentToPost(postId, text) {
        if (!this.ugcRulesAcceptedAt) {
            return {
                ok: false,
                error: 'Please accept the Community Guidelines before posting a reply.',
                requiresUgcAcceptance: true,
            };
        }
        const trimmed = (text || '').trim();
        if (!trimmed) return { ok: false, error: 'Reply cannot be empty.' };
        const rate = this.checkRateLimit(1500);
        if (!rate.allowed) return { ok: false, error: rate.error };

        this.posts = this.posts.map((p) =>
            p.id === postId
                ? {
                    ...p,
                    comments_count: p.comments_count + 1,
                    comments_preview: [
                        ...p.comments_preview,
                        {
                            id: `c-${Date.now()}`,
                            author_name: this.currentUser.full_name,
                            author_company: this.currentUser.company_name,
                            text: trimmed,
                            created_at: 'Just now',
                        },
                    ],
                }
                : p
        );
        this.notify();
        return { ok: true };
    }

    createPost(content, postType, topicTag) {
        if (!this.ugcRulesAcceptedAt) {
            return {
                ok: false,
                error: 'Please accept the Community Guidelines before sharing a post.',
                requiresUgcAcceptance: true,
            };
        }
        const trimmed = (content || '').trim();
        if (!trimmed) {
            return { ok: false, error: 'Please write a message before publishing.' };
        }
        const rate = this.checkRateLimit(2000);
        if (!rate.allowed) return { ok: false, error: rate.error };

        const newPost = {
            id: `post-${Date.now()}`,
            author_id: this.currentUser.id,
            author: this.currentUser,
            content: trimmed,
            post_type: postType || 'UPDATE',
            topic_tag: (topicTag || '').trim() || 'Wellness Update',
            likes_count: 1,
            comments_count: 0,
            shares_count: 0,
            avg_dwell_time_sec: 0,
            is_demo: false,
            comments_preview: [],
            created_at: new Date().toISOString(),
        };
        this.posts = [newPost, ...this.posts];
        this.notify();
        return { ok: true, post: newPost };
    }

    sendFriendRequest(targetProfileId) {
        if (targetProfileId === this.currentUser.id) return null;
        if (this.blockedUserIds.has(targetProfileId)) return null;
        const existing = this.friendRequests.find(
            (fr) =>
                (fr.sender_id === this.currentUser.id && fr.receiver_id === targetProfileId) ||
                (fr.sender_id === targetProfileId && fr.receiver_id === this.currentUser.id)
        );
        if (existing) return existing;
        const target = this.profiles.find((p) => p.id === targetProfileId);
        if (!target) return null;
        const created = {
            id: `fr-${Date.now()}`,
            sender_id: this.currentUser.id,
            receiver_id: targetProfileId,
            sender: this.currentUser,
            receiver: target,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        this.friendRequests = [created, ...this.friendRequests];
        this.notify();
        return created;
    }

    respondToFriendRequest(requestId, status) {
        let updatedRecord = null;
        this.friendRequests = this.friendRequests.map((fr) => {
            if (fr.id !== requestId) return fr;
            updatedRecord = {
                ...fr,
                status,
                updated_at: new Date().toISOString(),
            };
            return updatedRecord;
        });
        this.notify();
        return updatedRecord;
    }

    verifyAcceptedFriendshipRls(friendshipId) {
        const friendship = this.friendRequests.find((fr) => fr.id === friendshipId);
        if (!friendship) {
            return {
                allowed: false,
                error: 'Connection required (Local Demo): Send a connection request before messaging.',
            };
        }
        const partnerId =
            friendship.sender_id === this.currentUser.id
                ? friendship.receiver_id
                : friendship.sender_id;
        if (this.blockedUserIds.has(partnerId)) {
            return {
                allowed: false,
                friendship,
                error: 'You have blocked this user. Unblock them in Profile & Settings to message.',
            };
        }
        if (friendship.status !== 'ACCEPTED') {
            return {
                allowed: false,
                friendship,
                error: `Connection status is '${friendship.status}'. Both coworkers must accept the request before direct messaging.`,
            };
        }
        return { allowed: true, friendship };
    }

    sendDirectMessage(friendshipId, content) {
        if (!this.ugcRulesAcceptedAt) {
            return {
                ok: false,
                error: 'Please accept the Community Guidelines before sending messages.',
                requiresUgcAcceptance: true,
            };
        }
        const rlsCheck = this.verifyAcceptedFriendshipRls(friendshipId);
        if (!rlsCheck.allowed || !rlsCheck.friendship) {
            return { ok: false, error: rlsCheck.error };
        }
        const trimmed = (content || '').trim();
        if (!trimmed) return { ok: false, error: 'Please enter a message.' };
        const rate = this.checkRateLimit(1200);
        if (!rate.allowed) return { ok: false, error: rate.error };

        const partner =
            rlsCheck.friendship.sender_id === this.currentUser.id
                ? rlsCheck.friendship.receiver
                : rlsCheck.friendship.sender;
        const msg = {
            id: `dm-${Date.now()}`,
            friendship_id: friendshipId,
            sender_id: this.currentUser.id,
            receiver_id: partner.id,
            content: trimmed,
            reaction: null,
            is_read: true,
            is_demo: false,
            delivery_status: isSupabaseConfigured ? 'sent' : 'saved_local_demo',
            created_at: new Date().toISOString(),
        };
        this.messages = [...this.messages, msg];
        this.typingByFriendship.set(friendshipId, null);
        this.notify();
        return { ok: true, message: msg };
    }

    reactToMessage(messageId, emoji) {
        this.messages = this.messages.map((m) =>
            m.id === messageId ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m
        );
        this.notify();
    }
}

export const supabaseEngine = new SupabaseRealtimeEngine();

export function useAlgorithmicFeed() {
    const [, setTick] = useState(0);
    useEffect(() => {
        return supabaseEngine.subscribe(() => setTick((t) => t + 1));
    }, []);
    const rankedPosts = useMemo(
        () => supabaseEngine.rpcGetRankedFeed(),
        [
            supabaseEngine.posts,
            supabaseEngine.interactions.size,
            supabaseEngine.blockedUserIds.size,
            supabaseEngine.hiddenTargetIds.size,
        ]
    );
    const filteredStories = useMemo(
        () =>
            supabaseEngine.stories.filter(
                (s) => !supabaseEngine.blockedUserIds.has(s.profile.id)
            ),
        [supabaseEngine.stories, supabaseEngine.blockedUserIds.size]
    );
    const recordDwellTime = useCallback((postId, dwellMs) => {
        supabaseEngine.recordDwellTime(postId, dwellMs);
    }, []);
    const toggleLike = useCallback((postId, forceLike) => {
        return supabaseEngine.toggleLikePost(postId, forceLike);
    }, []);
    const toggleSave = useCallback((postId) => {
        return supabaseEngine.toggleSavePost(postId);
    }, []);
    const votePoll = useCallback((postId, optionId) => {
        supabaseEngine.voteOnPoll(postId, optionId);
    }, []);
    const addComment = useCallback((postId, text) => {
        return supabaseEngine.addCommentToPost(postId, text);
    }, []);
    const createPost = useCallback((content, postType, topicTag) => {
        return supabaseEngine.createPost(content, postType, topicTag);
    }, []);
    const blockUser = useCallback((targetUserId) => {
        return supabaseEngine.blockUser(targetUserId);
    }, []);
    const unblockUser = useCallback((targetUserId) => {
        return supabaseEngine.unblockUser(targetUserId);
    }, []);
    const reportContent = useCallback((params) => {
        return supabaseEngine.reportContent(params);
    }, []);
    const acceptUgcRules = useCallback(() => {
        return supabaseEngine.acceptUgcRules();
    }, []);
    const isPostLiked = useCallback((postId) => {
        return supabaseEngine.interactions.get(postId)?.liked || false;
    }, []);
    const isPostSaved = useCallback((postId) => {
        return supabaseEngine.interactions.get(postId)?.saved || false;
    }, []);
    const getPostDwellMs = useCallback((postId) => {
        return supabaseEngine.interactions.get(postId)?.dwell_time_ms || 0;
    }, []);
    return {
        currentUser: supabaseEngine.currentUser,
        posts: rankedPosts,
        stories: filteredStories,
        ugcRulesAccepted: Boolean(supabaseEngine.ugcRulesAcceptedAt),
        ugcRulesAcceptedAt: supabaseEngine.ugcRulesAcceptedAt,
        blockedUserIds: Array.from(supabaseEngine.blockedUserIds),
        contentReports: supabaseEngine.contentReports,
        recordDwellTime,
        toggleLike,
        toggleSave,
        votePoll,
        addComment,
        createPost,
        blockUser,
        unblockUser,
        reportContent,
        acceptUgcRules,
        isPostLiked,
        isPostSaved,
        getPostDwellMs,
    };
}

export function useFriendRequests() {
    const [, setTick] = useState(0);
    useEffect(() => {
        return supabaseEngine.subscribe(() => setTick((t) => t + 1));
    }, []);
    const currentUserId = supabaseEngine.currentUser.id;
    const incomingPending = supabaseEngine.friendRequests.filter(
        (fr) =>
            fr.receiver_id === currentUserId &&
            fr.status === 'PENDING' &&
            !supabaseEngine.blockedUserIds.has(fr.sender_id)
    );
    const acceptedFriendships = supabaseEngine.friendRequests.filter(
        (fr) =>
            (fr.sender_id === currentUserId || fr.receiver_id === currentUserId) &&
            fr.status === 'ACCEPTED' &&
            !supabaseEngine.blockedUserIds.has(
                fr.sender_id === currentUserId ? fr.receiver_id : fr.sender_id
            )
    );
    const getRelationshipWith = useCallback(
        (targetUserId) => {
            if (supabaseEngine.blockedUserIds.has(targetUserId)) {
                return { status: 'BLOCKED' };
            }
            const found = supabaseEngine.friendRequests.find(
                (fr) =>
                    (fr.sender_id === currentUserId && fr.receiver_id === targetUserId) ||
                    (fr.sender_id === targetUserId && fr.receiver_id === currentUserId)
            );
            if (!found || found.status === 'DECLINED') return { status: 'NONE' };
            if (found.status === 'ACCEPTED') return { status: 'ACCEPTED', record: found };
            if (found.sender_id === currentUserId) {
                return { status: 'PENDING_OUTGOING', record: found };
            }
            return { status: 'PENDING_INCOMING', record: found };
        },
        [currentUserId]
    );
    const sendRequest = useCallback((targetUserId) => {
        return supabaseEngine.sendFriendRequest(targetUserId);
    }, []);
    const acceptRequest = useCallback((requestId) => {
        return supabaseEngine.respondToFriendRequest(requestId, 'ACCEPTED');
    }, []);
    const declineRequest = useCallback((requestId) => {
        return supabaseEngine.respondToFriendRequest(requestId, 'DECLINED');
    }, []);
    return {
        profiles: supabaseEngine.profiles.filter(
            (p) => p.id !== currentUserId && !supabaseEngine.blockedUserIds.has(p.id)
        ),
        allRequests: supabaseEngine.friendRequests,
        incomingPending,
        acceptedFriendships,
        getRelationshipWith,
        sendRequest,
        acceptRequest,
        declineRequest,
    };
}

export function useRealtimeChat(friendshipId) {
    const [, setTick] = useState(0);
    useEffect(() => {
        return supabaseEngine.subscribe(() => setTick((t) => t + 1));
    }, []);
    const rlsStatus = useMemo(() => {
        if (!friendshipId) {
            return { allowed: false, error: 'Select a connection to start chatting.' };
        }
        return supabaseEngine.verifyAcceptedFriendshipRls(friendshipId);
    }, [friendshipId, supabaseEngine.friendRequests, supabaseEngine.blockedUserIds.size]);
    const messages = useMemo(() => {
        if (!friendshipId || !rlsStatus.allowed) return [];
        return supabaseEngine.messages.filter(
            (m) =>
                m.friendship_id === friendshipId &&
                !supabaseEngine.blockedUserIds.has(m.sender_id) &&
                !supabaseEngine.hiddenTargetIds.has(m.id)
        );
    }, [
        friendshipId,
        rlsStatus.allowed,
        supabaseEngine.messages,
        supabaseEngine.blockedUserIds.size,
        supabaseEngine.hiddenTargetIds.size,
    ]);
    const typingUser = friendshipId
        ? supabaseEngine.typingByFriendship.get(friendshipId) || null
        : null;
    const sendMessage = useCallback(
        (content) => {
            if (!friendshipId) return { ok: false, error: 'No active connection selected.' };
            return supabaseEngine.sendDirectMessage(friendshipId, content);
        },
        [friendshipId]
    );
    const reactToMessage = useCallback((messageId, emoji) => {
        supabaseEngine.reactToMessage(messageId, emoji);
    }, []);
    return {
        rlsAllowed: rlsStatus.allowed,
        rlsError: rlsStatus.error,
        friendship: rlsStatus.friendship,
        messages,
        typingUser,
        sendMessage,
        reactToMessage,
    };
}

// ============================================================================
// REAL SUPABASE REST / AUTH / RPC CLIENT (WHEN CONFIGURED VIA ENV VARS)
// ============================================================================
let activeAccessToken = null;

async function getHeaders() {
    if (!activeAccessToken) {
        try {
            const raw = await AsyncStorage.getItem(SUPABASE_AUTH_SESSION_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.access_token && (!parsed.expires_at || parsed.expires_at * 1000 > Date.now())) {
                    activeAccessToken = parsed.access_token;
                }
            }
        } catch {
            // ignore
        }
    }
    return {
        'Content-Type': 'application/json',
        apikey: rawSupabaseAnonKey,
        Authorization: `Bearer ${activeAccessToken || rawSupabaseAnonKey}`,
    };
}

export const supabase = {
    auth: {
        signUp: async ({ email, password }) => {
            if (!isSupabaseConfigured) {
                return {
                    data: null,
                    error: {
                        message:
                            'Supabase backend is not configured (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
                    },
                };
            }
            try {
                const res = await fetch(`${rawSupabaseUrl}/auth/v1/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: rawSupabaseAnonKey,
                    },
                    body: JSON.stringify({ email, password }),
                });
                const json = await res.json();
                if (!res.ok) {
                    return { data: null, error: { message: json.msg || json.error_description || 'Sign-up failed.' } };
                }
                if (json.access_token) {
                    activeAccessToken = json.access_token;
                    await AsyncStorage.setItem(SUPABASE_AUTH_SESSION_KEY, JSON.stringify(json));
                }
                return { data: json, error: null };
            } catch (err) {
                return { data: null, error: { message: `Network error: ${err?.message || 'Unable to reach server.'}` } };
            }
        },
        signInWithPassword: async ({ email, password }) => {
            if (!isSupabaseConfigured) {
                return {
                    data: null,
                    error: {
                        message:
                            'Supabase backend is not configured (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
                    },
                };
            }
            try {
                const res = await fetch(`${rawSupabaseUrl}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: rawSupabaseAnonKey,
                    },
                    body: JSON.stringify({ email, password }),
                });
                const json = await res.json();
                if (!res.ok) {
                    return { data: null, error: { message: json.error_description || json.msg || 'Invalid credentials.' } };
                }
                if (json.access_token) {
                    activeAccessToken = json.access_token;
                    await AsyncStorage.setItem(SUPABASE_AUTH_SESSION_KEY, JSON.stringify(json));
                }
                return { data: json, error: null };
            } catch (err) {
                return { data: null, error: { message: `Network error: ${err?.message || 'Unable to reach server.'}` } };
            }
        },
        signOut: async () => {
            activeAccessToken = null;
            await AsyncStorage.removeItem(SUPABASE_AUTH_SESSION_KEY).catch(() => { });
            return { error: null };
        },
    },
    rpc: async (fnName, args = {}) => {
        if (!isSupabaseConfigured) {
            return {
                data: null,
                error: { message: 'Supabase backend not configured.' },
            };
        }
        try {
            const headers = await getHeaders();
            const res = await fetch(`${rawSupabaseUrl}/rest/v1/rpc/${fnName}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(args),
            });
            const data = await res.json();
            if (!res.ok) {
                return { data: null, error: { message: data?.message || `RPC ${fnName} failed.` } };
            }
            return { data, error: null };
        } catch (err) {
            return { data: null, error: { message: err?.message || 'Network failure.' } };
        }
    },
    from: (table) => ({
        upsert: async (payload, opts = {}) => {
            if (!isSupabaseConfigured) {
                return { data: null, error: { message: 'Supabase not configured.' } };
            }
            try {
                const headers = await getHeaders();
                const onConflictQuery = opts.onConflict ? `?on_conflict=${encodeURIComponent(opts.onConflict)}` : '';
                const res = await fetch(`${rawSupabaseUrl}/rest/v1/${table}${onConflictQuery}`, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        Prefer: 'resolution=merge-duplicates,return=representation',
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                return res.ok ? { data, error: null } : { data: null, error: data };
            } catch (err) {
                return { data: null, error: { message: err?.message || 'Network failure.' } };
            }
        },
        select: (_cols = '*') => ({
            eq: (_col, _val) => ({
                eq: (_col2, _val2) => ({
                    order: async (_orderCol, _orderOpts) => ({
                        data: null,
                        error: isSupabaseConfigured ? null : { message: 'Supabase not configured.' },
                    }),
                }),
            }),
        }),
    }),
    channel: (_name) => {
        const ch = {
            on: (_type, _filter, _callback) => ch,
            subscribe: () => ch,
        };
        return ch;
    },
    removeChannel: (_ch) => { },
};
