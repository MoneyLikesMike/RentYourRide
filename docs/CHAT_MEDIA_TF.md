# Chat media (this pass)

Ship text + photos with read receipts and timestamps. Richer iMessage features are **out of scope**.

## Behavior

| Trip status | Text | Photos | Read receipts | Timestamps |
|-------------|------|--------|---------------|------------|
| `pending_host` | Yes | Locked | Always | Always (per bubble + day separators) |
| Accepted (`confirmed`+) | Yes | Yes | Always | Always |
| `declined` / `cancelled` | Yes | Locked | Always | Always |

- Instant bookings start as `confirmed` → photos unlocked immediately.
- Profile tap (mobile): header name/avatar → `UserProfileScreen`.
- Web: no public profile route yet — counterpart shown in thread header only.

## API

- `POST /v1/conversations/:id/messages` — text (unchanged)
- `POST /v1/conversations/:id/messages/photo` — multipart `file` (≤10 MB); **403** until accept
- Conversation DTO adds `counterpartLastReadAt`, `mediaUnlocked`
- Message `type: 'image'` with `metadata.imageUrl`

## Not in this PR

- In-chat **video** clips
- **Voice** messages
- In-chat **calling** (no new CPaaS)
- **Location** share
- iMessage-style **swipe-to-reveal** timestamps (timestamps already shown on each bubble)
- Web public profile deep-link

## Key files

- API: `apps/api/src/messaging/*`, `entities/message.entity.ts`
- Mobile: `screens/ChatThreadScreen.js`, `services/messagingApi.js`, `utils/chatCapabilities.js`
- Web: `apps/web/src/pages/MessagesPage.tsx`, `api/messaging.ts`
