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

  // unique: hard DB-level guarantee against double payouts for one payment.
  // NOTE: the index only builds if the collection has no duplicate txHash
  // docs — clean up existing duplicates (e.g. the 2026-07-28 double payout)
  // or Mongo will skip creating it.
  @Prop({ required: true, unique: true, index: true })
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

  @Prop({ required: true, default: false })
  approved: boolean;

  // Without an explicit @Prop the schema is strict and Mongoose silently
  // dropped the status the service was already setting, so it never persisted.
  @Prop({ required: false, enum: ['pending', 'processed', 'failed'], default: 'pending' })
  status: string;

  @Prop({ required: true, enum: ['metamask', 'binance', 'metamask-sell'], default: 'metamask' })
  paymentMethod: string;

  @Prop({ required: false })
  merchantTradeNo?: string;
}

export const TxSchema = SchemaFactory.createForClass(Tx);
