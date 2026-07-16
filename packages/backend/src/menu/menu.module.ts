import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { RecipesModule } from '../recipes/recipes.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [RecipesModule, AiModule],
  providers: [MenuService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
