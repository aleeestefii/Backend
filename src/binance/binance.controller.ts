import { Controller, Get } from '@nestjs/common';
import { BinanceService } from './binance.service';

@Controller('binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService) {}

  @Get('crypto-prediction')
  async getCryptoPrediction() {
    const data = await this.binanceService.getBinanceData();
    const predictedPrices = await this.binanceService.trainAndPredict(data);
    return { data, predictedPrices };
  }
}