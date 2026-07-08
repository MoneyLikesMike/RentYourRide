import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';
import { GeocodeService } from './geocode.service';

export class ReverseGeocodeDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class ForwardGeocodeDto {
  @IsString()
  @MinLength(2)
  address: string;
}

@ApiTags('geocode')
@Controller('geocode')
export class GeocodeController {
  constructor(private readonly geocode: GeocodeService) {}

  @Post('reverse')
  @HttpCode(200)
  async reverse(@Body() body: ReverseGeocodeDto) {
    return this.geocode.reverseGeocode(body.latitude, body.longitude);
  }

  @Post('forward')
  @HttpCode(200)
  async forward(@Body() body: ForwardGeocodeDto) {
    return this.geocode.forwardGeocode(body.address);
  }
}
