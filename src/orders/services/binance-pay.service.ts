import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class BinancePayService {
    private readonly logger = new Logger(BinancePayService.name);
    private readonly apiKey: string;
    private readonly secretKey: string;
    private readonly apiUrl: string;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('BINANCE_API_KEY');
        this.secretKey = this.configService.get<string>('BINANCE_SECRET_KEY');
        this.apiUrl = 'https://bpay.binanceapi.com';
    }

    async createOrder(
        merchantTradeNo: string,
        amount: number,
        currency: string,
        description: string,
    ): Promise<any> {
        if (!this.apiKey || !this.secretKey) {
            this.logger.error('Binance API credentials missing');
            throw new BadRequestException('Payment service configuration error');
        }

        const timestamp = Date.now().toString();
        const nonce = crypto.randomUUID().replace(/-/g, '');

        const payload = {
            env: { terminalType: 'WEB' },
            merchantTradeNo: merchantTradeNo,
            orderAmount: amount, // V3 expects number
            currency: currency.toUpperCase(),
            description: description || 'Order',
            goodsDetails: [{
                goodsType: '01',
                goodsCategory: 'Z000',
                referenceGoodsId: 'USDT_PURCHASE',
                goodsName: (description || 'USDT Purchase').slice(0, 256),
                goodsDetail: (description || 'Purchase of USDT via Binance Pay').slice(0, 512)
            }]
        };

        const payloadString = JSON.stringify(payload);
        const signatureString = timestamp + '\n' + nonce + '\n' + payloadString + '\n';

        const signature = crypto
            .createHmac('sha512', this.secretKey)
            .update(signatureString)
            .digest('hex')
            .toUpperCase();

        this.logger.log(`Creating Binance Pay Order V3: ${merchantTradeNo}`);

        try {
            const response = await fetch(`${this.apiUrl}/binancepay/openapi/v3/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'BinancePay-Timestamp': timestamp,
                    'BinancePay-Nonce': nonce,
                    'BinancePay-Certificate-SN': this.apiKey,
                    'BinancePay-Signature': signature
                },
                body: payloadString
            });

            const data = await response.json() as any;

            if (data.status !== 'SUCCESS') {
                this.logger.error(`Binance Pay Error: ${JSON.stringify(data)}`);
                throw new Error(data.errorMessage || data.msg || 'Unknown error from Binance Pay');
            }

            return {
                status: 'SUCCESS',
                data: data.data
            };
        } catch (error: any) {
            this.logger.error(`Binance Pay Request Failed: ${error.message}`);
            throw new BadRequestException(`Binance Pay Error: ${error.message}`);
        }
    }
}
