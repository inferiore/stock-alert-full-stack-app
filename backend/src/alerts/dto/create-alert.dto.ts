import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import type { AlertCondition } from '../entities/alert.entity';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  @Min(0.0001)
  targetPrice: number;

  @IsEnum(['above', 'below'])
  condition: AlertCondition;
}
