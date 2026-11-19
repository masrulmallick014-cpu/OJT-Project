-- ============================================================================
-- PulseCorp × VibeNet: Gen-Z Cross-Company Social & Networking Platform
-- Complete Supabase PostgreSQL Schema, RLS Policies & Algorithmic Feed RPC
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  seniority_tier TEXT NOT NULL CHECK (seniority_tier IN ('JUNIOR', 'MID', 'SENIOR', 'EXEC')),
  vibe_status TEXT NOT NULL DEFAULT 'Vibing ⚡',
  streak_count INT NOT NULL DEFAULT 1,
  interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_company_seniority
  ON public.profiles (company_name, seniority_tier);

-- ----------------------------------------------------------------------------
-- 2. POSTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('UPDATE', 'POLL', 'HOT_TAKE', 'WIN')),
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  shares_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_created
  ON public.posts (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON public.posts (created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. USER_POST_INTERACTIONS TABLE (Algorithmic Signal Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_post_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  liked BOOLEAN NOT NULL DEFAULT FALSE,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  dwell_time_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_post_interaction UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_interactions_post_dwell
  ON public.user_post_interactions (post_id, dwell_time_ms);

-- ----------------------------------------------------------------------------
-- 4. FRIEND_REQUESTS TABLE (Hierarchy-Free Cross-Company Connections)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_friend_request CHECK (sender_id <> receiver_id)
);

-- Unique constraint ensuring only ONE relationship record exists between any two users
CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_requests_canonical_pair
  ON public.friend_requests (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id)
  );

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status
  ON public.friend_requests (receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status
  ON public.friend_requests (sender_id, status);

-- ----------------------------------------------------------------------------
-- 5. MESSAGES TABLE (Real-Time 1-on-1 Cross-Company Chat)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id UUID NOT NULL REFERENCES public.friend_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reaction TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_friendship_created
  ON public.messages (friendship_id, created_at ASC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_post_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Posts RLS
CREATE POLICY "Posts are viewable by authenticated users"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- User Post Interactions RLS
CREATE POLICY "Users can read own interactions"
  ON public.user_post_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own interactions"
  ON public.user_post_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON public.user_post_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friend Requests RLS
CREATE POLICY "Users can view friend requests involving them"
  ON public.friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver or sender can update friend request status"
  ON public.friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- ============================================================================
-- CRITICAL RLS POLICY ON MESSAGES:
-- Strictly verifies a matching row exists in `friend_requests` between
-- `sender_id` and `receiver_id` where `status = 'ACCEPTED'`.
-- If not accepted, message SELECT and INSERT are blocked at the database level.
-- ============================================================================
CREATE POLICY "Messages SELECT requires ACCEPTED friendship"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND EXISTS (
      SELECT 1
      FROM public.friend_requests fr
      WHERE fr.id = messages.friendship_id
        AND fr.status = 'ACCEPTED'
        AND (
          (fr.sender_id = messages.sender_id AND fr.receiver_id = messages.receiver_id)
          OR
          (fr.sender_id = messages.receiver_id AND fr.receiver_id = messages.sender_id)
        )
    )
  );

CREATE POLICY "Messages INSERT requires ACCEPTED friendship"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.friend_requests fr
      WHERE fr.id = messages.friendship_id
        AND fr.status = 'ACCEPTED'
        AND (
          (fr.sender_id = messages.sender_id AND fr.receiver_id = messages.receiver_id)
          OR
          (fr.sender_id = messages.receiver_id AND fr.receiver_id = messages.sender_id)
        )
    )
  );

CREATE POLICY "Participants can update message read state or reaction"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- ============================================================================
-- ALGORITHMIC FEED RPC FUNCTION: `get_ranked_feed`
-- ============================================================================
-- Formula:
-- Score = ((likes_count * 1.5) + (comments_count * 3.0) + (shares_count * 4.0) + (avg_dwell_time_sec * 0.8))
--         / POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.5)
-- Multiplied by a Cross-Company & Cross-Seniority Curiosity Boost (1.25x - 1.45x)
-- when the author is from a different company or seniority tier not yet explored.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_ranked_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  author_id UUID,
  author_username TEXT,
  author_full_name TEXT,
  author_avatar_url TEXT,
  author_company_name TEXT,
  author_role_title TEXT,
  author_seniority_tier TEXT,
  author_vibe_status TEXT,
  content TEXT,
  media_url TEXT,
  post_type TEXT,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  avg_dwell_time_sec NUMERIC,
  computed_score NUMERIC,
  cross_company_boost BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_company TEXT;
  v_user_seniority TEXT;
BEGIN
  SELECT p.company_name, p.seniority_tier
    INTO v_user_company, v_user_seniority
  FROM public.profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  WITH post_dwell_stats AS (
    SELECT
      upi.post_id,
      COALESCE(AVG(upi.dwell_time_ms)::NUMERIC / 1000.0, 0.0) AS avg_dwell_sec
    FROM public.user_post_interactions upi
    GROUP BY upi.post_id
  ),
  interacted_companies AS (
    SELECT DISTINCT prof.company_name
    FROM public.user_post_interactions upi
    JOIN public.posts po ON po.id = upi.post_id
    JOIN public.profiles prof ON prof.id = po.author_id
    WHERE upi.user_id = p_user_id
      AND (upi.liked = TRUE OR upi.dwell_time_ms > 4000)
  )
  SELECT
    po.id AS post_id,
    prof.id AS author_id,
    prof.username AS author_username,
    prof.full_name AS author_full_name,
    prof.avatar_url AS author_avatar_url,
    prof.company_name AS author_company_name,
    prof.role_title AS author_role_title,
    prof.seniority_tier AS author_seniority_tier,
    prof.vibe_status AS author_vibe_status,
    po.content,
    po.media_url,
    po.post_type,
    po.likes_count,
    po.comments_count,
    po.shares_count,
    ROUND(COALESCE(pds.avg_dwell_sec, 3.2), 2) AS avg_dwell_time_sec,
    ROUND(
      (
        (
          (po.likes_count * 1.5) +
          (po.comments_count * 3.0) +
          (po.shares_count * 4.0) +
          (COALESCE(pds.avg_dwell_sec, 3.2) * 0.8)
        )
        /
        POWER((EXTRACT(EPOCH FROM (NOW() - po.created_at)) / 3600.0) + 2.0, 1.5)
      )::NUMERIC
      *
      CASE
        WHEN prof.company_name IS DISTINCT FROM v_user_company
             AND prof.company_name NOT IN (SELECT ic.company_name FROM interacted_companies ic)
          THEN 1.38
        WHEN prof.seniority_tier IS DISTINCT FROM v_user_seniority
          THEN 1.18
        ELSE 1.00
      END,
      4
    ) AS computed_score,
    (prof.company_name IS DISTINCT FROM v_user_company) AS cross_company_boost,
    po.created_at
  FROM public.posts po
  JOIN public.profiles prof ON prof.id = po.author_id
  LEFT JOIN post_dwell_stats pds ON pds.post_id = po.id
  ORDER BY computed_score DESC, po.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Enable Supabase Realtime on core social tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

