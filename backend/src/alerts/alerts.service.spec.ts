import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ALERT_TRIGGERED_EVENT,
  PriceUpdatePayload,
} from '../common/events.constants';
import { AlertsService } from './alerts.service';
import { AlertsRepository } from './repositories/alerts.repository';
import { Alert } from './entities/alert.entity';
import { User } from '../auth/entities/user.entity';

const mockUser: Partial<User> = { id: 'user-1', fcmToken: 'fcm-token-abc' };

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  userId: 'user-1',
  user: mockUser as User,
  symbol: 'AAPL',
  targetPrice: 200,
  condition: 'above',
  active: true,
  createdAt: new Date(),
  ...overrides,
});

const mockAlertsRepository = {
  findByUser: jest.fn(),
  findActiveBySymbol: jest.fn(),
  findOneByUser: jest.fn(),
  save: jest.fn(),
  deactivate: jest.fn(),
  remove: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertsService(
      mockAlertsRepository as unknown as AlertsRepository,
      mockEventEmitter as unknown as EventEmitter2,
    );
  });

  describe('evaluatePrice', () => {
    it('triggers an "above" alert when price meets or exceeds targetPrice', async () => {
      const alert = makeAlert({ condition: 'above', targetPrice: 200 });
      mockAlertsRepository.findActiveBySymbol.mockResolvedValue([alert]);

      const payload: PriceUpdatePayload = {
        symbol: 'AAPL',
        price: 200.01,
        timestamp: Date.now(),
      };
      await service.evaluatePrice(payload);

      expect(mockAlertsRepository.deactivate).toHaveBeenCalledWith('alert-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ALERT_TRIGGERED_EVENT,
        expect.objectContaining({
          alertId: 'alert-1',
          currentPrice: 200.01,
          condition: 'above',
        }),
      );
    });

    it('does NOT trigger an "above" alert when price is below targetPrice', async () => {
      const alert = makeAlert({ condition: 'above', targetPrice: 200 });
      mockAlertsRepository.findActiveBySymbol.mockResolvedValue([alert]);

      const payload: PriceUpdatePayload = {
        symbol: 'AAPL',
        price: 199.99,
        timestamp: Date.now(),
      };
      await service.evaluatePrice(payload);

      expect(mockAlertsRepository.deactivate).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('triggers a "below" alert when price meets or falls below targetPrice', async () => {
      const alert = makeAlert({ condition: 'below', targetPrice: 150 });
      mockAlertsRepository.findActiveBySymbol.mockResolvedValue([alert]);

      const payload: PriceUpdatePayload = {
        symbol: 'AAPL',
        price: 149.5,
        timestamp: Date.now(),
      };
      await service.evaluatePrice(payload);

      expect(mockAlertsRepository.deactivate).toHaveBeenCalledWith('alert-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ALERT_TRIGGERED_EVENT,
        expect.objectContaining({
          condition: 'below',
          currentPrice: 149.5,
        }),
      );
    });

    it('does NOT trigger a "below" alert when price is above targetPrice', async () => {
      const alert = makeAlert({ condition: 'below', targetPrice: 150 });
      mockAlertsRepository.findActiveBySymbol.mockResolvedValue([alert]);

      const payload: PriceUpdatePayload = {
        symbol: 'AAPL',
        price: 150.01,
        timestamp: Date.now(),
      };
      await service.evaluatePrice(payload);

      expect(mockAlertsRepository.deactivate).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('handles multiple alerts for the same symbol independently', async () => {
      const alerts = [
        makeAlert({ id: 'a1', condition: 'above', targetPrice: 200 }),
        makeAlert({ id: 'a2', condition: 'below', targetPrice: 180 }),
      ];
      mockAlertsRepository.findActiveBySymbol.mockResolvedValue(alerts);

      // price is 205 — only the "above 200" alert should fire
      const payload: PriceUpdatePayload = {
        symbol: 'AAPL',
        price: 205,
        timestamp: Date.now(),
      };
      await service.evaluatePrice(payload);

      expect(mockAlertsRepository.deactivate).toHaveBeenCalledTimes(1);
      expect(mockAlertsRepository.deactivate).toHaveBeenCalledWith('a1');
    });

    it('does nothing when there are no active alerts for the symbol', async () => {
      mockAlertsRepository.findActiveBySymbol.mockResolvedValue([]);

      const payload: PriceUpdatePayload = {
        symbol: 'TSLA',
        price: 300,
        timestamp: Date.now(),
      };
      await service.evaluatePrice(payload);

      expect(mockAlertsRepository.deactivate).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
