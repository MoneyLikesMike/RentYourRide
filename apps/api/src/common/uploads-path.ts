import { join } from 'path';

/** Persistent upload root; survives deploys when UPLOADS_DIR is set on EC2. */
export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
}

export function uploadsSubdir(...segments: string[]): string {
  return join(getUploadsDir(), ...segments);
}
