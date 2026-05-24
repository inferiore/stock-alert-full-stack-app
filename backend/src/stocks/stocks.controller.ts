import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CandlePoint, QuotePoint } from './stocks.service';
import type { IStocksService } from './interfaces/stocks.service.interface';
import { STOCKS_SERVICE_TOKEN } from './interfaces/stocks.service.interface';

@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StocksController {
  constructor(
    @Inject(STOCKS_SERVICE_TOKEN)
    private readonly stocksService: IStocksService,
  ) {}

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
  getCandles(@Param('symbol') symbol: string): Promise<CandlePoint[]> {
    return this.stocksService.getCandles(symbol);
  }
}
