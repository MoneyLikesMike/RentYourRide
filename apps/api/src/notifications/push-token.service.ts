import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushDeviceTokenEntity } from '../entities/push-device-token.entity';

@Injectable()
export class PushTokenService {
  constructor(
    @InjectRepository(PushDeviceTokenEntity)
    private readonly repo: Repository<PushDeviceTokenEntity>,
  ) {}

  async register(
    userId: string,
    expoPushToken: string,
    platform = 'ios',
    deviceId?: string,
  ): Promise<void> {
    const token = expoPushToken.trim();
    if (!token) return;

    const existing = await this.repo.findOne({ where: { expoPushToken: token } });
    if (existing) {
      if (existing.userId !== userId) {
        existing.userId = userId;
      }
      existing.platform = platform;
      existing.deviceId = deviceId ?? existing.deviceId;
      await this.repo.save(existing);
      return;
    }

    await this.repo.save(
      this.repo.create({
        userId,
        expoPushToken: token,
        platform,
        deviceId: deviceId ?? null,
      }),
    );
  }

  async unregister(userId: string, expoPushToken: string): Promise<void> {
    const token = expoPushToken.trim();
    if (!token) return;
    await this.repo.delete({ userId, expoPushToken: token });
  }

  async unregisterAllForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  async tokensForUser(userId: string): Promise<string[]> {
    const rows = await this.repo.find({ where: { userId } });
    return rows.map((r) => r.expoPushToken);
  }
}
