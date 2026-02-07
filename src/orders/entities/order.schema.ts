import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum OrderStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    TOKENS_SENT = 'TOKENS_SENT',
    FAILED = 'FAILED',
}

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
    @Prop({ required: true, unique: true })
    merchantTradeNo: string;

    @Prop({ required: true })
    tokenSymbol: string;

    @Prop({ required: true })
    tokenAmount: string;

    @Prop({ required: true })
    paymentAmount: string;

    @Prop({ required: true })
    paymentCurrency: string;

    @Prop({ required: true })
    exchangeRate: string;

    @Prop({ required: true })
    userWalletAddress: string;

    @Prop()
    binancePrepayId: string;

    @Prop()
    binanceCheckoutUrl: string;

    @Prop()
    binanceQrContent: string;

    @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Prop()
    txHash: string;

    @Prop()
    paidAt: Date;

    @Prop()
    tokensSentAt: Date;

    @Prop()
    failureReason: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
