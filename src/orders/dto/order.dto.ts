import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteRequestDto {
    @ApiProperty({ example: 'ORIGEN', description: 'Token symbol to purchase' })
    @IsString()
    @IsNotEmpty()
    tokenSymbol: string;

    @ApiProperty({ example: '100', description: 'Amount of tokens to purchase' })
    @IsString()
    @IsNotEmpty()
    tokenAmount: string;

    @ApiProperty({ example: 'USDT', description: 'Currency to pay with (USDT, BNB)', default: 'USDT' })
    @IsString()
    @IsOptional()
    @IsEnum(['USDT', 'BNB'])
    paymentCurrency?: string;
}

export class QuoteResponseDto {
    @ApiProperty({ example: '100' })
    tokenAmount: string;

    @ApiProperty({ example: '50' })
    paymentAmount: string;

    @ApiProperty({ example: 'USDT' })
    paymentCurrency: string;

    @ApiProperty({ example: '0.5' })
    exchangeRate: string;

    @ApiProperty({ example: 'ORIGEN' })
    tokenSymbol: string;
}

export class CreateOrderDto {
    @ApiProperty({ example: 'ORIGEN', description: 'Token symbol to purchase' })
    @IsString()
    @IsNotEmpty()
    tokenSymbol: string;

    @ApiProperty({ example: '100', description: 'Amount of tokens to purchase' })
    @IsString()
    @IsNotEmpty()
    tokenAmount: string;

    @ApiProperty({ example: 'USDT', description: 'Currency to pay with (USDT, BNB)', default: 'USDT' })
    @IsString()
    @IsOptional()
    @IsEnum(['USDT', 'BNB'])
    paymentCurrency?: string;

    @ApiProperty({ example: '0x1234...', description: 'User wallet address to receive tokens' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid wallet address format' })
    userWalletAddress: string;
}

export class CreateOrderResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    orderId: string;

    @ApiProperty({ example: 'ORD_1234567890_abc123' })
    merchantTradeNo: string;

    @ApiProperty({ example: '100' })
    tokenAmount: string;

    @ApiProperty({ example: '50' })
    paymentAmount: string;

    @ApiProperty({ example: 'USDT' })
    paymentCurrency: string;

    @ApiProperty({ example: 'https://pay.binance.com/...' })
    paymentUrl: string;

    @ApiPropertyOptional({ example: 'https://...' })
    qrContent?: string;

    @ApiProperty({ example: 'PENDING' })
    status: string;
}

export class OrderStatusResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    orderId: string;

    @ApiProperty({ example: 'PENDING' })
    status: string;

    @ApiProperty({ example: 'ORIGEN' })
    tokenSymbol: string;

    @ApiProperty({ example: '100' })
    tokenAmount: string;

    @ApiProperty({ example: '50' })
    paymentAmount: string;

    @ApiPropertyOptional({ example: '0x...' })
    txHash?: string;

    @ApiPropertyOptional()
    paidAt?: Date;

    @ApiPropertyOptional()
    tokensSentAt?: Date;

    @ApiPropertyOptional({ example: 'Payment expired' })
    failureReason?: string;
}
