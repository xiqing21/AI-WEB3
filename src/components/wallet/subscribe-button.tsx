"use client";

import { useState } from "react";
import { parseEther, type Address } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { selectedChain, selectedExplorerTxUrl } from "@/lib/web3/chains";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

export function SubscribeButton({
  creatorId,
  creatorWallet,
  priceMon,
  locale,
}: {
  creatorId: string;
  creatorWallet: string | null;
  priceMon: string;
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setError(null);
    setStatus(null);
    setTxHash(null);

    if (!creatorWallet) {
      setError("This creator has not configured a wallet address yet.");
      return;
    }

    if (!walletClient || !publicClient) {
      setError("Connect your wallet before subscribing.");
      return;
    }

    setIsPending(true);

    try {
      setStatus("Waiting for wallet confirmation...");
      const hash = await walletClient.sendTransaction({
        account: address as Address,
        chain: selectedChain(),
        to: creatorWallet as Address,
        value: parseEther(priceMon),
      });

      setTxHash(hash);
      setStatus("Transaction sent. Waiting for Monad confirmation...");

      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("Confirmed. Verifying subscription server-side...");
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creator_id: creatorId,
          tx_hash: hash,
          paid_amount_mon: priceMon,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Subscription verification failed.");
      }

      setStatus("Subscription active. Paid posts are unlocked.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Subscription failed. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  if (!isConnected) {
    return <ConnectWallet />;
  }

  return (
    <div className="subscribe-box">
      <div className="payment-summary">
        <div>
          <span>{t.paymentSummary}</span>
          <strong>{priceMon} MON</strong>
        </div>
        <p>
          {t.recipientWallet}: <code>{creatorWallet}</code>
        </p>
        <p>{t.networkFeeExtra}</p>
        <p>{t.walletPromptNote}</p>
      </div>
      <button
        className="clay-button clay-button-primary"
        disabled={isPending}
        onClick={subscribe}
        type="button"
      >
        {isPending ? t.subscribing : `${t.subscribeFor} ${priceMon} MON`}
      </button>
      {status ? <p className="muted text-sm">{status}</p> : null}
      {txHash ? (
        <a href={selectedExplorerTxUrl(txHash)} rel="noreferrer" target="_blank">
          {t.viewTransaction}
        </a>
      ) : null}
      {error ? <p className="error-box">{error}</p> : null}
    </div>
  );
}
