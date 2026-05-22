export const PRICE_UPDATE_EVENT = 'price.update';
export const ALERT_TRIGGERED_EVENT = 'alert.triggered';

export interface PriceUpdatePayload {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface AlertTriggeredPayload {
  alertId: string;
  userId: string;
  fcmToken: string | null;
  symbol: string;
  targetPrice: number;
  condition: string;
  currentPrice: number;
}
