import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StocksService, CandlePoint } from './stocks.service';

@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get(':symbol/candles')
  getCandles(@Param('symbol') symbol: string): CandlePoint[] {
    return this.stocksService.getCandles(symbol);
  }
}
