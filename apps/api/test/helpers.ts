import * as request from 'supertest';

export const GQL_URL = '/graphql';
export const API_URL = 'http://localhost:3002';

// ── Seed credentials ──────────────────────────────────────────────────────────
export const ADMIN_CREDS    = { email: 'admin@coastaleats.com',          password: 'password123' };
export const MANAGER_CREDS  = { email: 'manager-sf@coastaleats.com',     password: 'password123' };
export const STAFF_CREDS    = { email: 'emma.wilson@coastaleats.com',    password: 'password123' };

// ── Auth helper ───────────────────────────────────────────────────────────────

export async function getToken(creds: { email: string; password: string }): Promise<string> {
  const res = await request(API_URL)
    .post('/api/auth/login')
    .send(creds)
    .expect(201);
  return res.body.accessToken as string;
}

// ── GraphQL request helper ────────────────────────────────────────────────────

export function gql(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  return request(API_URL)
    .post(GQL_URL)
    .set('Authorization', `Bearer ${token}`)
    .send({ query, variables });
}

// ── Unauthenticated GraphQL request ──────────────────────────────────────────

export function gqlAnon(query: string, variables?: Record<string, unknown>) {
  return request(API_URL)
    .post(GQL_URL)
    .send({ query, variables });
}
