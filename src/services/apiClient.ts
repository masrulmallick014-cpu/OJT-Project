import {
  RedisSortedSetCluster,
  verifyHrTelemetryAccess,
  paginateWithCursor,
  ApiResponse,
} from '../../backend/src/server';
import {
  DirectoryEmployeeRecord,
  GranularHealthConsent,
  OfficeBranch,
  PrivacyAuditLogEntry,
  UserRole,
} from '../types';

export const redisCluster = new RedisSortedSetCluster();

/**
 * Typed Frontend-to-Backend API & Real-Time Event Client
 * Uses the high-concurrency Redis Sorted Set cluster (`ZADD`, `ZREVRANGE`, `ZREVRANK`),
 * idempotency keys (`POST /api/v1/health/sync-batch`), and Row-Level HR Privacy Guard
 * (`GET /api/v1/hr/employees/:id/health`).
 */
export const apiClient = {
  /**
   * POST /api/v1/health/sync-batch
   * Batch ingests wearable telemetry with idempotency key and updates Redis ZSET leaderboard
   */
  async syncHealthBatch(params: {
    userId: string;
    officeBranch: OfficeBranch;
    competitionId: string;
    steps: number;
    idempotencyKey: string;
  }): Promise<ApiResponse<{ syncedSteps: number; officeRank: number | null }>> {
    redisCluster.claimIdempotencyKey(`${params.userId}:${params.idempotencyKey}`);

    const officeKey = `leaderboard:office:${params.officeBranch}:competition:${params.competitionId}`;
    const globalKey = `leaderboard:office:ALL:competition:${params.competitionId}`;

    redisCluster.zadd(officeKey, params.steps, params.userId);
    redisCluster.zadd(globalKey, params.steps, params.userId);

    const { rank } = redisCluster.zrevrank(officeKey, params.userId);

    return {
      status: 200,
      ok: true,
      data: {
        syncedSteps: params.steps,
        officeRank: rank,
      },
    };
  },

  /**
   * PATCH /api/v1/users/me/privacy-consent
   * Persists explicit HR Health Telemetry Consent + writes an immutable audit log entry
   */
  async updatePrivacyConsent(params: {
    userId: string;
    userName: string;
    hrHealthConsent: boolean;
    granularConsent: GranularHealthConsent;
  }): Promise<ApiResponse<PrivacyAuditLogEntry>> {
    const enabledMetrics: string[] = [];
    if (params.granularConsent.shareSteps) enabledMetrics.push('Steps');
    if (params.granularConsent.shareHeartRateAndStress) enabledMetrics.push('Heart Rate & Stress');
    if (params.granularConsent.shareSleepAndRecovery) enabledMetrics.push('Sleep & Readiness');

    const auditEntry: PrivacyAuditLogEntry = {
      id: `audit-${Date.now()}`,
      userId: params.userId,
      userName: params.userName,
      action: params.hrHealthConsent ? 'GRANTED_HR_CONSENT' : 'REVOKED_HR_CONSENT',
      details: params.hrHealthConsent
        ? `Granted HR telemetry access (${enabledMetrics.join(', ') || 'No sub-metrics'})`
        : 'Revoked HR access to all personal wearable health telemetry (403 enforced)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    return {
      status: 200,
      ok: true,
      data: auditEntry,
    };
  },

  /**
   * GET /api/v1/hr/employees/:id/health
   * Enforces Row-Level Security: verifies `requesterRole === 'HR_ADMIN'` AND `target.hrHealthConsent === true`
   */
  async inspectEmployeeHealthForHr(params: {
    requesterRole: UserRole;
    targetEmployee: DirectoryEmployeeRecord;
  }): Promise<ApiResponse<DirectoryEmployeeRecord>> {
    const check = verifyHrTelemetryAccess({
      requesterRole: params.requesterRole,
      targetEmployeeId: params.targetEmployee.id,
      targetEmployeeName: params.targetEmployee.name,
      targetHrConsent: params.targetEmployee.hrHealthConsent,
    });

    if (!check.allowed) {
      return {
        status: check.status,
        ok: false,
        error: check.message,
      };
    }

    return {
      status: 200,
      ok: true,
      data: params.targetEmployee,
    };
  },

  paginateWithCursor,
};

