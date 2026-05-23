import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import { ALERT_TRIGGERED_EVENT } from '../common/events.constants';
import type { AlertTriggeredPayload } from '../common/events.constants';
import { INotificationsService } from './interfaces/notifications.service.interface';

@Injectable()
export class NotificationsService
  implements INotificationsService, OnModuleInit
{
  private readonly logger = new Logger(NotificationsService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT', '{}');

    try {
      const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;

      // Only initialize if the service account has the minimum required fields
      if (
        !serviceAccount.projectId &&
        !(serviceAccount as Record<string, unknown>)['project_id']
      ) {
        this.logger.warn(
          'FIREBASE_SERVICE_ACCOUNT not configured — push notifications disabled.',
        );
        return;
      }

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized.');
    } catch {
      this.logger.warn(
        'Could not parse FIREBASE_SERVICE_ACCOUNT — push notifications disabled.',
      );
    }
  }

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.debug(
        `[no-op] Push skipped — token: ${fcmToken}, title: "${title}"`,
      );
      return;
    }

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      this.logger.log(`Push sent → ${fcmToken.slice(0, 20)}… | "${title}"`);
    } catch (err) {
      // Stale tokens are common — log but do not throw
      this.logger.error('FCM send failed', (err as Error).message);
    }
  }

  @OnEvent(ALERT_TRIGGERED_EVENT)
  async handleAlertTriggered(payload: AlertTriggeredPayload): Promise<void> {
    if (!payload.fcmToken) return;

    const title = `🔔 ${payload.symbol} Alert`;
    const body =
      payload.condition === 'above'
        ? `${payload.symbol} hit $${payload.currentPrice.toFixed(2)} — above your $${payload.targetPrice} target`
        : `${payload.symbol} hit $${payload.currentPrice.toFixed(2)} — below your $${payload.targetPrice} target`;

    await this.sendPushNotification(payload.fcmToken, title, body);
  }
}
