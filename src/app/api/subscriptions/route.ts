import { after, NextResponse } from "next/server";
import { createPublicClient, http, parseEther } from "viem";
import { getUser } from "@/lib/auth";
import { escapeHtml, getFromAddress, getResend } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { selectedChain } from "@/lib/web3/chains";

type SubscriptionPayload = {
  creator_id?: string;
  tx_hash?: `0x${string}`;
  paid_amount_mon?: string;
};

function sameAddress(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before subscribing." }, { status: 401 });
  }

  const payload = (await request.json()) as SubscriptionPayload;
  const { creator_id: creatorId, tx_hash: txHash, paid_amount_mon: paidAmountMon } = payload;

  if (!creatorId || !txHash || !paidAmountMon) {
    return NextResponse.json({ error: "Missing subscription fields." }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: creator }, { data: reader }, { data: existing }, { data: price }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("wallet_address,display_name")
        .eq("id", creatorId)
        .single(),
      supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .single(),
      supabase
        .from("subscriptions")
        .select("id")
        .eq("tx_hash", txHash)
        .maybeSingle(),
      supabase
        .from("creator_pass_prices")
        .select("price_mon")
        .eq("creator_id", creatorId)
        .maybeSingle(),
    ]);

  if (existing) {
    return NextResponse.json({ error: "This transaction was already used." }, { status: 409 });
  }

  if (!creator?.wallet_address || !reader?.wallet_address) {
    return NextResponse.json(
      { error: "Creator and reader wallet addresses must both be configured." },
      { status: 400 },
    );
  }

  const chain = selectedChain();
  const publicClient = createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });

  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: txHash }),
    publicClient.getTransactionReceipt({ hash: txHash }),
  ]);

  if (receipt.status !== "success") {
    return NextResponse.json({ error: "Transaction has not succeeded." }, { status: 400 });
  }

  if (!sameAddress(tx.to, creator.wallet_address)) {
    return NextResponse.json({ error: "Transaction recipient does not match creator wallet." }, { status: 400 });
  }

  if (!sameAddress(tx.from, reader.wallet_address)) {
    return NextResponse.json({ error: "Transaction sender does not match your profile wallet." }, { status: 400 });
  }

  const requiredPriceMon = String(price?.price_mon ?? paidAmountMon);

  if (tx.value < parseEther(requiredPriceMon)) {
    return NextResponse.json({ error: "Transaction amount is below the requested MON price." }, { status: 400 });
  }

  const { error } = await supabase.from("subscriptions").insert({
    subscriber_id: user.id,
    creator_id: creatorId,
    tx_hash: txHash,
    paid_amount_mon: requiredPriceMon,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  after(async () => {
    const resend = getResend();
    if (!resend || !user.email) {
      return;
    }

    const creatorName = escapeHtml(creator.display_name ?? "this creator");
    const amount = escapeHtml(requiredPriceMon);
    const safeHash = escapeHtml(txHash);

    await resend.emails.send({
      from: getFromAddress(),
      to: user.email,
      subject: `Subscription active: ${creator.display_name ?? "Creator"}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2530">
          <h1>Your subscription is active</h1>
          <p>You subscribed to <strong>${creatorName}</strong>.</p>
          <p>Amount: <strong>${amount} MON</strong></p>
          <p>Transaction: <code>${safeHash}</code></p>
        </div>
      `,
    });
  });

  return NextResponse.json({ ok: true });
}
