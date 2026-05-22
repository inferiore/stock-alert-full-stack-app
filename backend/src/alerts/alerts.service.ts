import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  ALERT_TRIGGERED_EVENT,
  AlertTriggeredPayload,
  PRICE_UPDATE_EVENT,
  PriceUpdatePayload,
} from '../common/events.constants';
import { AlertResponseDto } from './dto/alert-response.dto';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Alert } from './entities/alert.entity';
import { AlertsRepository } from './repositories/alerts.repository';

@Injectable()
export class AlertsService {
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
    const { symbol, price } = payload;
    const alerts = await this.alertsRepository.findActiveBySymbol(symbol);

    for (const alert of alerts) {
      const triggered =
        (alert.condition === 'above' && price >= alert.targetPrice) ||
        (alert.condition === 'below' && price <= alert.targetPrice);

      if (triggered) {
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
