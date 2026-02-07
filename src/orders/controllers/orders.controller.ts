import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from '../services/orders.service';
import {
    QuoteRequestDto,
    QuoteResponseDto,
    CreateOrderDto,
    CreateOrderResponseDto,
    OrderStatusResponseDto,
} from '../dto/order.dto';

@ApiTags('orders')
@Controller('api/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('quote')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get price quote for token purchase' })
    @ApiResponse({ status: 200, description: 'Quote calculated successfully', type: QuoteResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid token or amount' })
    async getQuote(@Body() quoteRequest: QuoteRequestDto): Promise<QuoteResponseDto> {
        return this.ordersService.getQuote(quoteRequest);
    }

    @Post('create')
    @ApiOperation({ summary: 'Create new purchase order' })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: CreateOrderResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid input or payment service error' })
    async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<CreateOrderResponseDto> {
        return this.ordersService.createOrder(createOrderDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order status by ID' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderStatusResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async getOrderStatus(@Param('id') id: string): Promise<OrderStatusResponseDto> {
        return this.ordersService.getOrderStatus(id);
    }
}
