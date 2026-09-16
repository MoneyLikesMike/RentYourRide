import { apiFetch } from './http';

export type ConversationLastMessage = {
  text: string;
  createdAt: number;
  senderUserId: string | null;
  type: 'user' | 'system' | string;
};

export type Conversation = {
  id: string;
  bookingId: string | null;
  counterpart: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatarUrl: string | null;
  };
  bookingSnapshot: {
    id: string;
    status: string;
    listingTitle: string;
    listingCoverUri: string | null;
    guestUserId: string;
    hostUserId: string;
  } | null;
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  type: 'user' | 'system' | string;
  text: string;
  metadata: Record<string, unknown> | null;
  createdAt: number;
};

export async function listConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>('v1/conversations', { method: 'GET' });
}

export async function listMessages(
  conversationId: string,
  opts?: { before?: number; take?: number },
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const qs = new URLSearchParams();
  if (opts?.before) qs.set('before', String(opts.before));
  if (opts?.take) qs.set('take', String(opts.take));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(
    `v1/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`,
    { method: 'GET' },
  );
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  return apiFetch(
    `v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', json: { text } },
  );
}

export async function markConversationRead(
  conversationId: string,
): Promise<{ unreadCount: number }> {
  return apiFetch(
    `v1/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST', json: {} },
  );
}

export async function conversationsUnreadCount(): Promise<number> {
  const res = await apiFetch<{ count: number }>(
    'v1/conversations/unread-count',
    { method: 'GET' },
  );
  return Number(res?.count) || 0;
}
