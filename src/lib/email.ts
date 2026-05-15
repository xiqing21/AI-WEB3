import { Resend } from "resend";

let resend: Resend | null = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    return null;
  }

  if (!resend) {
    resend = new Resend(key);
  }

  return resend;
}

export function getFromAddress() {
  return process.env.RESEND_FROM ?? "Monograph <onboarding@resend.dev>";
}

export function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
