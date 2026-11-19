import { useState, useEffect, useCallback, useMemo } from 'react';

export type SeniorityTier = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXEC';
export type PostType = 'UPDATE' | 'POLL' | 'HOT_TAKE' | 'WIN';
export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface SocialProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  company_name: string;
  role_title: string;
  seniority_tier: SeniorityTier;
  vibe_status: string;
  streak_count: number;
  interests: string[];
  is_online?: boolean;
  created_at: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface SocialPost {
  id: string;
  author_id: string;
  author: SocialProfile;
  content: string;
  media_url?: string;
  post_type: PostType;
  poll_options?: PollOption[];
  voted_option_id?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  avg_dwell_time_sec: number;
  computed_score?: number;
  cross_company_boost?: boolean;
  topic_tag: string;
  comments_preview: Array<{
    id: string;
    author_name: string;
    author_company: string;
    text: string;
    created_at: string;
  }>;
  created_at: string;
}

export interface UserPostInteraction {
  id: string;
  user_id: string;
  post_id: string;
  liked: boolean;
  saved: boolean;
  dwell_time_ms: number;
  created_at: string;
}

export interface FriendRequestRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender: SocialProfile;
  receiver: SocialProfile;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface DirectMessageRecord {
  id: string;
  friendship_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  reaction: string | null;
  is_read: boolean;
  created_at: string;
}

export interface EphemeralStoryRing {
  id: string;
  profile: SocialProfile;
  headline: string;
  media_caption: string;
  gradient: readonly [string, string];
  viewed: boolean;
  posted_ago: string;
}

// ============================================================================
// PRE-SEEDED MULTI-COMPANY GEN-Z PROFILES (MIXING JUNIOR, MID, SENIOR & EXEC)
// ============================================================================
export const CURRENT_USER_PROFILE: SocialProfile = {
  id: 'usr-alex-01',
  username: 'alex.morgan',
  full_name: 'Alex Morgan',
  avatar_url: 'AM',
  company_name: 'Acme Studio',
  role_title: 'Product Designer',
  seniority_tier: 'JUNIOR',
  vibe_status: 'Building 🚀',
  streak_count: 14,
  interests: ['Design Systems', 'AI UX', 'React Native', 'Run Club'],
  is_online: true,
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
};

export const SEEDED_PROFILES: SocialProfile[] = [
  CURRENT_USER_PROFILE,
  {
    id: 'usr-maya-exec',
    username: 'maya.lin',
    full_name: 'Maya Lin',
    avatar_url: 'ML',
    company_name: 'Stripe',
    role_title: 'VP of Product Engineering',
    seniority_tier: 'EXEC',
    vibe_status: 'Open to Coffee ☕',
    streak_count: 42,
    interests: ['Distributed Systems', 'Fintech', 'Mentorship', 'Espresso'],
    is_online: true,
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
    vibe_status: 'Vibing ⚡',
    streak_count: 29,
    interests: ['60fps Animations', 'Shaders', 'Keyboards'],
    is_online: true,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'usr-zara-exec',
    username: 'zara.patel',
    full_name: 'Zara Patel',
    avatar_url: 'ZP',
    company_name: 'OpenAI',
    role_title: 'Head of Multimodal UX',
    seniority_tier: 'EXEC',
    vibe_status: 'Shipping Agents 🤖',
    streak_count: 51,
    interests: ['Voice Interfaces', 'Gen-Z Social', 'Matcha'],
    is_online: true,
    created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
  },
  {
    id: 'usr-leo-junior',
    username: 'leo.rivera',
    full_name: 'Leo Rivera',
    avatar_url: 'LR',
    company_name: 'Vercel',
    role_title: 'Frontend DX Engineer',
    seniority_tier: 'JUNIOR',
    vibe_status: 'Late Night Coding 🌙',
    streak_count: 19,
    interests: ['Next.js', 'Edge Compute', 'Bouldering'],
    is_online: true,
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
    vibe_status: 'Open to Coffee ☕',
    streak_count: 37,
    interests: ['WebAssembly', 'Canvas Engines', 'Indie Games'],
    is_online: false,
    created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
  },
  {
    id: 'usr-devon-mid',
    username: 'devon.vance',
    full_name: 'Devon Vance',
    avatar_url: 'DV',
    company_name: 'Supabase',
    role_title: 'Realtime Core Engineer',
    seniority_tier: 'MID',
    vibe_status: 'Postgres Maxxing 🐘',
    streak_count: 33,
    interests: ['PostgreSQL', 'Elixir', 'RLS Policies'],
    is_online: true,
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
];

const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'post-101',
    author_id: 'usr-maya-exec',
    author: SEEDED_PROFILES[1],
    content:
      'Hot take: The best product breakthroughs happen when a junior designer or engineer skips 4 layers of hierarchy and DMs a VP directly with a working prototype. My inbox is always open for builders across any company ⚡',
    post_type: 'HOT_TAKE',
    topic_tag: 'Hierarchy-Free Culture',
    likes_count: 342,
    comments_count: 64,
    shares_count: 51,
    avg_dwell_time_sec: 14.8,
    comments_preview: [
      {
        id: 'c-1',
        author_name: 'Kai Nakamura',
        author_company: 'Linear',
        text: '100% this. Zero gatekeeping = 10x faster shipping.',
        created_at: '18m ago',
      },
    ],
    created_at: new Date(Date.now() - 1.2 * 3600000).toISOString(),
  },
  {
    id: 'post-102',
    author_id: 'usr-kai-senior',
    author: SEEDED_PROFILES[2],
    content:
      'Just shaved our React Native feed frame time from 14ms down to 4.2ms using spring physics + dwell-time prefetching. Double-tap this card to test the 60fps haptic burst 💜',
    post_type: 'WIN',
    topic_tag: '60fps Craft',
    likes_count: 289,
    comments_count: 42,
    shares_count: 38,
    avg_dwell_time_sec: 11.4,
    comments_preview: [
      {
        id: 'c-2',
        author_name: 'Devon Vance',
        author_company: 'Supabase',
        text: 'Pair that with pg_graphql + Realtime Broadcast and it feels telepathic.',
        created_at: '32m ago',
      },
    ],
    created_at: new Date(Date.now() - 2.1 * 3600000).toISOString(),
  },
  {
    id: 'post-103',
    author_id: 'usr-zara-exec',
    author: SEEDED_PROFILES[3],
    content:
      'Quick poll for builders across all studios: What makes you stay on a social app longer?',
    post_type: 'POLL',
    topic_tag: 'Product Psychology',
    poll_options: [
      { id: 'opt-1', label: 'Cross-company 1-on-1 coffee chats ☕', votes: 184 },
      { id: 'opt-2', label: 'Raw unpolished build-in-public wins 🚀', votes: 246 },
      { id: 'opt-3', label: 'Spicy engineering & design hot takes 🔥', votes: 159 },
    ],
    voted_option_id: null,
    likes_count: 418,
    comments_count: 89,
    shares_count: 44,
    avg_dwell_time_sec: 16.2,
    comments_preview: [],
    created_at: new Date(Date.now() - 2.8 * 3600000).toISOString(),
  },
  {
    id: 'post-104',
    author_id: 'usr-devon-mid',
    author: SEEDED_PROFILES[6],
    content:
      'PSA for everyone building real-time chat on Supabase: enforce your friendship status check inside the PostgreSQL RLS `WITH CHECK` clause on `messages`, not just in client UI. Zero unauthorized DMs ever.',
    post_type: 'UPDATE',
    topic_tag: 'Supabase RLS',
    likes_count: 195,
    comments_count: 31,
    shares_count: 29,
    avg_dwell_time_sec: 12.1,
    comments_preview: [],
    created_at: new Date(Date.now() - 3.6 * 3600000).toISOString(),
  },
  {
    id: 'post-105',
    author_id: 'usr-sana-senior',
    author: SEEDED_PROFILES[5],
    content:
      'Shipped our new multiplayer shader canvas today! Looking to mentor 2 junior designers or engineers from other companies this month — hit `+ Vibe / Connect` on my card.',
    post_type: 'WIN',
    topic_tag: 'Cross-Company Mentorship',
    likes_count: 376,
    comments_count: 73,
    shares_count: 62,
    avg_dwell_time_sec: 15.5,
    comments_preview: [],
    created_at: new Date(Date.now() - 4.2 * 3600000).toISOString(),
  },
  {
    id: 'post-106',
    author_id: 'usr-leo-junior',
    author: SEEDED_PROFILES[4],
    content:
      'First month as a Junior DX Engineer at Vercel! Connected with a VP at Stripe and a Staff Engineer at Linear right here without cold-emailing into the void ⚡',
    post_type: 'UPDATE',
    topic_tag: 'Junior To Senior Bridge',
    likes_count: 264,
    comments_count: 48,
    shares_count: 27,
    avg_dwell_time_sec: 10.9,
    comments_preview: [],
    created_at: new Date(Date.now() - 5.0 * 3600000).toISOString(),
  },
];

const INITIAL_FRIEND_REQUESTS: FriendRequestRecord[] = [
  {
    id: 'fr-accepted-maya',
    sender_id: 'usr-alex-01',
    receiver_id: 'usr-maya-exec',
    sender: CURRENT_USER_PROFILE,
    receiver: SEEDED_PROFILES[1], // Maya Lin (VP at Stripe, EXEC)
    status: 'ACCEPTED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'fr-incoming-zara',
    sender_id: 'usr-zara-exec',
    receiver_id: 'usr-alex-01',
    sender: SEEDED_PROFILES[3], // Zara Patel (Head of Multimodal UX at OpenAI, EXEC)
    receiver: CURRENT_USER_PROFILE,
    status: 'PENDING',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'fr-incoming-devon',
    sender_id: 'usr-devon-mid',
    receiver_id: 'usr-alex-01',
    sender: SEEDED_PROFILES[6], // Devon Vance (Supabase)
    receiver: CURRENT_USER_PROFILE,
    status: 'PENDING',
    created_at: new Date(Date.now() - 900000).toISOString(),
    updated_at: new Date(Date.now() - 900000).toISOString(),
  },
];

const INITIAL_MESSAGES: DirectMessageRecord[] = [
  {
    id: 'dm-1',
    friendship_id: 'fr-accepted-maya',
    sender_id: 'usr-maya-exec',
    receiver_id: 'usr-alex-01',
    content:
      'Hey Alex! Saw your work at Acme Studio — always excited to connect with junior & mid designers building cool mobile interfaces. How is the new sprint going?',
    reaction: '🔥',
    is_read: true,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const INITIAL_STORIES: EphemeralStoryRing[] = [
  {
    id: 'story-1',
    profile: SEEDED_PROFILES[1],
    headline: 'Stripe Demo Day ⚡',
    media_caption: 'Behind the scenes at Stripe HQ — shipping sub-10ms checkout flows.',
    gradient: ['#A855F7', '#EC4899'] as const,
    viewed: false,
    posted_ago: '14m ago',
  },
  {
    id: 'story-2',
    profile: SEEDED_PROFILES[2],
    headline: '60fps Spring Lab 🎯',
    media_caption: 'Testing custom Reanimated gesture physics on iOS & Web.',
    gradient: ['#06B6D4', '#3B82F6'] as const,
    viewed: false,
    posted_ago: '42m ago',
  },
  {
    id: 'story-3',
    profile: SEEDED_PROFILES[3],
    headline: 'OpenAI Design Crit 🤖',
    media_caption: 'Exploring zero-latency voice + haptic interfaces.',
    gradient: ['#10B981', '#06B6D4'] as const,
    viewed: false,
    posted_ago: '1h ago',
  },
  {
    id: 'story-4',
    profile: SEEDED_PROFILES[5],
    headline: 'Figma Shader Jam ✨',
    media_caption: 'Office hours open for junior builders across all companies!',
    gradient: ['#F59E0B', '#EF4444'] as const,
    viewed: false,
    posted_ago: '2h ago',
  },
];

// ============================================================================
// REALTIME PUB/SUB STORE BACKING SUPABASE HOOKS & RLS ENFORCEMENT
// ============================================================================
type Listener = () => void;

class SupabaseRealtimeEngine {
  public currentUser: SocialProfile = CURRENT_USER_PROFILE;
  public profiles: SocialProfile[] = [...SEEDED_PROFILES];
  public posts: SocialPost[] = [...INITIAL_POSTS];
  public interactions: Map<string, UserPostInteraction> = new Map();
  public friendRequests: FriendRequestRecord[] = [...INITIAL_FRIEND_REQUESTS];
  public messages: DirectMessageRecord[] = [...INITIAL_MESSAGES];
  public stories: EphemeralStoryRing[] = [...INITIAL_STORIES];
  public typingByFriendship: Map<string, string | null> = new Map();
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * Executes the exact `get_ranked_feed` PostgreSQL RPC scoring algorithm:
   * Score = ((likes_count * 1.5) + (comments_count * 3.0) + (shares_count * 4.0) + (avg_dwell_time_sec * 0.8))
   *         / POWER(hours_since_created + 2, 1.5)
   * with Cross-Company & Cross-Seniority Curiosity Boost.
   */
  public rpcGetRankedFeed(): SocialPost[] {
    const interactedCompanies = new Set<string>();
    this.interactions.forEach((inter) => {
      if (inter.liked || inter.dwell_time_ms > 4000) {
        const post = this.posts.find((p) => p.id === inter.post_id);
        if (post) interactedCompanies.add(post.author.company_name);
      }
    });

    return [...this.posts]
      .map((post) => {
        const hoursAge = Math.max(
          0.1,
          (Date.now() - new Date(post.created_at).getTime()) / 3600000
        );
        const userInter = this.interactions.get(post.id);
        const extraDwellSec = userInter ? userInter.dwell_time_ms / 1000 : 0;
        const effectiveDwellSec = post.avg_dwell_time_sec + extraDwellSec * 0.35;

        const baseNumerator =
          post.likes_count * 1.5 +
          post.comments_count * 3.0 +
          post.shares_count * 4.0 +
          effectiveDwellSec * 0.8;
        const gravityDenominator = Math.pow(hoursAge + 2.0, 1.5);

        const isDifferentCompany =
          post.author.company_name !== this.currentUser.company_name;
        const isUnexploredCompany =
          isDifferentCompany && !interactedCompanies.has(post.author.company_name);
        const isDifferentSeniority =
          post.author.seniority_tier !== this.currentUser.seniority_tier;

        const multiplier = isUnexploredCompany
          ? 1.38
          : isDifferentSeniority
          ? 1.18
          : 1.0;

        const computedScore =
          Math.round((baseNumerator / gravityDenominator) * multiplier * 100) / 100;

        return {
          ...post,
          avg_dwell_time_sec: Math.round(effectiveDwellSec * 10) / 10,
          computed_score: computedScore,
          cross_company_boost: isDifferentCompany,
        };
      })
      .sort((a, b) => (b.computed_score || 0) - (a.computed_score || 0));
  }

  public recordDwellTime(postId: string, dwellMs: number): void {
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
    this.notify();
  }

  public toggleLikePost(postId: string, forceLike?: boolean): boolean {
    const existing = this.interactions.get(postId) || {
      id: `inter-${postId}`,
      user_id: this.currentUser.id,
      post_id: postId,
      liked: false,
      saved: false,
      dwell_time_ms: 1200,
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

  public toggleSavePost(postId: string): boolean {
    const existing = this.interactions.get(postId) || {
      id: `inter-${postId}`,
      user_id: this.currentUser.id,
      post_id: postId,
      liked: false,
      saved: false,
      dwell_time_ms: 1000,
      created_at: new Date().toISOString(),
    };
    existing.saved = !existing.saved;
    this.interactions.set(postId, existing);
    this.notify();
    return existing.saved;
  }

  public voteOnPoll(postId: string, optionId: string): void {
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

  public addCommentToPost(postId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
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
  }

  public createPost(content: string, postType: PostType, topicTag: string): void {
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author_id: this.currentUser.id,
      author: this.currentUser,
      content: content.trim(),
      post_type: postType,
      topic_tag: topicTag.trim() || 'Cross-Company Build',
      likes_count: 1,
      comments_count: 0,
      shares_count: 0,
      avg_dwell_time_sec: 6.5,
      comments_preview: [],
      created_at: new Date().toISOString(),
    };
    this.posts = [newPost, ...this.posts];
    this.notify();
  }

  public sendFriendRequest(targetProfileId: string): FriendRequestRecord | null {
    if (targetProfileId === this.currentUser.id) return null;
    const existing = this.friendRequests.find(
      (fr) =>
        (fr.sender_id === this.currentUser.id && fr.receiver_id === targetProfileId) ||
        (fr.sender_id === targetProfileId && fr.receiver_id === this.currentUser.id)
    );
    if (existing) return existing;

    const target = this.profiles.find((p) => p.id === targetProfileId);
    if (!target) return null;

    const created: FriendRequestRecord = {
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

  public respondToFriendRequest(
    requestId: string,
    status: 'ACCEPTED' | 'DECLINED'
  ): FriendRequestRecord | null {
    let updatedRecord: FriendRequestRecord | null = null;
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

  /**
   * CRITICAL RLS POLICY ENFORCEMENT ON `messages`:
   * Verifies a matching row exists in `friend_requests` where `status === 'ACCEPTED'`
   * before allowing SELECT or INSERT.
   */
  public verifyAcceptedFriendshipRls(friendshipId: string): {
    allowed: boolean;
    friendship?: FriendRequestRecord;
    error?: string;
  } {
    const friendship = this.friendRequests.find((fr) => fr.id === friendshipId);
    if (!friendship) {
      return {
        allowed: false,
        error: '403 RLS Policy Violation: No friend_requests record exists between these users.',
      };
    }
    if (friendship.status !== 'ACCEPTED') {
      return {
        allowed: false,
        friendship,
        error: `403 RLS Policy Violation: Friendship status is '${friendship.status}'. Both users must accept the connection before messaging.`,
      };
    }
    return { allowed: true, friendship };
  }

  public sendDirectMessage(
    friendshipId: string,
    content: string
  ): { ok: boolean; error?: string; message?: DirectMessageRecord } {
    const rlsCheck = this.verifyAcceptedFriendshipRls(friendshipId);
    if (!rlsCheck.allowed || !rlsCheck.friendship) {
      return { ok: false, error: rlsCheck.error };
    }

    const trimmed = content.trim();
    if (!trimmed) return { ok: false, error: 'Empty message' };

    const partner =
      rlsCheck.friendship.sender_id === this.currentUser.id
        ? rlsCheck.friendship.receiver
        : rlsCheck.friendship.sender;

    const msg: DirectMessageRecord = {
      id: `dm-${Date.now()}`,
      friendship_id: friendshipId,
      sender_id: this.currentUser.id,
      receiver_id: partner.id,
      content: trimmed,
      reaction: null,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    this.messages = [...this.messages, msg];
    this.notify();

    // Simulate Supabase Realtime Broadcast typing indicator + cross-company reply
    this.typingByFriendship.set(friendshipId, partner.full_name);
    this.notify();

    setTimeout(() => {
      this.typingByFriendship.set(friendshipId, null);
      const replyMsg: DirectMessageRecord = {
        id: `dm-reply-${Date.now()}`,
        friendship_id: friendshipId,
        sender_id: partner.id,
        receiver_id: this.currentUser.id,
        content: `Love that perspective, ${this.currentUser.full_name.split(' ')[0]}! Let's set up a quick 15-min cross-company jam between ${this.currentUser.company_name} and ${partner.company_name} 🚀`,
        reaction: '⚡',
        is_read: true,
        created_at: new Date().toISOString(),
      };
      this.messages = [...this.messages, replyMsg];
      this.notify();
    }, 1100);

    return { ok: true, message: msg };
  }

  public reactToMessage(messageId: string, emoji: string): void {
    this.messages = this.messages.map((m) =>
      m.id === messageId
        ? { ...m, reaction: m.reaction === emoji ? null : emoji }
        : m
    );
    this.notify();
  }
}

export const supabaseEngine = new SupabaseRealtimeEngine();

// ============================================================================
// CUSTOM HOOK 1: `useAlgorithmicFeed()`
// ============================================================================
export function useAlgorithmicFeed() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return supabaseEngine.subscribe(() => setTick((t) => t + 1));
  }, []);

  const rankedPosts = useMemo(() => supabaseEngine.rpcGetRankedFeed(), [
    // recompute on store notification
    supabaseEngine.posts,
    supabaseEngine.interactions.size,
  ]);

  const recordDwellTime = useCallback((postId: string, dwellMs: number) => {
    supabaseEngine.recordDwellTime(postId, dwellMs);
  }, []);

  const toggleLike = useCallback((postId: string, forceLike?: boolean) => {
    return supabaseEngine.toggleLikePost(postId, forceLike);
  }, []);

  const toggleSave = useCallback((postId: string) => {
    return supabaseEngine.toggleSavePost(postId);
  }, []);

  const votePoll = useCallback((postId: string, optionId: string) => {
    supabaseEngine.voteOnPoll(postId, optionId);
  }, []);

  const addComment = useCallback((postId: string, text: string) => {
    supabaseEngine.addCommentToPost(postId, text);
  }, []);

  const createPost = useCallback(
    (content: string, postType: PostType, topicTag: string) => {
      supabaseEngine.createPost(content, postType, topicTag);
    },
    []
  );

  const isPostLiked = useCallback((postId: string) => {
    return supabaseEngine.interactions.get(postId)?.liked || false;
  }, []);

  const isPostSaved = useCallback((postId: string) => {
    return supabaseEngine.interactions.get(postId)?.saved || false;
  }, []);

  const getPostDwellMs = useCallback((postId: string) => {
    return supabaseEngine.interactions.get(postId)?.dwell_time_ms || 0;
  }, []);

  return {
    currentUser: supabaseEngine.currentUser,
    posts: rankedPosts,
    stories: supabaseEngine.stories,
    recordDwellTime,
    toggleLike,
    toggleSave,
    votePoll,
    addComment,
    createPost,
    isPostLiked,
    isPostSaved,
    getPostDwellMs,
  };
}

// ============================================================================
// CUSTOM HOOK 2: `useFriendRequests()`
// ============================================================================
export function useFriendRequests() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return supabaseEngine.subscribe(() => setTick((t) => t + 1));
  }, []);

  const currentUserId = supabaseEngine.currentUser.id;

  const incomingPending = supabaseEngine.friendRequests.filter(
    (fr) => fr.receiver_id === currentUserId && fr.status === 'PENDING'
  );

  const acceptedFriendships = supabaseEngine.friendRequests.filter(
    (fr) =>
      (fr.sender_id === currentUserId || fr.receiver_id === currentUserId) &&
      fr.status === 'ACCEPTED'
  );

  const getRelationshipWith = useCallback(
    (targetUserId: string): {
      status: 'NONE' | 'PENDING_OUTGOING' | 'PENDING_INCOMING' | 'ACCEPTED';
      record?: FriendRequestRecord;
    } => {
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

  const sendRequest = useCallback((targetUserId: string) => {
    return supabaseEngine.sendFriendRequest(targetUserId);
  }, []);

  const acceptRequest = useCallback((requestId: string) => {
    return supabaseEngine.respondToFriendRequest(requestId, 'ACCEPTED');
  }, []);

  const declineRequest = useCallback((requestId: string) => {
    return supabaseEngine.respondToFriendRequest(requestId, 'DECLINED');
  }, []);

  return {
    profiles: supabaseEngine.profiles.filter((p) => p.id !== currentUserId),
    allRequests: supabaseEngine.friendRequests,
    incomingPending,
    acceptedFriendships,
    getRelationshipWith,
    sendRequest,
    acceptRequest,
    declineRequest,
  };
}

// ============================================================================
// CUSTOM HOOK 3: `useRealtimeChat(friendshipId)`
// ============================================================================
export function useRealtimeChat(friendshipId: string | null) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return supabaseEngine.subscribe(() => setTick((t) => t + 1));
  }, []);

  const rlsStatus = useMemo(() => {
    if (!friendshipId) {
      return { allowed: false, error: 'Select a connection to start chatting.' };
    }
    return supabaseEngine.verifyAcceptedFriendshipRls(friendshipId);
  }, [friendshipId, supabaseEngine.friendRequests]);

  const messages = useMemo(() => {
    if (!friendshipId || !rlsStatus.allowed) return [];
    return supabaseEngine.messages.filter((m) => m.friendship_id === friendshipId);
  }, [friendshipId, rlsStatus.allowed, supabaseEngine.messages]);

  const typingUser = friendshipId
    ? supabaseEngine.typingByFriendship.get(friendshipId) || null
    : null;

  const sendMessage = useCallback(
    (content: string) => {
      if (!friendshipId) return { ok: false, error: 'No active friendshipId' };
      return supabaseEngine.sendDirectMessage(friendshipId, content);
    },
    [friendshipId]
  );

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
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
// SUPABASE CLOUD CLIENT & REALTIME CHANNEL ADAPTER
// ============================================================================
export const isSupabaseConfigured = Boolean(
  typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_SUPABASE_URL &&
    process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase: any = {
  from: (_table: string) => ({
    upsert: async (_payload: any, _opts?: any) => ({ data: _payload, error: null }),
    select: (_cols?: string) => ({
      eq: (_col: string, _val: any) => ({
        eq: (_col2: string, _val2: any) => ({
          order: async (_orderCol: string, _orderOpts?: any) => ({
            data: null,
            error: null,
          }),
        }),
      }),
    }),
  }),
  channel: (_name: string) => {
    const ch: any = {
      on: (_type: string, _filter: any, _callback: () => void) => ch,
      subscribe: () => ch,
    };
    return ch;
  },
  removeChannel: (_ch: any) => {},
};


