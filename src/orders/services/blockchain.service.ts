import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
];

export interface TransferResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

@Injectable()
export class BlockchainService {
    private readonly logger = new Logger(BlockchainService.name);
    private readonly provider: ethers.JsonRpcProvider;

    constructor(private readonly configService: ConfigService) {
        const providerUrl = this.configService.get<string>('PROVIDER_URL');
        this.provider = new ethers.JsonRpcProvider(providerUrl);
    }

    /**
     * Transfer tokens to a recipient address
     */
    async transferToken(
        to: string,
        amount: string,
        tokenSymbol: string,
    ): Promise<TransferResult> {
        try {
            const { privateKey, tokenAddress, isNative } = this.getTokenConfig(tokenSymbol);

            if (!privateKey) {
                throw new Error(`Private key not configured for ${tokenSymbol}`);
            }

            const wallet = new ethers.Wallet(privateKey, this.provider);
            this.logger.log(`Transferring ${amount} ${tokenSymbol} to ${to} from ${wallet.address}`);

            if (isNative) {
                // Token nativo (como ORIGEN que usa sendTransaction)
                return await this.transferNativeToken(wallet, to, amount);
            } else {
                // Token ERC20
                return await this.transferERC20Token(wallet, to, amount, tokenAddress);
            }
        } catch (error: any) {
            this.logger.error(`Transfer failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    private async transferNativeToken(
        wallet: ethers.Wallet,
        to: string,
        amount: string,
    ): Promise<TransferResult> {
        const gasLimit = 21000;
        const nonce = await wallet.getNonce();
        const gasPriceGwei = 2000;
        const gasPriceWei = BigInt(gasPriceGwei) * BigInt(10 ** 9);

        // Convertir amount a wei (asumiendo 18 decimales)
        const amountWei = ethers.parseEther(amount);

        const tx = await wallet.sendTransaction({
            to,
            value: amountWei,
            gasLimit,
            nonce,
            gasPrice: gasPriceWei,
        });

        this.logger.log(`Native transfer tx submitted: ${tx.hash}`);
        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
            throw new Error('Transaction failed');
        }

        this.logger.log(`Native transfer confirmed: ${tx.hash}`);
        return {
            success: true,
            txHash: tx.hash,
        };
    }

    private async transferERC20Token(
        wallet: ethers.Wallet,
        to: string,
        amount: string,
        tokenAddress: string,
    ): Promise<TransferResult> {
        if (!tokenAddress) {
            throw new Error('Token address not configured');
        }

        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

        // Get decimals to convert amount correctly
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.parseUnits(amount, decimals);

        // Check balance
        const balance = await tokenContract.balanceOf(wallet.address);
        this.logger.log(`Wallet balance: ${ethers.formatUnits(balance, decimals)} tokens`);

        if (balance < amountWei) {
            throw new Error(`Insufficient balance: have ${ethers.formatUnits(balance, decimals)}, need ${amount}`);
        }

        const tx = await tokenContract.transfer(to, amountWei);
        this.logger.log(`ERC20 transfer tx submitted: ${tx.hash}`);

        const receipt = await tx.wait();
        if (!receipt || receipt.status === 0) {
            throw new Error('Transaction failed');
        }

        this.logger.log(`ERC20 transfer confirmed: ${tx.hash}`);
        return {
            success: true,
            txHash: tx.hash,
        };
    }

    private getTokenConfig(tokenSymbol: string): {
        privateKey: string;
        tokenAddress: string;
        isNative: boolean;
    } {
        const symbol = tokenSymbol.toUpperCase();

        switch (symbol) {
            case 'ORIGEN':
                return {
                    privateKey: this.configService.get<string>('ORIGEN_PRIVATE_KEY') ||
                        this.configService.get<string>('AUKA_PRIVATE_KEY') || '',
                    tokenAddress: this.configService.get<string>('ORIGEN_CONTRACT_ADDRESS') || '',
                    isNative: true, // ORIGEN se transfiere como token nativo
                };
            case 'ONDK':
                return {
                    privateKey: this.configService.get<string>('PRIVATE_KEY') || '',
                    tokenAddress: this.configService.get<string>('ONDK_ADDRESS') || '',
                    isNative: false,
                };
            case 'AUKA':
                return {
                    privateKey: this.configService.get<string>('AUKA_PRIVATE_KEY') || '',
                    tokenAddress: this.configService.get<string>('AUKA_ADDRESS') || '',
                    isNative: false,
                };
            case 'USDK':
                return {
                    privateKey: this.configService.get<string>('USDK_PRIVATE_KEY') || '',
                    tokenAddress: this.configService.get<string>('USDK_ADDRESS') || '',
                    isNative: false,
                };
            default:
                throw new Error(`Unknown token symbol: ${tokenSymbol}`);
        }
    }

    /**
     * Get the wallet address for a given token
     */
    async getWalletAddress(tokenSymbol: string): Promise<string> {
        const { privateKey } = this.getTokenConfig(tokenSymbol);
        if (!privateKey) {
            throw new Error(`Private key not configured for ${tokenSymbol}`);
        }
        const wallet = new ethers.Wallet(privateKey);
        return wallet.address;
    }

    /**
     * Check if address is valid
     */
    isValidAddress(address: string): boolean {
        return ethers.isAddress(address);
    }
}
