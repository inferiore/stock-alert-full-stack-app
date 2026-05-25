import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  ALERT_TRIGGERED_EVENT,
  PRICE_UPDATE_EVENT,
} from '../common/events.constants';
import type {
  AlertTriggeredPayload,
  PriceUpdatePayload,
} from '../common/events.constants';
import { AlertResponseDto } from './dto/alert-response.dto';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Alert } from './entities/alert.entity';
import { AlertsRepository } from './repositories/alerts.repository';
import { IAlertsService } from './interfaces/alerts.service.interface';
import { REVERSE_PROXY } from '../common/symbol-proxy';

@Injectable()
export class AlertsService implements IAlertsService {
  // Guards against race condition: Finnhub sends many trades/sec so
  // evaluatePrice can be called concurrently before the DB deactivation
  // completes. Track in-flight alert IDs to fire each alert exactly once.
  private readonly firingAlerts = new Set<string>();

  constructor(
    private readonly alertsRepository: AlertsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateAlertDto): Promise<AlertResponseDto> {
    const alert = await this.alertsRepository.save({
      userId,
      symbol: dto.symbol.toUpperCase(),
      targetPrice: dto.targetPrice,
      condition: dto.condition,
    });
    return this.toDto(alert);
  }

  async findAllByUser(userId: string): Promise<AlertResponseDto[]> {
    const alerts = await this.alertsRepository.findByUser(userId);
    return alerts.map((a) => this.toDto(a));
  }

  async remove(id: string, userId: string): Promise<void> {
    const alert = await this.alertsRepository.findOneByUser(id, userId);
    if (!alert) throw new NotFoundException('Alert not found');
    if (alert.userId !== userId) throw new ForbiddenException();
    await this.alertsRepository.remove(id);
  }

  @OnEvent(PRICE_UPDATE_EVENT)
  async evaluatePrice(payload: PriceUpdatePayload): Promise<void> {
    const { price } = payload;
    // The event carries the Finnhub crypto symbol (e.g. BINANCE:BTCUSDT).
    // Reverse-map it to the display symbol (e.g. AAPL) that alerts are stored under.
    const symbol = REVERSE_PROXY[payload.symbol] ?? payload.symbol;
    const alerts = await this.alertsRepository.findActiveBySymbol(symbol);

    for (const alert of alerts) {
      const triggered =
        (alert.condition === 'above' && price >= alert.targetPrice) ||
        (alert.condition === 'below' && price <= alert.targetPrice);

      if (triggered && !this.firingAlerts.has(alert.id)) {
        this.firingAlerts.add(alert.id);
        try {
          await this.alertsRepository.deactivate(alert.id);
          const triggeredPayload: AlertTriggeredPayload = {
            alertId: alert.id,
            userId: alert.userId,
            fcmToken: alert.user?.fcmToken ?? null,
            symbol: alert.symbol,
            targetPrice: Number(alert.targetPrice),
            condition: alert.condition,
            currentPrice: price,
          };
          this.eventEmitter.emit(ALERT_TRIGGERED_EVENT, triggeredPayload);
        } finally {
          this.firingAlerts.delete(alert.id);
        }
      }
    }
  }

  private toDto(alert: Alert): AlertResponseDto {
    return {
      id: alert.id,
      symbol: alert.symbol,
      targetPrice: Number(alert.targetPrice),
      condition: alert.condition,
      active: alert.active,
      createdAt: alert.createdAt,
    };
  }
}
