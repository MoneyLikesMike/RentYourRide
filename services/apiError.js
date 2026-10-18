export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function parseErrorMessage(body) {
  if (!body || typeof body !== 'object') return 'Something went wrong';
  const m = body.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m)) return m.filter(Boolean).join('\n');
  return 'Something went wrong';
}
