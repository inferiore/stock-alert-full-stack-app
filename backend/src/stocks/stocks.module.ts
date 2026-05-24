import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { STOCKS_SERVICE_TOKEN } from './interfaces/stocks.service.interface';

@Module({
  imports: [HttpModule],
  controllers: [StocksController],
  providers: [{ provide: STOCKS_SERVICE_TOKEN, useClass: StocksService }],
  exports: [STOCKS_SERVICE_TOKEN],
})
export class StocksModule {}
