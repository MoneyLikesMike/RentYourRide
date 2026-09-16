import { apiFetch } from './http';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  sortOrder: number;
  published: boolean;
}

export async function listTeam(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>('v1/team', { method: 'GET', auth: false });
}
