import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tx, TxDocument } from '../entities/txs.schema';
import { CreateTxDto, UpdateTxDto } from '../dto/tx.dto';
import { async } from 'rxjs';
import { User } from 'src/users/entities/user.schema';
import TX from '../entities/Tx.js'
import { Wallet, ethers } from "ethers";
import { JsonRpcProvider } from "ethers";
import ERC20_ABI from '../../../config/abi/erc20.json'

@Injectable()
export class TxsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Tx.name) private txModel: Model<Tx>,
  ) { }

  async createTx(createTxDto: CreateTxDto) {
    console.log(createTxDto);

    // Verificar si la transacción ya fue procesada
    const existingTx = await this.txModel.findOne({ txHash: createTxDto.txHash }).exec();
    if (existingTx) {
      console.log('Transacción ya procesada:', createTxDto.txHash);
      return existingTx;
    }

    if (createTxDto.usdtReceiverAddress === '0x316747dddD12840b29b87B7AF16Ba6407C17F19b') {
      try {
        const PROVIDER_URL = process.env.PROVIDER_URL;
        const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
        console.log(provider);
        const privateKey = process.env.PRIVATE_KEY || '';

        if (!privateKey) {
          throw new Error('Private key not found');
        }
        const wallet = new ethers.Wallet(privateKey, provider);
        const gasLimit = 210000;
        const nonce = await wallet.getNonce();
        const gasPriceGwei = 40;
        const gasPriceWei = gasPriceGwei * 10 ** 9;

        let TOKEN_ADDRESS = ''

        


        if (createTxDto.tokenName === 'ONDK') {
          TOKEN_ADDRESS = process.env.ONDK_ADDRESS || '';
        } else if (createTxDto.tokenName === 'AUKA') {
          TOKEN_ADDRESS = process.env.AUKA_ADDRESS || '';
        }

        if (TOKEN_ADDRESS === '') {
          throw new Error('Token address not found');
        }

        if (createTxDto.tokenName != 'ORIGEN') {

        const RECEIVER_ADDRESS = createTxDto.ondkReceiverAddress;
        let amount = createTxDto.weiONDKValue;

        let tokenContract = new ethers.Contract(
          TOKEN_ADDRESS,
          ERC20_ABI,
          wallet
        );

        const tx = await tokenContract.transfer(RECEIVER_ADDRESS, amount);

        console.log(tx);
        const saveTx = new this.txModel({
          ...createTxDto,
          ogOndkHashTx: tx.hash,
          status: 'processed' // Marcamos la transacción como procesada
        });
        return saveTx.save();
      } else if (createTxDto.tokenName === 'ORIGEN') {
        const data = {
          to: createTxDto.ondkReceiverAddress,
          value: createTxDto.weiONDKValue,
          gasLimit: gasLimit,
          nonce: nonce,
          gasPrice: gasPriceWei,
        };
        const transaction = await wallet.sendTransaction(data);
    console.log(transaction);
    const tx = await transaction.wait();
    console.log(tx);
    const saveTx = new this.txModel({
      ...createTxDto,
      ogOndkHashTx: tx.hash,
      status: 'processed' // Marcamos la transacción como procesada
    });
    return saveTx.save();
      }
      } catch (error) {
        console.log(error);
      }
    }
  }

  async findAllTxs(): Promise<Tx[]> {
    return this.txModel.find().exec();
  }

  async findTxById(id: string): Promise<Tx | null> {
    return this.txModel.findById(id).exec();
  }

  async updateTx(id: string, changes: UpdateTxDto) {
    const tx = await this.txModel
      .findOneAndUpdate({ _id: id }, { $set: changes }, { new: true })
      .exec();
    console.log(tx);
    if (!tx) {
      throw new NotFoundException(`Tx #${id} not found`);
    }
  }

  async deleteTx(id: string): Promise<Tx | null> {
    return this.txModel.findByIdAndDelete(id).exec();
  }
}
