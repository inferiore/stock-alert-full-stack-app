import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StocksService, CandlePoint, QuotePoint } from './stocks.service';

@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get(':symbol/quote')
  getQuote(@Param('symbol') symbol: string): Promise<QuotePoint> {
    return this.stocksService.getQuote(symbol);
  }

  @Get(':symbol/candles')
  getCandles(@Param('symbol') symbol: string): CandlePoint[] {
    return this.stocksService.getCandles(symbol);
  }
}
