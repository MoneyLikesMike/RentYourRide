import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeocodeCacheEntity } from '../entities/geocode-cache.entity';
import { GeocodeService } from './geocode.service';
import { GeocodeController } from './geocode.controller';
import { MapsProxyController } from './maps-proxy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GeocodeCacheEntity])],
  controllers: [GeocodeController, MapsProxyController],
  providers: [GeocodeService],
  exports: [GeocodeService],
})
export class GeocodeModule {}
