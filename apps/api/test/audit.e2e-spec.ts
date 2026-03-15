/**
 * Audit (Domain Events) GraphQL endpoint tests
 * Covers: domainEvents query, shiftHistory query (via shift resolver)
 */
import { getToken, gql, gqlAnon, ADMIN_CREDS, MANAGER_CREDS, STAFF_CREDS } from './helpers';

let adminToken: string;
let managerToken: string;
let staffToken: string;

const SHIFT_01 = 'shift-01';

beforeAll(async () => {
  [adminToken, managerToken, staffToken] = await Promise.all([
    getToken(ADMIN_CREDS),
    getToken(MANAGER_CREDS),
    getToken(STAFF_CREDS),
  ]);
});

// ── domainEvents query ────────────────────────────────────────────────────────

describe('Query.domainEvents', () => {
  const DOMAIN_EVENTS = `
    query($filter: EventFilterInput!) {
      domainEvents(filter: $filter) {
        id aggregateId aggregateType eventType version occurredAt
      }
    }
  `;

  it('returns domain events with no filter constraints', async () => {
    const res = await gql(adminToken, DOMAIN_EVENTS, { filter: {} }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.domainEvents)).toBe(true);
  });

  it('can filter by aggregateType', async () => {
    const res = await gql(adminToken, DOMAIN_EVENTS, {
      filter: { aggregateType: 'Shift' },
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const events = res.body.data.domainEvents;
    expect(Array.isArray(events)).toBe(true);
    events.forEach((e: any) => {
      expect(e.aggregateType).toBe('Shift');
    });
  });

  it('can filter by aggregateId (shift-specific events)', async () => {
    const res = await gql(adminToken, DOMAIN_EVENTS, {
      filter: { aggregateId: SHIFT_01, aggregateType: 'Shift' },
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const events = res.body.data.domainEvents;
    expect(Array.isArray(events)).toBe(true);
    events.forEach((e: any) => {
      expect(e.aggregateId).toBe(SHIFT_01);
    });
  });

  it('can filter by eventType', async () => {
    const res = await gql(adminToken, DOMAIN_EVENTS, {
      filter: { eventType: 'ShiftCreated' },
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const events = res.body.data.domainEvents;
    expect(Array.isArray(events)).toBe(true);
    events.forEach((e: any) => {
      expect(e.eventType).toBe('ShiftCreated');
    });
  });

  it('can filter by date range', async () => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 86400000); // Last 30 days

    const res = await gql(adminToken, DOMAIN_EVENTS, {
      filter: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.domainEvents)).toBe(true);
  });

  it('returns empty array for future date range with no events', async () => {
    const futureStart = new Date();
    futureStart.setFullYear(futureStart.getFullYear() + 10);
    const futureEnd = new Date(futureStart.getTime() + 86400000);

    const res = await gql(adminToken, DOMAIN_EVENTS, {
      filter: {
        startDate: futureStart.toISOString(),
        endDate: futureEnd.toISOString(),
      },
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.domainEvents).toHaveLength(0);
  });

  it('event entries have correct shape', async () => {
    const res = await gql(adminToken, DOMAIN_EVENTS, {
      filter: { aggregateType: 'Shift' },
    }).expect(200);
    const events = res.body.data.domainEvents;
    if (events.length > 0) {
      const first = events[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('aggregateId');
      expect(first).toHaveProperty('aggregateType');
      expect(first).toHaveProperty('eventType');
      expect(first).toHaveProperty('version');
      expect(first).toHaveProperty('occurredAt');
      expect(typeof first.version).toBe('number');
    }
  });

  it('manager can access domain events', async () => {
    const res = await gql(managerToken, DOMAIN_EVENTS, { filter: {} }).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('staff can access domain events', async () => {
    const res = await gql(staffToken, DOMAIN_EVENTS, { filter: {} }).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('unauthenticated request is rejected', async () => {
    const res = await gqlAnon(DOMAIN_EVENTS, { filter: {} }).expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/unauthorized|forbidden/i);
  });
});

// ── shiftHistory (via shift resolver) ────────────────────────────────────────

describe('Query.shiftHistory', () => {
  const SHIFT_HISTORY = `
    query($shiftId: ID!) {
      shiftHistory(shiftId: $shiftId) {
        id aggregateId aggregateType eventType version occurredAt
      }
    }
  `;

  it('returns history for a known shift', async () => {
    const res = await gql(adminToken, SHIFT_HISTORY, { shiftId: SHIFT_01 }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const events = res.body.data.shiftHistory;
    expect(Array.isArray(events)).toBe(true);
  });

  it('events are ordered by version ascending', async () => {
    const res = await gql(adminToken, SHIFT_HISTORY, { shiftId: SHIFT_01 }).expect(200);
    const events = res.body.data.shiftHistory;
    if (events.length > 1) {
      for (let i = 1; i < events.length; i++) {
        expect(events[i].version).toBeGreaterThanOrEqual(events[i - 1].version);
      }
    }
  });

  it('all events in shift history belong to the same shift', async () => {
    const res = await gql(adminToken, SHIFT_HISTORY, { shiftId: SHIFT_01 }).expect(200);
    const events = res.body.data.shiftHistory;
    events.forEach((e: any) => {
      expect(e.aggregateId).toBe(SHIFT_01);
      expect(e.aggregateType).toBe('Shift');
    });
  });

  it('returns empty array for a shift with no recorded events', async () => {
    const res = await gql(adminToken, SHIFT_HISTORY, {
      shiftId: '00000000-0000-0000-0000-000000000000',
    }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.shiftHistory)).toBe(true);
    expect(res.body.data.shiftHistory).toHaveLength(0);
  });

  it('staff can view shift history', async () => {
    const res = await gql(staffToken, SHIFT_HISTORY, { shiftId: SHIFT_01 }).expect(200);
    expect(res.body.errors).toBeUndefined();
  });

  it('unauthenticated request is rejected', async () => {
    const res = await gqlAnon(SHIFT_HISTORY, { shiftId: SHIFT_01 }).expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/unauthorized|forbidden/i);
  });
});
