import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { TxsService } from '../services/txs.service';
import { CreateTxDto, UpdateTxDto } from '../dto/tx.dto';
import { Tx } from '../entities/txs.schema';
import { AuthGuard } from '../../../auth/guards/auth.guard';

// Simple API Key guard to prevent direct API calls
@Injectable()
class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validKey = process.env.FRONTEND_API_KEY || 'ico-secure-key-2026';
    if (apiKey !== validKey) {
      console.error('API Key mismatch or missing. Rejecting request.');
      return false;
    }
    return true;
  }
}

@Controller('txs')
export class TxsController {
  constructor(private readonly txsService: TxsService) { }

  @Post()
  @UseGuards(ApiKeyGuard)
  async create(@Body() createTxDto: CreateTxDto): Promise<Tx> {
    return this.txsService.createTx(createTxDto);
  }

  @Post('sell')
  @UseGuards(ApiKeyGuard)
  async createSell(@Body() createTxDto: CreateTxDto): Promise<Tx> {
    return this.txsService.createSellTx(createTxDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(): Promise<Tx[]> {
    return this.txsService.findAllTxs();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findById(@Param('id') id: string): Promise<Tx | null> {
    return this.txsService.findTxById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() updateTxDto: UpdateTxDto) {
    return this.txsService.updateTx(id, updateTxDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async delete(@Param('id') id: string): Promise<Tx | null> {
    return this.txsService.deleteTx(id);
  }
}
