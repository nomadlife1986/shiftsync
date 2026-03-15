/**
 * Analytics GraphQL endpoint tests
 * Covers: fairnessReport, overtimeDashboard, onDutyNow
 */
import { getToken, gql, gqlAnon, ADMIN_CREDS, MANAGER_CREDS, STAFF_CREDS } from './helpers';

let adminToken: string;
let managerToken: string;
let staffToken: string;

const LOCATION_DOWNTOWN_SF = 'loc-downtown-sf';

beforeAll(async () => {
  [adminToken, managerToken, staffToken] = await Promise.all([
    getToken(ADMIN_CREDS),
    getToken(MANAGER_CREDS),
    getToken(STAFF_CREDS),
  ]);
});

// ── fairnessReport query ──────────────────────────────────────────────────────

describe('Query.fairnessReport', () => {
  const FAIRNESS = `
    query($locationId: ID, $periodStart: DateTime!, $periodEnd: DateTime) {
      fairnessReport(locationId: $locationId, periodStart: $periodStart, periodEnd: $periodEnd) {
        averageHours
        fairnessScore
        standardDeviation
        staff {
          userId firstName lastName totalHours premiumShifts delta
        }
      }
    }
  `;

  it('returns fairness report for a location', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);
    const periodEnd = new Date(monday.getTime() + 7 * 86400000);

    const res = await gql(adminToken, FAIRNESS, {
      locationId: LOCATION_DOWNTOWN_SF,
      periodStart: monday.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }).expect(200);

    expect(res.body.errors).toBeUndefined();
    const report = res.body.data.fairnessReport;
    expect(report).toHaveProperty('averageHours');
    expect(report).toHaveProperty('fairnessScore');
    expect(report).toHaveProperty('standardDeviation');
    expect(Array.isArray(report.staff)).toBe(true);
  });

  it('returns empty report when no locationId provided', async () => {
    const res = await gql(adminToken, FAIRNESS, {
      periodStart: new Date().toISOString(),
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const report = res.body.data.fairnessReport;
    expect(report.staff).toHaveLength(0);
    expect(report.averageHours).toBe(0);
    expect(report.fairnessScore).toBe(100);
  });

  it('each staff entry has required fields', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);
    const periodEnd = new Date(monday.getTime() + 7 * 86400000);

    const res = await gql(adminToken, FAIRNESS, {
      locationId: LOCATION_DOWNTOWN_SF,
      periodStart: monday.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }).expect(200);

    const staff = res.body.data.fairnessReport.staff;
    if (staff.length > 0) {
      staff.forEach((s: any) => {
        expect(s).toHaveProperty('userId');
        expect(s).toHaveProperty('firstName');
        expect(s).toHaveProperty('lastName');
        expect(s).toHaveProperty('totalHours');
        expect(typeof s.totalHours).toBe('number');
      });
    }
  });

  it('manager can access fairness report', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    const res = await gql(managerToken, FAIRNESS, {
      locationId: LOCATION_DOWNTOWN_SF,
      periodStart: monday.toISOString(),
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('unauthenticated request is rejected', async () => {
    const res = await gqlAnon(FAIRNESS, {
      locationId: LOCATION_DOWNTOWN_SF,
      periodStart: new Date().toISOString(),
    }).expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/unauthorized|forbidden/i);
  });
});

// ── overtimeDashboard query ───────────────────────────────────────────────────

describe('Query.overtimeDashboard', () => {
  const OVERTIME = `
    query($week: DateTime!, $locationId: ID) {
      overtimeDashboard(week: $week, locationId: $locationId) {
        week
        locationId
        atRiskCount
        overtimeCount
        totalProjectedCost
        staff {
          userId firstName lastName totalHours overtimeHours projectedCost warningCount
        }
      }
    }
  `;

  it('returns overtime dashboard for a location', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    const res = await gql(adminToken, OVERTIME, {
      week: monday.toISOString(),
      locationId: LOCATION_DOWNTOWN_SF,
    }).expect(200);

    expect(res.body.errors).toBeUndefined();
    const dashboard = res.body.data.overtimeDashboard;
    expect(dashboard).toHaveProperty('atRiskCount');
    expect(dashboard).toHaveProperty('overtimeCount');
    expect(dashboard).toHaveProperty('totalProjectedCost');
    expect(Array.isArray(dashboard.staff)).toBe(true);
    expect(typeof dashboard.atRiskCount).toBe('number');
    expect(typeof dashboard.overtimeCount).toBe('number');
  });

  it('returns empty dashboard when no locationId provided', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    const res = await gql(adminToken, OVERTIME, {
      week: monday.toISOString(),
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const dashboard = res.body.data.overtimeDashboard;
    expect(dashboard.staff).toHaveLength(0);
    expect(dashboard.atRiskCount).toBe(0);
  });

  it('staff entries have required fields when present', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    const res = await gql(adminToken, OVERTIME, {
      week: monday.toISOString(),
      locationId: LOCATION_DOWNTOWN_SF,
    }).expect(200);

    const staff = res.body.data.overtimeDashboard.staff;
    staff.forEach((s: any) => {
      expect(s).toHaveProperty('userId');
      expect(s).toHaveProperty('totalHours');
      expect(s).toHaveProperty('overtimeHours');
      expect(s).toHaveProperty('projectedCost');
      expect(typeof s.totalHours).toBe('number');
      expect(typeof s.overtimeHours).toBe('number');
    });
  });

  it('manager can access overtime dashboard', async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    const res = await gql(managerToken, OVERTIME, {
      week: monday.toISOString(),
      locationId: LOCATION_DOWNTOWN_SF,
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('unauthenticated request is rejected', async () => {
    const res = await gqlAnon(OVERTIME, {
      week: new Date().toISOString(),
      locationId: LOCATION_DOWNTOWN_SF,
    }).expect(200);
    expect(res.body.errors).toBeDefined();
  });
});

// ── onDutyNow query ───────────────────────────────────────────────────────────

describe('Query.onDutyNow', () => {
  const ON_DUTY = `
    query($locationId: ID) {
      onDutyNow(locationId: $locationId) {
        userId firstName lastName shiftId shiftStart shiftEnd locationId requiredSkill
      }
    }
  `;

  it('returns on-duty staff (may be empty outside shift hours)', async () => {
    const res = await gql(adminToken, ON_DUTY, {
      locationId: LOCATION_DOWNTOWN_SF,
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.onDutyNow)).toBe(true);
  });

  it('returns on-duty staff across all locations when no locationId given', async () => {
    const res = await gql(adminToken, ON_DUTY, {}).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.onDutyNow)).toBe(true);
  });

  it('on-duty entries have correct shape', async () => {
    const res = await gql(adminToken, ON_DUTY, {
      locationId: LOCATION_DOWNTOWN_SF,
    }).expect(200);
    const onDuty = res.body.data.onDutyNow;
    onDuty.forEach((entry: any) => {
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('firstName');
      expect(entry).toHaveProperty('shiftId');
      expect(entry).toHaveProperty('shiftStart');
      expect(entry).toHaveProperty('shiftEnd');
    });
  });

  it('manager can access on-duty list', async () => {
    const res = await gql(managerToken, ON_DUTY, {}).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('staff can access on-duty list', async () => {
    const res = await gql(staffToken, ON_DUTY, {}).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('unauthenticated request is rejected', async () => {
    const res = await gqlAnon(ON_DUTY, {}).expect(200);
    expect(res.body.errors).toBeDefined();
  });
});
