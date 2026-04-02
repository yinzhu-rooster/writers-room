import { describe, it, expect } from 'vitest';
import { badRequest, unauthorized, forbidden, notFound, conflict, apiError } from './api-error';

describe('apiError helpers', () => {
  it('badRequest returns 400', async () => {
    const res = badRequest('bad input');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad input');
  });

  it('badRequest includes optional code', async () => {
    const res = badRequest('bad', 'VALIDATION');
    const body = await res.json();
    expect(body.code).toBe('VALIDATION');
  });

  it('unauthorized returns 401', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('unauthorized accepts custom message', async () => {
    const res = unauthorized('Token expired');
    const body = await res.json();
    expect(body.error).toBe('Token expired');
  });

  it('forbidden returns 403', async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('notFound returns 404', async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('notFound accepts custom message', async () => {
    const res = notFound('User not found');
    const body = await res.json();
    expect(body.error).toBe('User not found');
  });

  it('conflict returns 409', async () => {
    const res = conflict('Already exists', 'DUPLICATE');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Already exists');
    expect(body.code).toBe('DUPLICATE');
  });

  it('apiError creates response with correct status', async () => {
    const res = apiError('Server error', 500);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Server error');
    expect(body.code).toBeUndefined();
  });
});
