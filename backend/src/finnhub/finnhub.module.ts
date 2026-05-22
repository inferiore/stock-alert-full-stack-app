import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { FINNHUB_SERVICE_TOKEN } from './interfaces/finnhub.service.interface';

@Module({
  providers: [{ provide: FINNHUB_SERVICE_TOKEN, useClass: FinnhubService }],
  exports: [FINNHUB_SERVICE_TOKEN],
})
export class FinnhubModule {}
