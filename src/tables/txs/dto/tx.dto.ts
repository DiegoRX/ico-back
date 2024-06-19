import { ApiProperty, PartialType } from '@nestjs/swagger';
export class CreateTxDto {
  readonly date: string;
  readonly providerUrl: string;
  readonly network: string;
  readonly netwotkId: string;
  readonly buyerAddress: string;
  readonly usdtReceiverAddress: string;
  readonly ondkReceiverAddress: string;
  readonly txHash: string;
  readonly usdtAddress: string;
  readonly usdtAmount: string;
  readonly ondkAmount: string;
  readonly weiUSDTValue: string;
  readonly weiONDKValue: string;
  readonly ogOndkHashTx: string;
  readonly approved: boolean;
}
export class UpdateTxDto extends PartialType(CreateTxDto) {}
