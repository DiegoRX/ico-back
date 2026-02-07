import {
    Controller,
    Post,
    Body,
    Headers,
    RawBodyRequest,
    Req,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { OrdersService } from '../services/orders.service';
import * as crypto from 'crypto';

interface BinanceWebhookPayload {
    bizType: string;
    bizId: string;
    bizStatus: string;
    data: string; // JSON string
}

interface BinanceWebhookData {
    merchantTradeNo: string;
    productType: string;
    productName: string;
    tradeType: string;
    totalFee: string;
    currency: string;
    transactTime: number;
    payerInfo?: {
        firstName?: string;
        lastName?: string;
    };
}

@ApiExcludeController()
@ApiTags('binance')
@Controller('api/binance')
export class BinanceController {
    private readonly logger = new Logger(BinanceController.name);

    constructor(
        private readonly ordersService: OrdersService,
        private readonly configService: ConfigService,
    ) { }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Binance Pay webhook endpoint' })
    async handleWebhook(
        @Headers('binancepay-timestamp') timestamp: string,
        @Headers('binancepay-nonce') nonce: string,
        @Headers('binancepay-signature') signature: string,
        @Headers('binancepay-certificate-sn') certificateSn: string,
        @Body() payload: BinanceWebhookPayload,
        @Req() req: RawBodyRequest<Request>,
    ): Promise<{ returnCode: string; returnMessage: string }> {
        this.logger.log(`Webhook received: bizType=${payload.bizType}, bizStatus=${payload.bizStatus}`);

        // Verificar firma del webhook
        const isValid = this.verifyWebhookSignature(
            timestamp,
            nonce,
            signature,
            req.rawBody?.toString() || JSON.stringify(payload),
        );

        if (!isValid) {
            this.logger.warn('Invalid webhook signature');
            throw new BadRequestException('Invalid signature');
        }

        // Solo procesar pagos exitosos
        if (payload.bizType === 'PAY' && payload.bizStatus === 'PAY_SUCCESS') {
            try {
                const data: BinanceWebhookData = JSON.parse(payload.data);
                this.logger.log(`Processing payment for order: ${data.merchantTradeNo}`);

                await this.ordersService.processPayment(data.merchantTradeNo);
            } catch (error: any) {
                this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
                // Still return success to Binance to avoid retries
            }
        }

        // Return success to Binance
        return {
            returnCode: 'SUCCESS',
            returnMessage: 'OK',
        };
    }

    /**
     * Verify Binance Pay webhook signature
     * Based on: https://developers.binance.com/docs/binance-pay/webhook
     */
    private verifyWebhookSignature(
        timestamp: string,
        nonce: string,
        signature: string,
        body: string,
    ): boolean {
        // En desarrollo, podemos saltar la verificación
        const skipVerification = this.configService.get<string>('SKIP_WEBHOOK_VERIFICATION');
        if (skipVerification === 'true') {
            this.logger.warn('Webhook signature verification SKIPPED (dev mode)');
            return true;
        }

        const webhookSecret = this.configService.get<string>('BINANCE_PAY_WEBHOOK_SECRET');
        if (!webhookSecret) {
            this.logger.warn('Webhook secret not configured, skipping verification');
            return true; // En producción deberías retornar false
        }

        try {
            // Construct the payload string as per Binance docs
            const payloadToSign = `${timestamp}\n${nonce}\n${body}\n`;

            // Create HMAC-SHA512 signature
            const hmac = crypto.createHmac('sha512', webhookSecret);
            hmac.update(payloadToSign);
            const computedSignature = hmac.digest('hex').toUpperCase();

            return signature.toUpperCase() === computedSignature;
        } catch (error: any) {
            this.logger.error(`Signature verification error: ${error.message}`);
            return false;
        }
    }
}
