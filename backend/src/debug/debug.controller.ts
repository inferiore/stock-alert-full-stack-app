import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IsIn, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PRICE_UPDATE_EVENT } from '../common/events.constants';
import type { PriceUpdatePayload } from '../common/events.constants';

class SimulatePriceDto {
  @IsString() symbol: string;
  @IsNumber() @Min(0.01) @Type(() => Number) price: number;
}

@Controller('debug')
export class DebugController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Post('simulate-price')
  @HttpCode(200)
  simulatePrice(@Body() dto: SimulatePriceDto): { ok: true; payload: PriceUpdatePayload } {
    const payload: PriceUpdatePayload = {
      symbol: dto.symbol.toUpperCase(),
      price: dto.price,
      timestamp: Date.now(),
    };
    this.eventEmitter.emit(PRICE_UPDATE_EVENT, payload);
    return { ok: true, payload };
  }
}
