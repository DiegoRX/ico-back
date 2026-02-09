import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoldPriceData {
    ounce: number;
    gram: number;
    source: string;
    timestamp: Date;
}

@Injectable()
export class PriceService {
    private readonly logger = new Logger(PriceService.name);

    // Cache
    private cachedGoldPrice: GoldPriceData | null = null;
    private lastUpdate: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Fallbacks
    private readonly FALLBACK_PRICE_OZ = 2000.00;

    constructor(private readonly configService: ConfigService) { }

    /**
     * Get current gold price
     */
    async getGoldPrice(): Promise<GoldPriceData> {
        const now = Date.now();

        // Return cached if valid
        if (this.cachedGoldPrice && (now - this.lastUpdate < this.CACHE_TTL)) {
            return this.cachedGoldPrice;
        }

        // Try sources
        let price = await this.fetchGoldApi();

        if (!price) {
            price = await this.fetchBinancePaxg();
        }

        if (!price) {
            this.logger.warn('All gold price sources failed. Using static fallback.');
            price = {
                ounce: this.FALLBACK_PRICE_OZ,
                gram: this.FALLBACK_PRICE_OZ / 31.1035,
                source: 'fallback',
                timestamp: new Date()
            };
        }

        // Update cache
        this.cachedGoldPrice = price;
        this.lastUpdate = now;

        return price;
    }

    /**
     * Source 1: GoldAPI.io (Requires Key)
     */
    private async fetchGoldApi(): Promise<GoldPriceData | null> {
        const apiKey = this.configService.get<string>('GOLD_API_KEY');
        if (!apiKey) return null;

        try {
            const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
                headers: {
                    'x-access-token': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as any;
                // data.price is per ounce usually, check docs. 
                // GoldAPI returns "price" which is per ounce if symbol is XAU/USD
                const priceOz = data.price;

                if (priceOz && !isNaN(priceOz)) {
                    return {
                        ounce: priceOz,
                        gram: priceOz / 31.1035,
                        source: 'goldapi.io',
                        timestamp: new Date()
                    };
                }
            }
        } catch (error) {
            this.logger.warn(`GoldAPI.io failed: ${error.message}`);
        }
        return null;
    }

    /**
     * Source 2: Binance PAXG/USDT (Reliable Proxy)
     */
    private async fetchBinancePaxg(): Promise<GoldPriceData | null> {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
            if (response.ok) {
                const data = await response.json() as any;
                const priceOz = parseFloat(data.price);

                if (!isNaN(priceOz) && priceOz > 0) {
                    return {
                        ounce: priceOz,
                        gram: priceOz / 31.1035,
                        source: 'binance_paxg',
                        timestamp: new Date()
                    };
                }
            }
        } catch (error) {
            this.logger.warn(`Binance PAXG failed: ${error.message}`);
        }
        return null;
    }
}
