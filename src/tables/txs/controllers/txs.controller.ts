import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TxsService } from '../services/txs.service';
import { CreateTxDto, UpdateTxDto } from '../dto/tx.dto';
import { Tx } from '../entities/txs.schema';
import { AuthGuard } from '../../../auth/guards/auth.guard';

@Controller('txs')
export class TxsController {
  constructor(private readonly txsService: TxsService) {}

  @Post()
  async create(@Body() createTxDto: CreateTxDto): Promise<Tx> {
    return this.txsService.createTx(createTxDto);
  }
  @Post('sell')
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
