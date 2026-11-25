import {
  RedisSortedSetCluster,
  verifyHrTelemetryAccess,
  paginateWithCursor,
} from '../../backend/src/server';

export const redisCluster = new RedisSortedSetCluster();

/**
 * Local in-memory client helper for leaderboard ranking and HR consent checks.
 * Note: This operates locally in memory on the device and does not call a
 * remote server.
 */
export const apiClient = {
  async syncHealthBatch(params) {
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

  async updatePrivacyConsent(params) {
    const enabledMetrics = [];
    if (params.granularConsent.shareSteps) enabledMetrics.push('Steps');
    if (params.granularConsent.shareHeartRateAndStress) enabledMetrics.push('Heart Rate & Stress');
    if (params.granularConsent.shareSleepAndRecovery) enabledMetrics.push('Sleep & Readiness');

    const auditEntry = {
      id: `audit-${Date.now()}`,
      userId: params.userId,
      userName: params.userName,
      action: params.hrHealthConsent ? 'GRANTED_HR_CONSENT' : 'REVOKED_HR_CONSENT',
      details: params.hrHealthConsent
        ? `Opted in to share with HR (${enabledMetrics.join(', ') || 'No sub-metrics selected'})`
        : 'Opted out of HR health sharing (default private state)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    return {
      status: 200,
      ok: true,
      data: auditEntry,
    };
  },

  async inspectEmployeeHealthForHr(params) {
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
