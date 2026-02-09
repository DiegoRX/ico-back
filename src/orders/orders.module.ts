import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Order, OrderSchema } from './entities/order.schema';
import { Tx, TxSchema } from '../tables/txs/entities/txs.schema';
import { OrdersController } from './controllers/orders.controller';
import { BinanceController } from './controllers/binance.controller';
import { OrdersService } from './services/orders.service';
import { BlockchainService } from './services/blockchain.service';
import { PriceModule } from '../prices/price.module';

@Module({
    imports: [
        ConfigModule,
        PriceModule,
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: Tx.name, schema: TxSchema },
        ]),
    ],
    controllers: [OrdersController, BinanceController],
    providers: [OrdersService, BlockchainService],
    exports: [OrdersService, BlockchainService],
})
export class OrdersModule { }
