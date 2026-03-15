/**
 * Notifications GraphQL endpoint tests
 * Covers: notifications query, markNotificationRead, markAllNotificationsRead
 */
import { getToken, gql, gqlAnon, ADMIN_CREDS, MANAGER_CREDS, STAFF_CREDS } from './helpers';

let adminToken: string;
let managerToken: string;
let staffToken: string;

// Track a notification id for read tests
let notificationId: string;

beforeAll(async () => {
  [adminToken, managerToken, staffToken] = await Promise.all([
    getToken(ADMIN_CREDS),
    getToken(MANAGER_CREDS),
    getToken(STAFF_CREDS),
  ]);
});

// ── notifications query ───────────────────────────────────────────────────────

describe('Query.notifications', () => {
  const NOTIFICATIONS = `
    query($unreadOnly: Boolean) {
      notifications(unreadOnly: $unreadOnly) {
        id userId type title message isRead createdAt
      }
    }
  `;

  it('authenticated user can list their notifications', async () => {
    const res = await gql(staffToken, NOTIFICATIONS).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });

  it('admin can list their notifications', async () => {
    const res = await gql(adminToken, NOTIFICATIONS).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });

  it('manager can list their notifications', async () => {
    const res = await gql(managerToken, NOTIFICATIONS).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });

  it('unreadOnly filter returns only unread notifications', async () => {
    const res = await gql(staffToken, NOTIFICATIONS, { unreadOnly: true }).expect(200);
    expect(res.body.errors).toBeUndefined();
    const notifications = res.body.data.notifications;
    // All returned should be unread
    notifications.forEach((n: any) => {
      expect(n.isRead).toBe(false);
    });
  });

  it('notifications have required fields', async () => {
    const res = await gql(staffToken, NOTIFICATIONS).expect(200);
    const notifications = res.body.data.notifications;
    if (notifications.length > 0) {
      const first = notifications[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('userId');
      expect(first).toHaveProperty('type');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('message');
      expect(first).toHaveProperty('isRead');
      expect(first).toHaveProperty('createdAt');
      notificationId = first.id;
    }
  });

  it('unauthenticated request returns errors', async () => {
    const res = await gqlAnon(NOTIFICATIONS).expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/unauthorized|forbidden/i);
  });
});

// ── markNotificationRead mutation ─────────────────────────────────────────────

describe('Mutation.markNotificationRead', () => {
  const MARK_READ = `
    mutation($id: ID!) {
      markNotificationRead(id: $id) {
        id isRead
      }
    }
  `;

  it('can mark a notification as read', async () => {
    if (!notificationId) return;
    const res = await gql(staffToken, MARK_READ, { id: notificationId }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.markNotificationRead.isRead).toBe(true);
    expect(res.body.data.markNotificationRead.id).toBe(notificationId);
  });

  it('returns error for unknown notification id', async () => {
    const res = await gql(staffToken, MARK_READ, {
      id: '00000000-0000-0000-0000-000000000000',
    }).expect(200);
    expect(res.body.errors).toBeDefined();
  });

  it('idempotent — marking an already-read notification returns it as read', async () => {
    if (!notificationId) return;
    const res = await gql(staffToken, MARK_READ, { id: notificationId }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.markNotificationRead.isRead).toBe(true);
  });

  it('unauthenticated request returns errors', async () => {
    const res = await gqlAnon(MARK_READ, {
      id: '00000000-0000-0000-0000-000000000000',
    }).expect(200);
    expect(res.body.errors).toBeDefined();
  });
});

// ── markAllNotificationsRead mutation ─────────────────────────────────────────

describe('Mutation.markAllNotificationsRead', () => {
  const MARK_ALL_READ = `
    mutation {
      markAllNotificationsRead
    }
  `;

  it('returns true when marking all as read', async () => {
    const res = await gql(staffToken, MARK_ALL_READ).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.markAllNotificationsRead).toBe(true);
  });

  it('admin can mark all their notifications as read', async () => {
    const res = await gql(adminToken, MARK_ALL_READ).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.markAllNotificationsRead).toBe(true);
  });

  it('after marking all read, unreadOnly returns empty array', async () => {
    // Mark all read first
    await gql(staffToken, MARK_ALL_READ).expect(200);

    // Now fetch unread only
    const res = await gql(staffToken, `
      query { notifications(unreadOnly: true) { id isRead } }
    `).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.notifications).toHaveLength(0);
  });

  it('unauthenticated request returns errors', async () => {
    const res = await gqlAnon(MARK_ALL_READ).expect(200);
    expect(res.body.errors).toBeDefined();
  });
});
