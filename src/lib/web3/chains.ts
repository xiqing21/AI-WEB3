import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL ??
          "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Monadscan Testnet",
      url: "https://testnet.monadscan.com",
    },
  },
});

export const monadMainnet = defineChain({
  id: 143,
  name: "Monad Mainnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_MAINNET_RPC_URL ??
          "https://rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://monadscan.com" },
  },
});

export function selectedChain() {
  return process.env.NEXT_PUBLIC_CHAIN === "mainnet"
    ? monadMainnet
    : monadTestnet;
}

export function selectedExplorerTxUrl(hash: string) {
  return `${selectedChain().blockExplorers.default.url}/tx/${hash}`;
}
