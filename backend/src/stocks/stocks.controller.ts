import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StocksService, CandlePoint, QuotePoint } from './stocks.service';

@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('search')
  searchSymbols(@Query('q') q: string): Promise<{ symbol: string; description: string; type: string }[]> {
    if (!q || q.trim().length < 1) return Promise.resolve([]);
    return this.stocksService.searchSymbols(q.trim());
  }

  @Get(':symbol/quote')
  getQuote(@Param('symbol') symbol: string): Promise<QuotePoint> {
    return this.stocksService.getQuote(symbol);
  }

  @Get(':symbol/candles')
  getCandles(@Param('symbol') symbol: string): CandlePoint[] {
    return this.stocksService.getCandles(symbol);
  }
}
