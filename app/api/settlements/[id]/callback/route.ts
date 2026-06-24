// NETS Payment Callback Handler
// Handles responses from NETS Gateway for both B2S and S2S flows

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import {
  parseNetsTransactionResponse,
  isNetsTransactionSuccessful,
  verifyNetsMac,
} from "@/lib/nets-integration"

const NETS_SECRET_KEY = process.env.NETS_SECRET_KEY || ""

async function deductPayerBalance(settlementId: string) {
  if (!supabase) return

  const { data: settlement } = await supabase
    .from("settlements")
    .select("from_member_id, amount, status, circle_id")
    .eq("id", settlementId)
    .single()

  // Only deduct if the settlement was previously pending (avoid double-deduction if both S2S and B2S fire)
  if (!settlement || settlement.status === "completed") return

  const { data: payer } = await supabase
    .from("users")
    .select("balance")
    .eq("id", settlement.from_member_id)
    .single()

  if (payer && typeof payer.balance === "number") {
    await supabase
      .from("users")
      .update({ balance: Math.max(0, payer.balance - settlement.amount) })
      .eq("id", settlement.from_member_id)

    console.log(`[callback] Deducted $${settlement.amount} from ${settlement.from_member_id} — new balance: ${Math.max(0, payer.balance - settlement.amount)}`)
  }

  // Mark the circle settled so re-entering it after the redirect shows the
  // recap instead of prompting for payment again, and record the payment in the
  // user's transaction history. Guarded by the pending-check above, so this runs
  // at most once even if both B2S and S2S fire.
  if (settlement.circle_id) {
    const { data: circle } = await supabase
      .from("circles")
      .select("name")
      .eq("id", settlement.circle_id)
      .single()

    await supabase.from("circles").update({ status: "settled" }).eq("id", settlement.circle_id)
    console.log(`[callback] Marked circle ${settlement.circle_id} as settled`)

    // Deterministic id → safe if the callback ever fires twice (upsert no-op).
    await supabase.from("transactions").upsert({
      id: `txn-settle-${settlementId}`,
      merchant: `Circle: ${circle?.name ?? "Settlement"}`,
      category: "Settlement",
      amount: settlement.amount,
      type: "out",
      date: "Just now",
      icon: "NC",
      color: "var(--nets-red)",
    })
  }
}

/**
 * POST /api/settlements/[id]/callback/s2s
 * Server-to-Server callback from NETS Gateway
 * Called directly by NETS servers (most reliable — but can't reach localhost in dev)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: settlementId } = await params
    const bodyText = await request.text()
    const macFromHeader = request.headers.get("hmac")

    if (!macFromHeader) {
      return NextResponse.json({ error: "Missing MAC in header" }, { status: 400 })
    }

    if (!NETS_SECRET_KEY) {
      console.error("NETS_SECRET_KEY not configured")
      return new NextResponse(null, { status: 500 })
    }

    if (!verifyNetsMac(bodyText, macFromHeader, NETS_SECRET_KEY)) {
      console.error("MAC verification failed for settlement:", settlementId)
      return new NextResponse(null, { status: 401 })
    }

    const txnRes = parseNetsTransactionResponse(bodyText)
    if (!txnRes) {
      console.error("Invalid transaction response for settlement:", settlementId)
      return new NextResponse(null, { status: 400 })
    }

    const isSuccess = isNetsTransactionSuccessful(txnRes)
    const status = isSuccess ? "completed" : "failed"

    if (supabase) {
      if (isSuccess) await deductPayerBalance(settlementId)

      await supabase
        .from("settlements")
        .update({ status, nets_transaction_id: txnRes.msg.netsTxnRef, completed_at: new Date().toISOString() })
        .eq("id", settlementId)

      await supabase.from("payment_logs").insert({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        settlement_id: settlementId,
        status,
        nets_response: txnRes.msg,
        error_message: isSuccess ? null : txnRes.msg.netsTxnMsg,
      })
    } else {
      console.warn("[s2s] Supabase not configured — skipping DB update for settlement:", settlementId)
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error("S2S callback error:", error)
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * GET /api/settlements/[id]/callback/b2s
 * Browser-to-Server callback from NETS Gateway (via browser redirect)
 * This is the one that fires in local dev — NETS redirects the user's browser here
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: settlementId } = await params
    const searchParams = request.nextUrl.searchParams

    const mac = searchParams.get("mac")
    const txnRes = searchParams.get("TxnRes")

    if (!mac || !txnRes) {
      return NextResponse.redirect(new URL("/?payment=error&reason=missing_params", request.url))
    }

    const decodedTxnRes = decodeURIComponent(txnRes)

    if (!NETS_SECRET_KEY) {
      console.error("NETS_SECRET_KEY not configured")
      return NextResponse.redirect(new URL("/?payment=error&reason=config", request.url))
    }

    if (!verifyNetsMac(decodedTxnRes, mac, NETS_SECRET_KEY)) {
      console.error("MAC verification failed for B2S callback:", settlementId)
      return NextResponse.redirect(new URL("/?payment=error&reason=mac", request.url))
    }

    const txnResObj = parseNetsTransactionResponse(decodedTxnRes)
    if (!txnResObj) {
      console.error("Invalid transaction response for B2S:", settlementId)
      return NextResponse.redirect(new URL("/?payment=error&reason=parse", request.url))
    }

    const isSuccess = isNetsTransactionSuccessful(txnResObj)
    const status = isSuccess ? "completed" : "failed"

    if (supabase) {
      // Deduct balance first (checks for double-deduction internally)
      if (isSuccess) await deductPayerBalance(settlementId)

      await supabase
        .from("settlements")
        .update({ status, nets_transaction_id: txnResObj.msg.netsTxnRef, completed_at: new Date().toISOString() })
        .eq("id", settlementId)

      await supabase.from("payment_logs").insert({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        settlement_id: settlementId,
        status,
        nets_response: txnResObj.msg,
        error_message: isSuccess ? null : txnResObj.msg.netsTxnMsg,
      })
    } else {
      console.warn("[b2s] Supabase not configured — skipping DB update for settlement:", settlementId)
    }

    // Redirect to home — full page load so React re-fetches the updated balance from Supabase
    const redirectUrl = isSuccess
      ? "/?payment=success&settlement=" + settlementId
      : "/?payment=failed&settlement=" + settlementId

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error("B2S callback error:", error)
    return NextResponse.redirect(new URL("/?payment=error&reason=exception", request.url))
  }
}
