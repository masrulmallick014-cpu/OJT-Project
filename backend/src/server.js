/**
 * ============================================================================
 * PulseCorp Local In-Memory Demo Helpers
 * ============================================================================
 * Note: This file runs in-memory inside the client bundle for local demo and
 * prototyping purposes. It is NOT a deployed server, external Redis cluster,
 * or database-enforced security layer.
 */

export class RedisSortedSetCluster {
  constructor() {
    this.zsets = new Map();
    this.hashes = new Map();
    this.idempotencyKeys = new Set();
  }

  zadd(key, score, member) {
    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }
    this.zsets.get(key).set(member, score);
  }

  zincrby(key, increment, member) {
    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }
    const set = this.zsets.get(key);
    const next = (set.get(member) || 0) + increment;
    set.set(member, next);
    return next;
  }

  zrevrangeWithScores(key, start, stop) {
    const set = this.zsets.get(key);
    if (!set) return [];
    const sorted = Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
    const sliceEnd = stop < 0 ? sorted.length : stop + 1;
    return sorted.slice(start, sliceEnd).map(([member, score], idx) => ({
      member,
      score,
      rank: start + idx + 1,
    }));
  }

  zrevrank(key, member) {
    const set = this.zsets.get(key);
    if (!set || !set.has(member)) return { rank: null, score: 0 };
    const sorted = Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([m]) => m === member);
    return {
      rank: idx >= 0 ? idx + 1 : null,
      score: set.get(member) || 0,
    };
  }

  hincrby(hashKey, field, delta) {
    if (!this.hashes.has(hashKey)) {
      this.hashes.set(hashKey, new Map());
    }
    const h = this.hashes.get(hashKey);
    const updated = Math.max(0, (h.get(field) || 0) + delta);
    h.set(field, updated);
    return updated;
  }

  claimIdempotencyKey(key) {
    if (this.idempotencyKeys.has(key)) {
      return false;
    }
    this.idempotencyKeys.add(key);
    return true;
  }
}

/**
 * Client-side demo check for HR health data access.
 * Checks the signed-in user's role (`requesterRole === 'HR_ADMIN'`) AND whether
 * the target employee explicitly opted in (`targetHrConsent === true`).
 */
export function verifyHrTelemetryAccess(params) {
  if (params.requesterRole !== 'HR_ADMIN') {
    return {
      allowed: false,
      status: 403,
      message:
        'Access blocked (Local Demo Check): Your current role is Employee. Only an HR Admin role can inspect shared employee health records.',
    };
  }

  if (!params.targetHrConsent) {
    return {
      allowed: false,
      status: 403,
      message: `Access blocked (Local Demo Check): ${params.targetEmployeeName} has not opted in to share health data with HR.`,
    };
  }

  return {
    allowed: true,
    status: 200,
    message: 'Access allowed (Local Demo Check): Employee has explicitly opted in.',
  };
}

export function paginateWithCursor(items, cursor = null, limit = 20) {
  let startIndex = 0;
  if (cursor) {
    const foundIdx = items.findIndex((item) => item.id === cursor);
    if (foundIdx >= 0) {
      startIndex = foundIdx + 1;
    }
  }
  const page = items.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < items.length ? page[page.length - 1]?.id || null : null;
  return { items: page, nextCursor };
}
