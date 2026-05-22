import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';
import { AlertsRepository } from './repositories/alerts.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Alert])],
  controllers: [AlertsController],
  providers: [AlertsRepository, AlertsService],
  exports: [AlertsService, AlertsRepository],
})
export class AlertsModule {}
