export const NOTIFICATIONS_SERVICE_TOKEN = 'NOTIFICATIONS_SERVICE_TOKEN';

export interface INotificationsService {
  sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
  ): Promise<void>;
}
