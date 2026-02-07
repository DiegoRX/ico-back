import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument, OrderStatus } from '../entities/order.schema';
import {
    QuoteRequestDto,
    QuoteResponseDto,
    CreateOrderDto,
    CreateOrderResponseDto,
    OrderStatusResponseDto,
} from '../dto/order.dto';
import { BlockchainService } from './blockchain.service';

interface BinancePayResponse {
    status: string;
    code: string;
    data?: {
        prepayId: string;
        terminalType: string;
        expireTime: number;
        qrcodeLink: string;
        qrContent: string;
        checkoutUrl: string;
        deeplink: string;
        universalUrl: string;
    };
    errorMessage?: string;
}

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    // Precios fijos por token (USDT)
    private readonly tokenPrices: Record<string, string> = {
        ORIGEN: '0.5',
        ONDK: '1.0',
        AUKA: '1.0',
        USDK: '1.0',
    };

    private bnbPriceUsdt: string = '400'; // Default fallback

    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
        private readonly configService: ConfigService,
        private readonly blockchainService: BlockchainService,
    ) {
        const bnbPrice = this.configService.get<string>('BNB_PRICE_USDT');
        if (bnbPrice) {
            this.bnbPriceUsdt = bnbPrice;
        }
    }

    /**
     * Get quote for token purchase
     */
    async getQuote(quoteRequest: QuoteRequestDto): Promise<QuoteResponseDto> {
        const { tokenSymbol, tokenAmount, paymentCurrency = 'USDT' } = quoteRequest;
        const symbol = tokenSymbol.toUpperCase();
        const currency = paymentCurrency.toUpperCase();

        const tokenPriceUsdt = this.tokenPrices[symbol];
        if (!tokenPriceUsdt) {
            throw new BadRequestException(`Token ${symbol} not supported for purchase`);
        }

        const amount = parseFloat(tokenAmount);
        if (isNaN(amount) || amount <= 0) {
            throw new BadRequestException('Invalid token amount');
        }

        let totalUsdt = amount * parseFloat(tokenPriceUsdt);
        let finalPaymentAmount = totalUsdt.toString();
        let exchangeRate = tokenPriceUsdt;

        if (currency === 'BNB') {
            const bnbRate = parseFloat(this.bnbPriceUsdt);
            const totalBnb = totalUsdt / bnbRate;
            finalPaymentAmount = totalBnb.toFixed(6);
            exchangeRate = (parseFloat(tokenPriceUsdt) / bnbRate).toFixed(6);
        }

        return {
            tokenSymbol: symbol,
            tokenAmount: tokenAmount,
            paymentAmount: finalPaymentAmount,
            paymentCurrency: currency,
            exchangeRate,
        };
    }

    /**
     * Create a new order and initiate Binance Pay payment
     */
    async createOrder(createOrderDto: CreateOrderDto): Promise<CreateOrderResponseDto> {
        const { tokenSymbol, tokenAmount, userWalletAddress, paymentCurrency = 'USDT' } = createOrderDto;
        const symbol = tokenSymbol.toUpperCase();
        const currency = paymentCurrency.toUpperCase();

        // Validate wallet address
        if (!this.blockchainService.isValidAddress(userWalletAddress)) {
            throw new BadRequestException('Invalid wallet address');
        }

        // Get quote
        const quote = await this.getQuote({ tokenSymbol: symbol, tokenAmount, paymentCurrency: currency });

        // Generate unique merchant trade number
        const merchantTradeNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Create order in database
        const order = new this.orderModel({
            merchantTradeNo,
            tokenSymbol: symbol,
            tokenAmount,
            paymentAmount: quote.paymentAmount,
            paymentCurrency: currency,
            exchangeRate: quote.exchangeRate,
            userWalletAddress,
            status: OrderStatus.PENDING,
        });

        // Call Binance Pay via Worker
        const binanceResponse = await this.createBinancePayOrder(
            merchantTradeNo,
            quote.paymentAmount,
            currency,
            `Compra de ${tokenAmount} ${symbol}`,
        );

        if (binanceResponse.status !== 'SUCCESS' || !binanceResponse.data) {
            this.logger.error('Binance Pay error:', binanceResponse);
            throw new BadRequestException(
                binanceResponse.errorMessage || 'Error creating Binance Pay order',
            );
        }

        // Update order with Binance info
        order.binancePrepayId = binanceResponse.data.prepayId;
        order.binanceCheckoutUrl = binanceResponse.data.checkoutUrl;
        order.binanceQrContent = binanceResponse.data.qrContent;

        await order.save();
        this.logger.log(`Order created: ${order._id} - ${merchantTradeNo}`);

        return {
            orderId: (order._id as any).toString(),
            merchantTradeNo,
            tokenAmount,
            paymentAmount: quote.paymentAmount,
            paymentCurrency: currency,
            paymentUrl: binanceResponse.data.checkoutUrl,
            qrContent: binanceResponse.data.qrContent,
            status: OrderStatus.PENDING,
        };
    }

    /**
     * Get order status by ID
     */
    async getOrderStatus(orderId: string): Promise<OrderStatusResponseDto> {
        const order = await this.orderModel.findById(orderId).exec();
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        return {
            orderId: (order._id as any).toString(),
            status: order.status,
            tokenSymbol: order.tokenSymbol,
            tokenAmount: order.tokenAmount,
            paymentAmount: order.paymentAmount,
            txHash: order.txHash,
            paidAt: order.paidAt,
            tokensSentAt: order.tokensSentAt,
            failureReason: order.failureReason,
        };
    }

    /**
     * Get order by merchant trade number
     */
    async getOrderByMerchantTradeNo(merchantTradeNo: string): Promise<OrderDocument | null> {
        return this.orderModel.findOne({ merchantTradeNo }).exec();
    }

    /**
     * Process successful payment from webhook
     */
    async processPayment(merchantTradeNo: string): Promise<void> {
        const order = await this.getOrderByMerchantTradeNo(merchantTradeNo);
        if (!order) {
            this.logger.warn(`Order not found for merchantTradeNo: ${merchantTradeNo}`);
            return;
        }

        // Check idempotency - don't process twice
        if (order.status !== OrderStatus.PENDING) {
            this.logger.log(`Order ${merchantTradeNo} already processed, status: ${order.status}`);
            return;
        }

        // Mark as paid
        order.status = OrderStatus.PAID;
        order.paidAt = new Date();
        await order.save();
        this.logger.log(`Order ${merchantTradeNo} marked as PAID`);

        // Transfer tokens
        try {
            const result = await this.blockchainService.transferToken(
                order.userWalletAddress,
                order.tokenAmount,
                order.tokenSymbol,
            );

            if (result.success && result.txHash) {
                order.status = OrderStatus.TOKENS_SENT;
                order.txHash = result.txHash;
                order.tokensSentAt = new Date();
                await order.save();
                this.logger.log(`Tokens sent for order ${merchantTradeNo}, txHash: ${result.txHash}`);
            } else {
                order.status = OrderStatus.FAILED;
                order.failureReason = result.error || 'Token transfer failed';
                await order.save();
                this.logger.error(`Token transfer failed for order ${merchantTradeNo}: ${result.error}`);
            }
        } catch (error: any) {
            order.status = OrderStatus.FAILED;
            order.failureReason = error.message;
            await order.save();
            this.logger.error(`Token transfer exception for order ${merchantTradeNo}: ${error.message}`);
        }
    }

    /**
     * Call Cloudflare Worker to create Binance Pay order
     */
    private async createBinancePayOrder(
        merchantTradeNo: string,
        amount: string,
        currency: string,
        description: string,
    ): Promise<BinancePayResponse> {
        const workerUrl = this.configService.get<string>('BINANCE_WORKER_URL');
        const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

        if (!workerUrl) {
            throw new BadRequestException('Binance Worker URL not configured');
        }

        try {
            const response = await fetch(`${workerUrl}/api/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': internalApiKey || '',
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    description,
                    merchantTradeNo,
                }),
            });

            return await response.json() as BinancePayResponse;
        } catch (error: any) {
            this.logger.error(`Binance Worker call failed: ${error.message}`);
            throw new BadRequestException('Failed to connect to payment service');
        }
    }
}
