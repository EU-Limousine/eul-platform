import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { PublicCategoriesController, PublicCategoriesService } from './public-categories';

@Module({
  controllers: [VehiclesController, PublicCategoriesController],
  providers: [VehiclesService, PublicCategoriesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
