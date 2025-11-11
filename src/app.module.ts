import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkingDaysModule } from './working-days/working-days.module';

@Module({
  imports: [WorkingDaysModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
