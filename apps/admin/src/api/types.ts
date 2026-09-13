export type SortOrder = 'ASC' | 'DESC';

export type UserSortField = 'createdAt' | 'fullName' | 'email';

export interface MemberListQuery {
  order: SortOrder;
  page: number;
  take: number;
  query?: string;
  field: UserSortField /** maps to `field` query param */;
}

export interface PageMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
}

export interface DashboardMember {
  id: number;
  fullName: string;
  email: string;
  signUpDate: string;
  isActive: boolean;
  loginsCount: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface LoginPayload {
  user: Record<string, unknown>;
  token: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshPayload {
  accessToken: string;
  refreshToken: string;
}
