import { apiFetch } from './http';
import type { DashboardMember, MemberListQuery, Paginated } from './types';

function toSearchParams(q: MemberListQuery): string {
  const p = new URLSearchParams();
  p.set('order', q.order);
  p.set('page', String(q.page));
  p.set('take', String(q.take));
  p.set('field', q.field);
  if (q.query) p.set('query', q.query);
  return p.toString();
}

export async function fetchMembers(
  q: MemberListQuery,
): Promise<Paginated<DashboardMember>> {
  const qs = toSearchParams(q);
  return apiFetch<Paginated<DashboardMember>>(`v1/admin/users?${qs}`, {
    method: 'GET',
  });
}
