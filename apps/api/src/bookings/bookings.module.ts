import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, AssignmentService],
  exports: [AssignmentService],
})
export class BookingsModule {}
