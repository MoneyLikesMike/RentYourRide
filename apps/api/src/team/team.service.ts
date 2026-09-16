import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMemberEntity } from '../entities/team-member.entity';

export type TeamMemberDto = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  sortOrder: number;
  published: boolean;
};

function toDto(member: TeamMemberEntity): TeamMemberDto {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    bio: member.bio ?? '',
    photoUrl: member.photoUrl,
    sortOrder: member.sortOrder,
    published: member.published,
  };
}

export type SaveTeamMemberInput = {
  name?: string;
  role?: string;
  bio?: string;
  photoUrl?: string | null;
  sortOrder?: number;
  published?: boolean;
};

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamMemberEntity)
    private readonly members: Repository<TeamMemberEntity>,
  ) {}

  async listPublished(): Promise<TeamMemberDto[]> {
    const rows = await this.members.find({
      where: { published: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map(toDto);
  }

  async listAll(): Promise<TeamMemberDto[]> {
    const rows = await this.members.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map(toDto);
  }

  async create(input: SaveTeamMemberInput): Promise<TeamMemberDto> {
    const member = this.members.create({
      name: input.name?.trim() ?? '',
      role: input.role?.trim() ?? '',
      bio: input.bio?.trim() ?? '',
      photoUrl: input.photoUrl ?? null,
      sortOrder: input.sortOrder ?? (await this.nextSortOrder()),
      published: input.published ?? true,
    });
    return toDto(await this.members.save(member));
  }

  async update(id: string, input: SaveTeamMemberInput): Promise<TeamMemberDto> {
    const member = await this.members.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found');

    if (input.name !== undefined) member.name = input.name.trim();
    if (input.role !== undefined) member.role = input.role.trim();
    if (input.bio !== undefined) member.bio = input.bio.trim();
    if (input.photoUrl !== undefined) member.photoUrl = input.photoUrl;
    if (input.sortOrder !== undefined) member.sortOrder = input.sortOrder;
    if (input.published !== undefined) member.published = input.published;

    return toDto(await this.members.save(member));
  }

  async remove(id: string): Promise<void> {
    const result = await this.members.delete({ id });
    if (!result.affected) throw new NotFoundException('Team member not found');
  }

  private async nextSortOrder(): Promise<number> {
    const last = await this.members.find({
      order: { sortOrder: 'DESC' },
      take: 1,
    });
    return last.length ? last[0].sortOrder + 1 : 0;
  }
}
