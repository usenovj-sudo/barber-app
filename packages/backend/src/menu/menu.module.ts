import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { RecipesModule } from '../recipes/recipes.module';

@Module({
  imports: [RecipesModule],
  providers: [MenuService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
