"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { monadMainnet, monadTestnet, selectedChain } from "@/lib/web3/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const activeChain = selectedChain();
const chains =
  activeChain.id === monadTestnet.id
    ? ([monadTestnet, monadMainnet] as const)
    : ([monadMainnet, monadTestnet] as const);

export const wagmiConfig = getDefaultConfig({
  appName: "Monograph",
  projectId: projectId || "missing-walletconnect-project-id",
  chains,
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]),
    [monadMainnet.id]: http(monadMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
