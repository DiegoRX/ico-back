import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument, OrderStatus } from '../entities/order.schema';
import { Tx, TxDocument } from '../../tables/txs/entities/txs.schema';
import {
    QuoteRequestDto,
    QuoteResponseDto,
    CreateOrderDto,
    CreateOrderResponseDto,
    OrderStatusResponseDto,
} from '../dto/order.dto';
import { BlockchainService } from './blockchain.service';
import { PriceService } from '../../prices/price.service';
import { BinancePayService } from './binance-pay.service';


@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    // Precios fijos por token (USDT) - Fallbacks ONLY
    private readonly tokenPrices: Record<string, string> = {
        ONDK: '1.0',
        USDK: '1.0',
    };

    private bnbPriceUsdt: string = '400'; // Default fallback
    private readonly PAYMENT_COMMISSION_PERCENT = 1.015; // 1.5% Commission

    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
        @InjectModel(Tx.name) private readonly txModel: Model<TxDocument>,
        private readonly configService: ConfigService,
        private readonly blockchainService: BlockchainService,
        private readonly priceService: PriceService,
        private readonly binancePayService: BinancePayService,
    ) {
        const bnbPrice = this.configService.get<string>('BNB_PRICE_USDT');
        if (bnbPrice) {
            this.bnbPriceUsdt = bnbPrice;
        }
    }

    /**
     * Get live BNB price from Binance API
     */
    private async fetchLiveBnbPrice(): Promise<number> {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            if (response.ok) {
                const data = await response.json() as any;
                const price = parseFloat(data.price);
                if (!isNaN(price) && price > 0) {
                    // this.logger.log(`Fetched live BNB price: ${price} USDT`);
                    this.bnbPriceUsdt = price.toString();
                    return price;
                }
            }
            this.logger.warn('Failed to fetch live BNB price from Binance, using fallback');
        } catch (error: any) {
            this.logger.error(`Error fetching BNB price: ${error.message}`);
        }
        return parseFloat(this.bnbPriceUsdt);
    }

    /**
     * Get quote for token purchase
     */
    async getQuote(quoteRequest: QuoteRequestDto): Promise<QuoteResponseDto> {
        const { tokenSymbol, tokenAmount, paymentCurrency = 'USDT', paymentMethod = 'metamask', type = 'buy' } = quoteRequest;
        const symbol = tokenSymbol.toUpperCase();
        const currency = paymentCurrency.toUpperCase();

        const amount = parseFloat(tokenAmount);
        if (isNaN(amount) || amount <= 0) {
            throw new BadRequestException('Invalid token amount');
        }

        // --- DYNAMIC GOLD PRICING ---
        const goldPriceData = await this.priceService.getGoldPrice();
        const goldPriceOz = goldPriceData.ounce;
        const goldPriceGram = goldPriceData.gram;

        let baseTokenPriceUsdt = 1.0; // Default

        if (symbol === 'AUKA') {
            // AUKA = 1 Ounce of Gold
            baseTokenPriceUsdt = goldPriceOz;
        } else if (symbol === 'ORIGEN') {
            // ORIGEN = 1 Gram of Gold / 55
            // 1 Troy Ounce = 31.1035 Grams
            const goldPriceGram = goldPriceOz / 31.1035;
            baseTokenPriceUsdt = goldPriceGram / 55;
        } else if (symbol === 'USDK' || symbol === 'ONDK') {
            // USDK/ONDK = 1 USD
            baseTokenPriceUsdt = 1.0;
        } else {
            // Check static map or default to 1
            const staticPrice = this.tokenPrices[symbol];
            baseTokenPriceUsdt = staticPrice ? parseFloat(staticPrice) : 0;
            if (baseTokenPriceUsdt === 0) {
                // If unknown token, maybe throw error or default? 
                // Current logic implies 0 or error. Let's assume 1.0 or error.
                // But for safety, let's log and keep 0 to fail if needed or handle logic.
                // Actually, if it's 0, totalUsdt is 0.
            }
        }

        let totalUsdt = amount * baseTokenPriceUsdt;

        // --- COMMISSION LOGIC ---
        // Se suma el 1.5% si el método es binance para que lo pague el usuario
        if (paymentMethod === 'binance') {
            if (type === 'buy') {
                totalUsdt = totalUsdt * 1.015;
            } else {
                totalUsdt = totalUsdt / 1.015;
            }
        }

        let finalPaymentAmount = totalUsdt.toString();

        // Calculate effective exchange rate (USDT per Token)
        const effectiveRate = totalUsdt / amount;
        let exchangeRate = effectiveRate.toFixed(paymentCurrency === 'BNB' ? 8 : 4);

        if (currency === 'BNB') {
            const bnbRate = await this.fetchLiveBnbPrice();
            const totalBnb = totalUsdt / bnbRate;
            finalPaymentAmount = totalBnb.toFixed(6);

            // Recalculate exchange rate in BNB if needed, or keep USDT?
            // Usually exchange rate is BaseToken/PaymentCurrency.
            // If user pays BNB, rate is X BNB / 1 Token
            exchangeRate = (totalBnb / amount).toFixed(6);
        }

        return {
            tokenSymbol: symbol,
            tokenAmount: tokenAmount,
            paymentAmount: finalPaymentAmount,
            paymentCurrency: currency,
            exchangeRate,
            goldPrice: goldPriceData,
            validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 min validity
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

        // Get quote (ALWAYS RE-CALCULATE PRICE)
        const quote = await this.getQuote({
            tokenSymbol: symbol,
            tokenAmount,
            paymentCurrency: currency,
            paymentMethod: 'binance' // Always binance for this method
        });

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

        // Call Binance Pay via Service (Internal)
        const binanceResponse = await this.binancePayService.createOrder(
            merchantTradeNo,
            parseFloat(quote.paymentAmount),
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

                // CREAR REGISTRO EN LA COLECCIÓN 'txs' (Unificación Phase 10)
                try {
                    const unifiedTx = new this.txModel({
                        network: 'Binance Pay',
                        tokenName: order.tokenSymbol,
                        buyerAddress: 'Binance Account', // No siempre tenemos la dirección de la wallet pagadora en BP
                        tokenReceiverAddress: order.userWalletAddress,
                        txHash: `BP-${order.merchantTradeNo}`, // ID de seguimiento interno para el pago
                        usdtAmount: order.paymentAmount,
                        tokenAmount: order.tokenAmount,
                        ogOndkHashTx: result.txHash, // El hash de la entrega de tokens
                        approved: true,
                        paymentMethod: 'binance',
                        merchantTradeNo: order.merchantTradeNo,
                    });
                    await unifiedTx.save();
                    this.logger.log(`Unified tx record created for Binance order: ${merchantTradeNo}`);
                } catch (saveError: any) {
                    this.logger.error(`Failed to create unified tx record: ${saveError.message}`);
                }
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


}
