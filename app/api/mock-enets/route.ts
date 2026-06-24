// Simulated eNETS Gateway (prototype only)
// ─────────────────────────────────────────────────────────────────────────────
// Mimics the real eNETS hosted payment page. It receives the same signed form
// POST the real gateway would (txnReq + mac + keyId), renders a NETS-styled
// payment page, and on Approve/Decline redirects the browser back to the real
// B2S callback with a properly MAC-signed TxnRes — so the genuine callback
// (MAC verify → Supabase balance deduction → success redirect) runs unchanged.
//
// To switch to a real NETS gateway later, set NETS_GATEWAY_URL in .env.local and
// the settlements route will POST there instead of here.

import { NextRequest, NextResponse } from "next/server"
import { generateNetsMac } from "@/lib/nets-integration"

const NETS_SECRET_KEY = process.env.NETS_SECRET_KEY || ""

function buildTxnRes(opts: {
  netsMid: string
  merchantTxnRef: string
  amountCents: string
  paymentMode: string
  success: boolean
}): string {
  const msg = {
    netsMid: opts.netsMid,
    netsTxnRef: `MOCK-${opts.merchantTxnRef}`,
    netsTxnStatus: opts.success ? "0" : "1",
    netsTxnMsg: opts.success ? "Approval" : "Declined by issuer",
    netsAmountDeducted: opts.success ? opts.amountCents : "0",
    merchantTxnRef: opts.merchantTxnRef,
    paymentMode: opts.paymentMode || "DD",
  }
  return JSON.stringify({ ss: "1", msg })
}

function callbackUrl(b2sUrl: string, txnResStr: string): string {
  const mac = generateNetsMac(txnResStr, NETS_SECRET_KEY)
  return `${b2sUrl}?TxnRes=${encodeURIComponent(txnResStr)}&mac=${encodeURIComponent(mac)}`
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const txnReqRaw = String(form.get("txnReq") ?? "")

    if (!txnReqRaw) {
      return new NextResponse("Missing txnReq", { status: 400 })
    }

    const parsed = JSON.parse(txnReqRaw)
    const msg = parsed.msg ?? {}
    const netsMid: string = msg.netsMid ?? ""
    const merchantTxnRef: string = msg.merchantTxnRef ?? ""
    const amountCents: string = String(msg.txnAmount ?? "0")
    const paymentMode: string = msg.paymentMode ?? ""
    const b2sUrl: string = msg.b2sTxnEndURL ?? ""

    if (!b2sUrl) {
      return new NextResponse("Missing b2sTxnEndURL in txnReq", { status: 400 })
    }

    const amountSgd = (Number(amountCents) / 100).toLocaleString("en-SG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    const approveUrl = callbackUrl(
      b2sUrl,
      buildTxnRes({ netsMid, merchantTxnRef, amountCents, paymentMode, success: true })
    )
    const declineUrl = callbackUrl(
      b2sUrl,
      buildTxnRes({ netsMid, merchantTxnRef, amountCents, paymentMode, success: false })
    )

    const methodLabel =
      paymentMode === "CC" ? "Credit / Debit Card" : paymentMode === "QR" ? "PayNow QR" : "eNETS Debit"

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>eNETS Secure Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #f2f4f7; color: #122b4a; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #fff; width: 100%; max-width: 380px; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 40px rgba(18,43,74,.15); }
    .bar { background: #122b4a; color: #fff; padding: 16px 20px; display: flex; align-items: center; gap: 10px; }
    .bar .logo { background: #e8192c; color: #fff; font-weight: 800; font-size: 13px; border-radius: 6px; padding: 4px 8px; letter-spacing: .5px; }
    .bar .sec { margin-left: auto; font-size: 11px; opacity: .7; }
    .body { padding: 22px 20px 8px; }
    .label { font-size: 12px; color: #6b7a90; }
    .amt { font-size: 34px; font-weight: 800; margin: 4px 0 2px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; padding: 10px 0; border-top: 1px solid #eef1f5; }
    .row:first-of-type { border-top: none; }
    .row .k { color: #6b7a90; }
    .row .v { font-weight: 600; }
    .actions { padding: 8px 20px 22px; }
    .btn { display: block; width: 100%; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; }
    .pay { background: #e8192c; color: #fff; }
    .cancel { background: transparent; color: #6b7a90; margin-top: 6px; }
    .note { text-align: center; font-size: 11px; color: #9aa7b8; padding: 0 20px 18px; }
    .sim { background: #fff8e1; color: #9a6b00; font-size: 11px; text-align: center; padding: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="sim">SIMULATED GATEWAY · prototype demo</div>
    <div class="bar">
      <span class="logo">NETS</span>
      <span style="font-weight:600;font-size:14px;">Secure Payment</span>
      <span class="sec">🔒 eNETS</span>
    </div>
    <div class="body">
      <div class="label">Amount payable</div>
      <div class="amt">S$${amountSgd}</div>
      <div class="row"><span class="k">Payment method</span><span class="v">${methodLabel}</span></div>
      <div class="row"><span class="k">Merchant</span><span class="v">NETS Circle</span></div>
      <div class="row"><span class="k">Reference</span><span class="v">${merchantTxnRef.slice(0, 22)}</span></div>
    </div>
    <div class="actions">
      <!-- Anchors, not GET forms: a GET form would strip the query string from
           the action URL and the callback would receive no TxnRes/mac. -->
      <a class="btn pay" href="${approveUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Pay S$${amountSgd}</a>
      <a class="btn cancel" href="${declineUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Cancel / simulate decline</a>
    </div>
    <div class="note">You're on a simulated eNETS page. Approving signs a valid TxnRes and returns to the merchant callback exactly like the real gateway.</div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  } catch (error) {
    return new NextResponse(
      `Mock eNETS error: ${error instanceof Error ? error.message : "unknown"}`,
      { status: 500 }
    )
  }
}
