import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateTxDto {
  @ApiProperty({ description: 'Fecha de la transacción', example: '2024-06-26T17:35:05.400Z' })
  readonly date: string;

  @ApiProperty({ description: 'URL del proveedor', example: 'https://rpc-mainnet.maticvigil.com/' })
  readonly providerUrl: string;

  @ApiProperty({ description: 'Red de la blockchain', example: 'polygon' })
  readonly network: string;

  @ApiProperty({ description: 'Nombre del token', example: 'Token' })
  readonly tokenName: string;

  @ApiProperty({ description: 'ID de la red', example: '137' })
  readonly networkId: string;

  @ApiProperty({ description: 'Dirección del comprador', example: '0x697bc55e4c184f4c1f3e1e55d8a4090a66a61aa0' })
  readonly buyerAddress: string;

  @ApiProperty({ description: 'Dirección del receptor USDT', example: '0x316747dddD12840b29b87B7AF16Ba6407C17F19b' })
  readonly usdtReceiverAddress: string;

  @ApiProperty({ description: 'Dirección del receptor Token', example: '0xb71de5d4cce44d86e2fb9df6c49bbc970be4d1f8' })
  readonly ondkReceiverAddress: string;

  @ApiProperty({ description: 'Hash de la transacción', example: '0xb49aed9f947d6ca4b408619da9fd8fb9cbb9d2a5ad779445ce6ee0366d4af0c8' })
  readonly txHash: string;

  @ApiProperty({ description: 'Dirección del USDT', example: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' })
  readonly usdtAddress: string;

  @ApiProperty({ description: 'Cantidad de USDT', example: '0.03' })
  readonly usdtAmount: string;

  @ApiProperty({ description: 'Cantidad de ONDK', example: '0.01' })
  readonly ondkAmount: string;

  @ApiProperty({ description: 'Valor en wei del USDT', example: '30000' })
  readonly weiUSDTValue: string;

  @ApiProperty({ description: 'Valor en wei del ONDK', example: '10000000000000000' })
  readonly weiONDKValue: string;

  @ApiProperty({ description: 'Hash de la transacción Token original', example: '0xb49aed9f947d6ca4b408619da9fd8fb9cbb9d2a5ad779445ce6ee0366d4af0c8' })
  readonly ogOndkHashTx: string;

  @ApiProperty({ description: 'Aprobado', example: true })
  readonly approved: boolean;
}

export class UpdateTxDto extends PartialType(CreateTxDto) {}