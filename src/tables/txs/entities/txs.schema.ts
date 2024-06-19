import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';

export type TxDocument = Tx & Document;

@Schema()
export class Tx {  
  
  @Prop({ required: true, default: () => new Date() })
  date: string;

  @Prop({ required: true })
  providerUrl: string;

  @Prop({ required: true })
  network: string;

  @Prop({ required: true })
  networkId: string;

  @Prop({ required: true })
  buyerAddress: string;

  @Prop({ required: true })
  usdtReceiverAddress: string;



  @Prop({ required: true })
  ondkReceiverAddress: string;

  @Prop({ required: true })
  txHash: string;

  @Prop({ required: true })
  usdtAddress: string;

  @Prop({ required: true })
  usdtAmount: string;

  @Prop({ required: true })
  ondkAmount: string;

  @Prop({ required: true })
  weiUSDTValue: string;

  @Prop({ required: true })
  weiONDKValue: string;

  @Prop({ required: true })
  ogOndkHashTx: string;

  @Prop({ required: true })
  approved: boolean;
}

export const TxSchema = SchemaFactory.createForClass(Tx);
