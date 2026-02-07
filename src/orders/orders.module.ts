import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Order, OrderSchema } from './entities/order.schema';
import { OrdersController } from './controllers/orders.controller';
import { BinanceController } from './controllers/binance.controller';
import { OrdersService } from './services/orders.service';
import { BlockchainService } from './services/blockchain.service';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ],
    controllers: [OrdersController, BinanceController],
    providers: [OrdersService, BlockchainService],
    exports: [OrdersService, BlockchainService],
})
export class OrdersModule { }
