import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NOTIFICATIONS_SERVICE_TOKEN } from './interfaces/notifications.service.interface';

@Module({
  providers: [
    { provide: NOTIFICATIONS_SERVICE_TOKEN, useClass: NotificationsService },
  ],
  exports: [NOTIFICATIONS_SERVICE_TOKEN],
})
export class NotificationsModule {}
