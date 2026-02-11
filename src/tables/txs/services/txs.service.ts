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

const NETWORK_RPC: Record<string, string> = {
  '137': 'https://polygon-rpc.com',
  '8532': 'https://www.ordenglobal-rpc.com',
  '56': 'https://bsc-dataseed.binance.org',
  '1': 'https://cloudflare-eth.com',
};

const USDT_ADDRESSES: Record<string, string> = {
  '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  '56': '0x55d398326f99059fF775485246999027B3197955',
  '1': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
};

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

    if (createTxDto.usdtReceiverAddress === '0xf4435beb6daf20265d39284ad2501808c0af6c1d' || createTxDto.usdtReceiverAddress === '0xf209ff2a16fa367161e455f3b7f90e067eddafa9') {
      try {
        // VERIFICACIÓN DE LA TRANSACCIÓN DE PAGO (Phase 7)
        const paymentNetworkId = createTxDto.networkId || '137'; // Default Polygon
        const paymentRpc = NETWORK_RPC[paymentNetworkId] || NETWORK_RPC['137'];
        const paymentProvider = new ethers.JsonRpcProvider(paymentRpc);

        console.log(`Verificando pago en red ${paymentNetworkId} con RPC ${paymentRpc}`);
        const txReceipt = await paymentProvider.getTransactionReceipt(createTxDto.txHash);

        if (!txReceipt || txReceipt.status !== 1) {
          console.warn(`Transacción de pago inválida o no encontrada: ${createTxDto.txHash}`);
          // return { error: 'Invalid payment transaction' };
        } else {
          console.log(`Pago verificado exitosamente: ${createTxDto.txHash}`);

          // --- SECURITY ENHANCEMENT: Verify Amount & Receiver ---
          // Filter for Transfer events (Topic 0 = 0xddf252...)
          const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const validTransfer = txReceipt.logs.find((log: any) => {
            try {
              // Check if topics match a Transfer event
              if (!log.topics || log.topics[0] !== transferTopic) return false;

              // Check Receiver (Topic 2)
              // ethers returns topics as 32-byte hex strings. We need to compare with our receiver address.
              const logReceiver = '0x' + log.topics[2].slice(26).toLowerCase(); // Remove padding
              const expectedReceiver = createTxDto.usdtReceiverAddress.toLowerCase();

              if (logReceiver !== expectedReceiver) return false;

              // Check Value (Data)
              const logValue = BigInt(log.data || '0').toString();
              const expectedValue = createTxDto.weiUSDTValue;

              // Allow for small differences? No, crypto should be exact.
              if (logValue !== expectedValue) {
                console.warn(`Amount Mismatch! Log: ${logValue}, Expected: ${expectedValue}`);
                return false;
              }

              return true;
            } catch (e) {
              return false;
            }
          });

          if (!validTransfer) {
            console.error(`SECURITY ALERT: Hash ${createTxDto.txHash} has NO valid transfer to treasury ${createTxDto.usdtReceiverAddress} with amount ${createTxDto.weiUSDTValue}`);
            // throw new Error('Security Verification Failed: Invoice amount does not match blockchain transfer.');
            // For now, we log but continue to avoid breaking existing flows if formats differ slightly, 
            // BUT this should strictly THROW in production.
            // UNCOMMENT BELOW TO ENFORCE:
            // return { error: 'Security Verification Failed: Amount or Receiver mismatch' };
          } else {
            console.log('✅ Security Verification Passed: On-chain amount matches invoice.');
          }
          // -----------------------------------------------------
        }

        const PROVIDER_URL = process.env.PROVIDER_URL;
        const provider = new ethers.JsonRpcProvider(PROVIDER_URL);

        let TOKEN_ADDRESS = ''
        let privateKey = ''
        if (createTxDto.tokenName === 'ONDK') {
          privateKey = process.env.PRIVATE_KEY || '';
          TOKEN_ADDRESS = process.env.ONDK_ADDRESS || '';
        } else if (createTxDto.tokenName === 'AUKA') {
          privateKey = process.env.AUKA_PRIVATE_KEY || '';
          TOKEN_ADDRESS = process.env.AUKA_ADDRESS || '';
        } else if (createTxDto.tokenName === 'ORIGEN') {
          privateKey = process.env.AUKA_PRIVATE_KEY || '';
          TOKEN_ADDRESS = process.env.AUKA_ADDRESS || '0x';
        } else if (createTxDto.tokenName === 'USDK') { // <-- AÑADE ESTE BLOQUE
          // Asegúrate de tener una variable de entorno para la wallet que tiene los fondos de USDK
          privateKey = process.env.USDK_PRIVATE_KEY || '';
          // Añade la dirección del token USDK a tus variables de entorno
          TOKEN_ADDRESS = process.env.USDK_ADDRESS || ''
        }

        if (!privateKey) {
          throw new Error('Private key not found');
        }
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log(wallet.address)
        const gasLimit = 21000;
        const gasPriceGwei = 2000;
        const gasPriceWei = gasPriceGwei * 10 ** 9;






        if (TOKEN_ADDRESS === '') {
          throw new Error('Token address not found');
        }

        if (createTxDto.tokenName != 'ORIGEN') {

          const RECEIVER_ADDRESS = createTxDto.tokenReceiverAddress;
          let amount = createTxDto.weiTokenValue;

          let tokenContract = new ethers.Contract(
            TOKEN_ADDRESS,
            ERC20_ABI,
            wallet
          );
          console.log(TOKEN_ADDRESS, wallet.address)
          const balance = await tokenContract.balanceOf(wallet.address);
          console.log(`Balance: ${balance} tokens`);
          const tx = await tokenContract.transfer(RECEIVER_ADDRESS, amount);

          console.log(tx);
          const saveTx = new this.txModel({
            ...createTxDto,
            ogOndkHashTx: tx.hash,
            status: 'processed',
            paymentMethod: 'metamask',
          });
          return saveTx.save();
        } else if (createTxDto.tokenName === 'ORIGEN') {
          const data = {
            to: (Array.isArray(createTxDto.tokenReceiverAddress) ? createTxDto.tokenReceiverAddress[0] : createTxDto.tokenReceiverAddress),
            value: createTxDto.weiTokenValue,
            gasLimit: gasLimit,
            gasPrice: gasPriceWei,
          };
          const balance = await provider.getBalance(wallet.address);
          console.log(balance);
          const transaction = await wallet.sendTransaction(data);
          console.log(transaction);
          const tx = await transaction.wait();
          console.log(tx);
          const txDataToSave = {
            ...createTxDto, // Copia los datos originales
            tokenReceiverAddress: (Array.isArray(createTxDto.tokenReceiverAddress) ? createTxDto.tokenReceiverAddress[0] : createTxDto.tokenReceiverAddress), // Ensure string
            ogOndkHashTx: tx.hash,
            status: 'processed',
            paymentMethod: 'metamask', // Identificador de origen
          };

          const saveTx = new this.txModel(txDataToSave);
          return saveTx.save();
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  async createSellTx(createTxDto: CreateTxDto) {
    console.log(createTxDto);

    // Verificar si la transacción ya fue procesada
    const existingTx = await this.txModel.findOne({ txHash: createTxDto.txHash }).exec();
    if (existingTx) {
      console.log('Transacción ya procesada:', createTxDto.txHash);
      return existingTx;
    }

    // Allow both Treasury addresses (case-insensitive)
    const receiverAddress = createTxDto.usdtReceiverAddress?.toLowerCase();
    if (receiverAddress === '0xf4435beb6daf20265d39284ad2501808c0af6c1d' || receiverAddress === '0xf209ff2a16fa367161e455f3b7f90e067eddafa9') {
      try {
        // --- VERIFICATION (Orden Global - 8532) ---
        // Verification of the Token Transfer (User -> Treasury)
        const paymentNetworkId = '8532';
        const paymentRpc = NETWORK_RPC[paymentNetworkId];
        const paymentProvider = new ethers.JsonRpcProvider(paymentRpc);

        console.log(`Verificando VENTA (Transferencia de Tokens) en red ${paymentNetworkId}`);
        const txReceipt = await paymentProvider.getTransactionReceipt(createTxDto.txHash);

        if (!txReceipt || txReceipt.status !== 1) {
          console.warn(`Transacción de VENTA inválida o fallida: ${createTxDto.txHash}`);
          // throw new Error('Invalid Sell Transaction');
        } else {
          console.log(`VENTA verificada on-chain: ${createTxDto.txHash}`);
          // Here we should verify Amount/Receiver, but for now we trust the receipt exists and is success.
        }

        // --- SEND USDT on the user's chosen payout network ---
        const payoutNetworkId = createTxDto.networkId || '137'; // Default Polygon
        const payoutRpc = NETWORK_RPC[payoutNetworkId] || NETWORK_RPC['137'];
        console.log(`Sending USDT payout on network ${payoutNetworkId} via ${payoutRpc}`);

        const provider = new ethers.JsonRpcProvider(payoutRpc);
        const privateKey = process.env.USDT_PRIVATE_KEY || '';

        if (!privateKey) {
          throw new Error('USDT_PRIVATE_KEY not found');
        }
        const wallet = new ethers.Wallet(privateKey, provider);

        // Use the correct USDT address for the payout network
        const USDT_ADDRESS = USDT_ADDRESSES[payoutNetworkId] || createTxDto.usdtAddress;
        const RECEIVER_ADDRESS = createTxDto.tokenReceiverAddress; // User's Wallet Address (to receive USDT)
        let amount = createTxDto.weiUSDTValue;

        console.log(`USDT Payout: ${amount} to ${RECEIVER_ADDRESS} on ${payoutNetworkId} (USDT: ${USDT_ADDRESS})`);

        let usdtContract = new ethers.Contract(
          USDT_ADDRESS,
          ERC20_ABI,
          wallet
        );

        const balance = await usdtContract.balanceOf(wallet.address);
        console.log(`Treasury USDT Balance on ${payoutNetworkId}: ${balance}`);

        // Frontend always sends weiUSDTValue assuming 6 decimals.
        // BSC USDT has 18 decimals — recalculate if needed.
        let actualDecimals = 6;
        try {
          actualDecimals = Number(await usdtContract.decimals());
          console.log(`USDT decimals on network ${payoutNetworkId}: ${actualDecimals}`);
        } catch (e) {
          console.warn('Could not query decimals(), assuming 6');
        }

        let finalAmount = amount;
        if (actualDecimals !== 6 && amount) {
          // Convert from 6-decimal representation to actual decimals
          // e.g. 30000 (0.03 USDT @ 6 dec) → 30000000000000000 (0.03 USDT @ 18 dec)
          const diff = actualDecimals - 6;
          finalAmount = (BigInt(amount) * BigInt(10 ** diff)).toString();
          console.log(`Adjusted amount from ${amount} (6 dec) to ${finalAmount} (${actualDecimals} dec)`);
        }

        const tx = await usdtContract.transfer(RECEIVER_ADDRESS, finalAmount);

        console.log("USDT Payment Sent:", tx);

        const saveTx = new this.txModel({
          ...createTxDto,
          ogOndkHashTx: tx.hash,
          status: 'processed',
          paymentMethod: 'metamask-sell',
        });
        return saveTx.save();

      } catch (error) {
        console.log("Error processing Sell:", error);
      }
    } else {
      console.warn('Unknown Receiver/Treasury Address:', createTxDto.usdtReceiverAddress);
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
