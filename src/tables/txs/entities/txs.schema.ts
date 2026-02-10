import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';

export type TxDocument = Tx & Document;

@Schema()
export class Tx {

  @Prop({ required: true, default: () => new Date() })
  date: string;

  @Prop({ required: false })
  providerUrl?: string;

  @Prop({ required: true })
  network: string;

  @Prop({ required: true })
  tokenName: string;

  @Prop({ required: false })
  networkId?: string;

  @Prop({ required: true })
  buyerAddress: string;

  @Prop({ required: false })
  usdtReceiverAddress?: string;

  @Prop({ required: true })
  tokenReceiverAddress: string;

  @Prop({ required: true })
  txHash: string;

  @Prop({ required: false })
  usdtAddress?: string;

  @Prop({ required: true })
  usdtAmount: string;

  @Prop({ required: true })
  tokenAmount: string;

  @Prop({ required: false })
  weiUSDTValue?: string;

  @Prop({ required: false })
  weiTokenValue?: string;

  @Prop({ required: true })
  ogOndkHashTx: string;

  @Prop({ required: true })
  approved: boolean;

  @Prop({ required: true, enum: ['metamask', 'binance', 'metamask-sell'], default: 'metamask' })
  paymentMethod: string;

  @Prop({ required: false })
  merchantTradeNo?: string;
}

export const TxSchema = SchemaFactory.createForClass(Tx);
