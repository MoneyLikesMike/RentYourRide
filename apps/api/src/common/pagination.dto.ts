import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PageOptionsDto {
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsEnum(SortOrder)
  @IsOptional()
  readonly order: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly take = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}

export class PageMetaDto {
  readonly page: number;
  readonly take: number;
  readonly itemCount: number;
  readonly pageCount: number;

  constructor(pageOptions: PageOptionsDto, itemCount: number) {
    this.page = pageOptions.page;
    this.take = pageOptions.take;
    this.itemCount = itemCount;
    this.pageCount = Math.ceil(itemCount / pageOptions.take) || 0;
  }
}

export class PaginatedDto<T> {
  readonly data: T[];
  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}

export class AdminUsersPageOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: ['createdAt', 'fullName', 'email'] })
  @IsOptional()
  @IsString()
  readonly field: 'createdAt' | 'fullName' | 'email' = 'createdAt';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly query?: string;
}

export class AdminBookingsPageOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional({
    enum: ['requestTime', 'requestStart', 'requestEnd', 'hostName', 'guestName'],
  })
  @IsOptional()
  @IsString()
  readonly field?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly query?: string;
}

export class AdminListingsPageOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly query?: string;
}

export class AdminLicensesPageOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: ['fullName'] })
  @IsOptional()
  @IsString()
  readonly field: 'fullName' = 'fullName';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly query?: string;
}
