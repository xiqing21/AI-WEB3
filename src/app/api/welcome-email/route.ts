import { after, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { escapeHtml, getFromAddress, getResend } from "@/lib/email";

export async function POST() {
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  after(async () => {
    const resend = getResend();

    if (!resend) {
      return;
    }

    const siteUrl = process.env.SITE_URL ?? "https://ai-web3-seven.vercel.app";

    await resend.emails.send({
      from: getFromAddress(),
      to: user.email!,
      subject: "Welcome to Monograph",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2530">
          <h1>Welcome to Monograph</h1>
          <p>Your paid newsletter account is ready.</p>
          <p><a href="${escapeHtml(siteUrl)}/write">Write your first post</a></p>
        </div>
      `,
    });
  });

  return NextResponse.json({ ok: true });
}
