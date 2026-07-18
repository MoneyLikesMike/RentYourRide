import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity, MessageType } from '../entities/message.entity';
import { BookingEntity } from '../entities/booking.entity';
import { UserEntity } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_TEXT = 2000;
const PREVIEW_LEN = 200;

export interface ConversationDto {
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
  lastMessage: {
    text: string;
    createdAt: number;
    senderUserId: string | null;
    type: MessageType;
  } | null;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  type: MessageType;
  text: string;
  metadata: Record<string, unknown> | null;
  createdAt: number;
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly convRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly msgRepo: Repository<MessageEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepo: Repository<BookingEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  private preview(text: string, type: MessageType): string {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (type === 'system') return clean;
    if (clean.length <= PREVIEW_LEN) return clean;
    return `${clean.slice(0, PREVIEW_LEN - 1)}…`;
  }

  private toMessageDto(m: MessageEntity): MessageDto {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderUserId: m.senderUserId,
      type: m.type,
      text: m.text,
      metadata: m.metadata,
      createdAt: m.createdAt.getTime(),
    };
  }

  private async unreadCountFor(conv: ConversationEntity, userId: string): Promise<number> {
    if (!conv.lastMessageAt) return 0;
    const isGuest = conv.guestUserId === userId;
    const lastRead = isGuest ? conv.guestLastReadAt : conv.hostLastReadAt;
    const qb = this.msgRepo
      .createQueryBuilder('m')
      .where('m.conversation_id = :id', { id: conv.id })
      .andWhere('(m.sender_user_id IS NULL OR m.sender_user_id != :uid)', { uid: userId });
    if (lastRead) {
      qb.andWhere('m.created_at > :ts', { ts: lastRead });
    }
    return qb.getCount();
  }

  private toConversationDto(
    conv: ConversationEntity,
    counterpart: UserEntity | null | undefined,
    unread: number,
    latest?: MessageEntity | null,
  ): ConversationDto {
    if (!counterpart) {
      throw new NotFoundException('Conversation participant not found');
    }
    const booking = conv.booking;
    const snap = (booking?.listingSnapshot ?? {}) as Record<string, unknown>;
    const cover =
      typeof snap.coverUri === 'string' ? snap.coverUri :
      typeof snap.coverImageUri === 'string' ? snap.coverImageUri :
      typeof snap.thumbnailUri === 'string' ? snap.thumbnailUri :
      typeof snap.imageUri === 'string' ? snap.imageUri :
      null;
    const listingTitle = typeof snap.title === 'string' ? snap.title : (booking ? 'Rental' : '');

    return {
      id: conv.id,
      bookingId: conv.bookingId,
      counterpart: {
        id: counterpart.id,
        firstName: counterpart.firstName || '',
        lastName: counterpart.lastName || '',
        fullName: [counterpart.firstName, counterpart.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || counterpart.email || 'User',
        avatarUrl: counterpart.avatarUrl ?? null,
      },
      bookingSnapshot: booking
        ? {
            id: booking.id,
            status: booking.status,
            listingTitle: listingTitle || 'Rental',
            listingCoverUri: cover ?? null,
            guestUserId: booking.guestUserId,
            hostUserId: booking.hostUserId,
          }
        : null,
      lastMessage: conv.lastMessageAt
        ? {
            text: latest
              ? this.preview(latest.text, latest.type)
              : (conv.lastMessagePreview ?? ''),
            createdAt: conv.lastMessageAt.getTime(),
            senderUserId: latest?.senderUserId ?? null,
            type: latest?.type ?? 'text',
          }
        : null,
      unreadCount: unread,
      createdAt: conv.createdAt.getTime(),
      updatedAt: conv.updatedAt.getTime(),
    };
  }

  async listForUser(userId: string): Promise<ConversationDto[]> {
    const rows = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.booking', 'booking')
      .leftJoinAndSelect('c.guest', 'guest')
      .leftJoinAndSelect('c.host', 'host')
      .where('c.guest_user_id = :uid OR c.host_user_id = :uid', { uid: userId })
      .orderBy('COALESCE(c.last_message_at, c.created_at)', 'DESC')
      .getMany();

    const withCounts: ConversationDto[] = [];
    for (const conv of rows) {
      const isGuest = conv.guestUserId === userId;
      const counterpart = isGuest ? conv.host : conv.guest;
      if (!counterpart) continue;
      const unread = await this.unreadCountFor(conv, userId);
      const latest = await this.msgRepo.findOne({
        where: { conversationId: conv.id },
        order: { createdAt: 'DESC' },
      });
      withCounts.push(this.toConversationDto(conv, counterpart, unread, latest));
    }
    return withCounts;
  }

  async unreadTotalForUser(userId: string): Promise<number> {
    const rows = await this.convRepo
      .createQueryBuilder('c')
      .where('c.guest_user_id = :uid OR c.host_user_id = :uid', { uid: userId })
      .getMany();
    let total = 0;
    for (const conv of rows) {
      total += await this.unreadCountFor(conv, userId);
    }
    return total;
  }

  async getConversationById(userId: string, id: string): Promise<ConversationDto> {
    const conv = await this.convRepo.findOne({
      where: { id },
      relations: ['booking', 'guest', 'host'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.guestUserId !== userId && conv.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const counterpart = conv.guestUserId === userId ? conv.host : conv.guest;
    const unread = await this.unreadCountFor(conv, userId);
    const latest = await this.msgRepo.findOne({
      where: { conversationId: conv.id },
      order: { createdAt: 'DESC' },
    });
    return this.toConversationDto(conv, counterpart, unread, latest);
  }

  async findOrCreateForBooking(userId: string, bookingId: string): Promise<ConversationDto> {
    const booking = await this.bookingsRepo.findOne({
      where: { id: bookingId },
      relations: ['guest', 'host'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestUserId !== userId && booking.hostUserId !== userId) {
      throw new ForbiddenException();
    }

    let conv = await this.convRepo.findOne({
      where: { bookingId },
      relations: ['booking', 'guest', 'host'],
    });

    if (!conv) {
      conv = this.convRepo.create({
        bookingId,
        guestUserId: booking.guestUserId,
        hostUserId: booking.hostUserId,
      });
      conv = await this.convRepo.save(conv);
      conv.booking = booking;
      conv.guest = booking.guest;
      conv.host = booking.host;

      if (booking.introMessage?.trim()) {
        await this.postMessage(conv, {
          senderUserId: booking.guestUserId,
          type: 'text',
          text: booking.introMessage.trim(),
        });
      }
      await this.postMessage(conv, {
        senderUserId: null,
        type: 'system',
        text: booking.instantBooking
          ? 'Trip confirmed — say hi and finalise details.'
          : 'Trip request sent. The host will respond shortly.',
        metadata: { bookingStatus: booking.status },
      });
      // The user who created the booking (guest) shouldn't see their own
      // request-sent system message as unread.
      const now = new Date();
      if (userId === booking.guestUserId) {
        conv!.guestLastReadAt = now;
      } else if (userId === booking.hostUserId) {
        conv!.hostLastReadAt = now;
      }
      await this.convRepo.save(conv!);
      // Reload with latest state
      conv = await this.convRepo.findOne({
        where: { id: conv!.id },
        relations: ['booking', 'guest', 'host'],
      });
    }

    const counterpart = conv!.guestUserId === userId ? conv!.host : conv!.guest;
    const unread = await this.unreadCountFor(conv!, userId);
    const latest = await this.msgRepo.findOne({
      where: { conversationId: conv!.id },
      order: { createdAt: 'DESC' },
    });
    return this.toConversationDto(conv!, counterpart, unread, latest);
  }

  async listMessages(
    userId: string,
    conversationId: string,
    opts: { before?: number; take?: number } = {},
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.guestUserId !== userId && conv.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const take = Math.max(1, Math.min(100, opts.take ?? 50));
    const where: Record<string, unknown> = { conversationId };
    if (opts.before) {
      where.createdAt = LessThan(new Date(opts.before));
    }
    const rows = await this.msgRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const trimmed = hasMore ? rows.slice(0, take) : rows;
    trimmed.reverse();
    return {
      messages: trimmed.map((m) => this.toMessageDto(m)),
      hasMore,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    text: string,
  ): Promise<MessageDto> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.guestUserId !== userId && conv.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const clean = String(text || '').trim();
    if (!clean) throw new BadRequestException('Message cannot be empty');
    if (clean.length > MAX_TEXT) {
      throw new BadRequestException(`Message must be under ${MAX_TEXT} characters`);
    }
    const saved = await this.postMessage(conv, {
      senderUserId: userId,
      type: 'text',
      text: clean,
    });
    if (conv.bookingId) {
      if (conv.hostUserId === userId) {
        this.notifications.newMessageFromHost(conv.bookingId, clean);
      } else if (conv.guestUserId === userId) {
        this.notifications.newMessageFromGuest(conv.bookingId, clean);
      }
    }
    return this.toMessageDto(saved);
  }

  async markRead(
    userId: string,
    conversationId: string,
  ): Promise<{ unreadCount: number }> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.guestUserId !== userId && conv.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const now = new Date();
    if (conv.guestUserId === userId) conv.guestLastReadAt = now;
    else conv.hostLastReadAt = now;
    await this.convRepo.save(conv);
    return { unreadCount: 0 };
  }

  /**
   * Internal helper used by booking lifecycle hooks to append a system message
   * (or user text) without going through the auth-checked send flow.
   */
  async postMessage(
    conv: ConversationEntity,
    payload: {
      senderUserId: string | null;
      type: MessageType;
      text: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<MessageEntity> {
    const msg = this.msgRepo.create({
      conversationId: conv.id,
      senderUserId: payload.senderUserId,
      type: payload.type,
      text: payload.text,
      metadata: payload.metadata ?? null,
    });
    const saved = await this.msgRepo.save(msg);
    conv.lastMessageAt = saved.createdAt;
    conv.lastMessagePreview = this.preview(saved.text, saved.type);
    if (payload.senderUserId === conv.guestUserId) {
      conv.guestLastReadAt = saved.createdAt;
    } else if (payload.senderUserId === conv.hostUserId) {
      conv.hostLastReadAt = saved.createdAt;
    }
    await this.convRepo.save(conv);
    return saved;
  }

  /**
   * Public helper for lifecycle events (booking accept/decline/cancel/complete etc.).
   * Ensures the conversation exists for the booking and appends a system message.
   */
  async postBookingSystemMessage(
    bookingId: string,
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const booking = await this.bookingsRepo.findOne({ where: { id: bookingId } });
      if (!booking) return;
      let conv = await this.convRepo.findOne({ where: { bookingId } });
      if (!conv) {
        conv = this.convRepo.create({
          bookingId,
          guestUserId: booking.guestUserId,
          hostUserId: booking.hostUserId,
        });
        conv = await this.convRepo.save(conv);
        if (booking.introMessage?.trim()) {
          await this.postMessage(conv, {
            senderUserId: booking.guestUserId,
            type: 'text',
            text: booking.introMessage.trim(),
          });
        }
      }
      await this.postMessage(conv, {
        senderUserId: null,
        type: 'system',
        text,
        metadata: metadata ?? null,
      });
    } catch {
      // Never fail the booking action because of a messaging hiccup
    }
  }
}
