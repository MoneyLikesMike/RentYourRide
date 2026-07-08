export * from './user.entity';
export * from './refresh-token.entity';
export * from './password-reset-token.entity';
export * from './listing.entity';
export * from './favorite.entity';
export * from './booking.entity';
export * from './geocode-cache.entity';
export * from './didit-webhook-event.entity';
export * from './conversation.entity';
export * from './message.entity';

import { UserEntity } from './user.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { PasswordResetTokenEntity } from './password-reset-token.entity';
import { ListingEntity } from './listing.entity';
import { FavoriteEntity } from './favorite.entity';
import { BookingEntity } from './booking.entity';
import { GeocodeCacheEntity } from './geocode-cache.entity';
import { DiditWebhookEventEntity } from './didit-webhook-event.entity';
import { ConversationEntity } from './conversation.entity';
import { MessageEntity } from './message.entity';

export const entities = [
  UserEntity,
  RefreshTokenEntity,
  PasswordResetTokenEntity,
  ListingEntity,
  FavoriteEntity,
  BookingEntity,
  GeocodeCacheEntity,
  DiditWebhookEventEntity,
  ConversationEntity,
  MessageEntity,
];
