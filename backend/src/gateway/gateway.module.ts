import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StockPriceGateway } from './stock-price.gateway';
import { WsJwtGuard } from './ws-jwt.guard';
import { FinnhubModule } from '../finnhub/finnhub.module';

@Module({
  imports: [
    FinnhubModule,
    JwtModule.register({}), // secret resolved at runtime in guard
    ConfigModule,
  ],
  providers: [StockPriceGateway, WsJwtGuard],
})
export class GatewayModule {}
