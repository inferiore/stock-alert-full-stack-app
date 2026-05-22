import { AlertCondition } from '../entities/alert.entity';

export class AlertResponseDto {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  active: boolean;
  createdAt: Date;
}
