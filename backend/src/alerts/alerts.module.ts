import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';
import { AlertsRepository } from './repositories/alerts.repository';
import { ALERTS_SERVICE_TOKEN } from './interfaces/alerts.service.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Alert])],
  controllers: [AlertsController],
  providers: [
    AlertsRepository,
    { provide: ALERTS_SERVICE_TOKEN, useClass: AlertsService },
  ],
  exports: [ALERTS_SERVICE_TOKEN, AlertsRepository],
})
export class AlertsModule {}
