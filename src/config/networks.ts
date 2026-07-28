import { ethers } from 'ethers';

/**
 * Official RPC URLs for different networks — verified alive (Jul 2026).
 * polygon-rpc.com (401) and the free Alchemy key (429 rate-limited) were
 * removed: a dead RPC in the list used to stall FallbackProvider startup.
 */
export const NETWORK_RPCS: Record<string, string[]> = {
  '137': [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.drpc.org',
    'https://1rpc.io/matic',
  ],
  '8532': [
    'https://www.ordenglobal-rpc.com',
  ],
  '56': [
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed.bnbchain.org',
  ],
  '1': [
    'https://ethereum-rpc.publicnode.com',
    'https://eth.drpc.org',
  ],
};

const CHAIN_IDS: Record<string, number> = {
  '137': 137,
  '8532': 8532,
  '56': 56,
  '1': 1,
};

// One provider per network for the app's lifetime. Building a fresh provider
// on every request leaked the old ones, which kept retrying network detection
// forever ("failed to detect network; retry in 1s" spam in the Heroku logs).
const providerCache: Record<string, ethers.FallbackProvider | ethers.JsonRpcProvider> = {};

/**
 * Returns a cached provider for the given network.
 * staticNetwork pins the chain id so ethers never runs eth_chainId detection —
 * a dead RPC can no longer stall startup past Heroku's 30s router timeout (H12).
 */
export function getProvider(networkId: string): ethers.FallbackProvider | ethers.JsonRpcProvider {
  const cached = providerCache[networkId];
  if (cached) {
    return cached;
  }
  const urls = NETWORK_RPCS[networkId] ?? NETWORK_RPCS['137'];
  const chainId = CHAIN_IDS[networkId] ?? 137;
  const network = ethers.Network.from(chainId);
  const make = (url: string) => new ethers.JsonRpcProvider(url, network, { staticNetwork: network });

  let provider: ethers.FallbackProvider | ethers.JsonRpcProvider;
  if (urls.length === 1) {
    provider = make(urls[0]);
  } else {
    provider = new ethers.FallbackProvider(
      urls.map((url: string, i: number) => ({
        provider: make(url),
        priority: i + 1,
        weight: 1,
        stallTimeout: 2000,
      })),
      network,
      { quorum: 1 },
    );
  }
  providerCache[networkId] = provider;
  return provider;
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
