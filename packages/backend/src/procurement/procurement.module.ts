import { Module } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
import { AiModule } from '../ai/ai.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [AiModule, KitchenModule, TelegramModule],
  providers: [ProcurementService],
  controllers: [ProcurementController],
  exports: [ProcurementService],
})
export class ProcurementModule {}
