import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  code?: string;
}

export function apiError(message: string, status: number, code?: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message, ...(code && { code }) }, { status });
}

export function badRequest(message: string, code?: string) {
  return apiError(message, 400, code);
}

export function unauthorized(message = 'Unauthorized') {
  return apiError(message, 401);
}

export function forbidden(message = 'Forbidden') {
  return apiError(message, 403);
}

export function notFound(message = 'Not found') {
  return apiError(message, 404);
}

export function conflict(message: string, code?: string) {
  return apiError(message, 409, code);
}
