import { Module } from '@nestjs/common';
import { CheckoutsController } from './checkouts.controller';
import { CheckoutsService } from './checkouts.service';
import { FakePayController } from './fake-pay.controller';

@Module({
  controllers: [CheckoutsController, FakePayController],
  providers: [CheckoutsService],
})
export class CheckoutsModule {}
