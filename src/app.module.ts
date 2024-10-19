import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceService } from './binance/binance.service';
import { BinanceModule } from './binance/binance.module';

@Module({
  imports: [BinanceModule],
  controllers: [AppController],
  providers: [AppService, BinanceService],
})
export class AppModule {}
