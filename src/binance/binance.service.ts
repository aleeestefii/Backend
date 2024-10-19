import { Injectable } from '@nestjs/common';
import ccxt from 'ccxt';
import * as tf from '@tensorflow/tfjs-node';
import * as math from 'mathjs';

@Injectable()
export class BinanceService {
  private binance = new ccxt.binance({
    apiKey: 'CKX8dF6jSiNp1fYfDZPJGrYynLNsw1B8Q8wT2jmNlatorPFIrBdzHjNBjCdRRtvm',
    secret: '6erVumoTdzpAnNLwydKRJVy5QI1YUQe5XxPWWUiCvvCzqOg1IYeMgBHPS6qwZMCV',
  });

  async getBinanceData(symbol = 'BTC/USDT', limit = 4000) {
    const ohlcv = await this.binance.fetchOHLCV(symbol, '1h', undefined, limit);
    return ohlcv.map(candle => ({
      timestamp: new Date(candle[0]),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
  }

  async trainAndPredict(data) {
    const closePrices = data.map(row => row.close);
    const scaler = this.scaleData(closePrices);
    const X_train = this.createTrainingData(scaler);

    const model = this.createLSTMModel();
    await model.fit(X_train.inputs, X_train.outputs, { epochs: 5, batchSize: 32 });

    const predictedPrices = this.predictNextPrices(model, X_train.inputs.slice(-1), scaler);
    return predictedPrices;
  }

  scaleData(data) {
    //using mathjs normalization we could
    const max = math.max(...data);
    const min = math.min(...data);
    return data.map(value => (value - min) / (max - min));
}

  createTrainingData(scaledData) {
    const X_train = [];
    const y_train = [];

    for (let i = 60; i < scaledData.length; i++) {
      X_train.push(scaledData.slice(i - 60, i));
      y_train.push(scaledData[i]);
    }

    const X_train_tensor = tf.tensor(X_train).reshape([X_train.length, 60, 1]);
    const y_train_tensor = tf.tensor(y_train);
    return { inputs: X_train_tensor, outputs: y_train_tensor };
  }

  createLSTMModel() {
    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 100, returnSequences: true, inputShape: [60, 1] }));
    model.add(tf.layers.lstm({ units: 100 }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
  }

  predictNextPrices(model, lastInputs, scaler) {
    let inputs = lastInputs;
    const predictedPrices = [];

    for (let i = 0; i < 48; i++) {
      const predictedPrice = model.predict(tf.tensor(inputs).reshape([1, 60, 1])).dataSync();
      predictedPrices.push(predictedPrice[0]);

      inputs = inputs.slice(1);
      inputs.push(predictedPrice[0]);
    }

    return predictedPrices.map(price => price * scaler);  
  }
}