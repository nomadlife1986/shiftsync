/**
 * Auth endpoint tests
 * POST /api/auth/login
 */
import * as request from 'supertest';
import { API_URL, ADMIN_CREDS, MANAGER_CREDS, STAFF_CREDS } from './helpers';

describe('Auth — POST /api/auth/login', () => {

  it('returns JWT and user data for admin credentials', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send(ADMIN_CREDS)
      .expect(201);

    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      userId:      expect.any(String),
      role:        'ADMIN',
      email:       ADMIN_CREDS.email,
      firstName:   expect.any(String),
      lastName:    expect.any(String),
    });
    expect(res.body.accessToken.split('.').length).toBe(3); // valid JWT
  });

  it('returns JWT for manager credentials', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send(MANAGER_CREDS)
      .expect(201);

    expect(res.body.role).toBe('MANAGER');
    expect(res.body.accessToken).toBeTruthy();
  });

  it('returns JWT for staff credentials', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send(STAFF_CREDS)
      .expect(201);

    expect(res.body.role).toBe('STAFF');
    expect(res.body.accessToken).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    await request(API_URL)
      .post('/api/auth/login')
      .send({ email: ADMIN_CREDS.email, password: 'wrongpassword' })
      .expect(401);
  });

  it('returns 401 for unknown email', async () => {
    await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'nobody@coastaleats.com', password: 'password123' })
      .expect(401);
  });

  it('returns 401 for missing password', async () => {
    await request(API_URL)
      .post('/api/auth/login')
      .send({ email: ADMIN_CREDS.email })
      .expect(401);
  });
});
