import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeocodeCacheEntity } from '../entities/geocode-cache.entity';
import { GeocodeService } from './geocode.service';
import { GeocodeController } from './geocode.controller';
import { MapsProxyController } from './maps-proxy.controller';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeocodeCacheEntity]),
    forwardRef(() => ListingsModule),
  ],
  controllers: [GeocodeController, MapsProxyController],
  providers: [GeocodeService],
  exports: [GeocodeService],
})
export class GeocodeModule {}
