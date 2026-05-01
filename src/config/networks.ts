import { ethers } from 'ethers';

/**
 * Official RPC URLs for different networks.
 * These are used across the application for transaction verification and token transfers.
 */
export const NETWORK_RPCS: Record<string, string[]> = {
  '137': [
    'https://polygon-mainnet.g.alchemy.com/v2/q9YfSqOd5vXRKXfTROwrVmV4g7K5dazb',
  ],
  '8532': [
    'https://www.ordenglobal-rpc.com',
  ],
  '56': [
    'https://bnb-mainnet.g.alchemy.com/v2/q9YfSqOd5vXRKXfTROwrVmV4g7K5dazb',
  ],
  '1': [
    'https://eth-mainnet.g.alchemy.com/v2/q9YfSqOd5vXRKXfTROwrVmV4g7K5dazb',
  ],
};

/**
 * Returns an ethers FallbackProvider (quorum=1) for the given network.
 * Automatically tries next RPC if one fails — no single point of failure.
 */
export function getProvider(networkId: string): ethers.FallbackProvider | ethers.JsonRpcProvider {
  const urls = NETWORK_RPCS[networkId] ?? NETWORK_RPCS['137'];
  if (urls.length === 1) {
    return new ethers.JsonRpcProvider(urls[0]);
  }
  const providers = urls.map((url: string, i: number) =>
    ({ provider: new ethers.JsonRpcProvider(url), priority: i + 1, weight: 1, stallTimeout: 2000 })
  );
  return new ethers.FallbackProvider(providers, undefined, { quorum: 1 });
}

/**
 * Hardcoded USDT contract addresses for supported networks.
 * Used for payment verification and payout delivery.
 */
export const USDT_ADDRESSES: Record<string, string> = {
  '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  '56': '0x55d398326f99059fF775485246999027B3197955',
  '1': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
};
