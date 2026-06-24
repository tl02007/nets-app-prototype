import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import {
  createNetsTransactionRequest,
  generateNetsMac,
} from "@/lib/nets-integration"

const NETS_MERCHANT_ID = process.env.NETS_MERCHANT_ID || ""
const NETS_SECRET_KEY = process.env.NETS_SECRET_KEY || ""

if (!NETS_MERCHANT_ID || !NETS_SECRET_KEY) {
  console.warn("[settlements] NETS_MERCHANT_ID or NETS_SECRET_KEY not set — payment will fail")
} else {
  console.log(`[settlements] NETS credentials loaded: MID=${NETS_MERCHANT_ID.slice(0, 8)}... KEY=${NETS_SECRET_KEY.slice(0, 8)}...`)
}

/**
 * POST /api/settlements
 * Calculate and create settlements for a circle, prepare for NETS payment
 */
export async function POST(request: NextRequest) {
  try {
    const { circleId, settlementId, amount, paymentMode, settlements: incomingSettlements } = await request.json()

    if (!circleId && !settlementId) {
      return NextResponse.json(
        { error: "circleId or settlementId is required" },
        { status: 400 }
      )
    }

    // If we're preparing a NETS payment for an existing settlement
    if (settlementId) {
      return await prepareNetsPayment(
        settlementId,
        typeof amount === "number" ? amount : undefined,
        typeof paymentMode === "string" ? paymentMode : ""
      )
    }

    // Otherwise, create new settlements for the circle (using pre-computed data from frontend)
    return await createCircleSettlements(circleId, incomingSettlements)
  } catch (error) {
    console.error("Settlement error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

type SettlementInput = { fromId: string; toId: string; amount: number }

/**
 * Create settlements for a circle.
 * Accepts pre-computed settlements from the frontend to avoid requiring
 * a working Supabase connection just to calculate who owes whom.
 */
async function createCircleSettlements(
  circleId: string,
  incomingSettlements?: SettlementInput[]
): Promise<NextResponse> {
  let settlements: SettlementInput[] = []

  if (incomingSettlements && incomingSettlements.length > 0) {
    // Use pre-computed settlements passed by the frontend
    settlements = incomingSettlements
  } else if (supabase) {
    // Fall back to computing from Supabase data
    const { data: members } = await supabase
      .from("circle_members")
      .select("*")
      .eq("circle_id", circleId)

    if (!members || members.length === 0) {
      return NextResponse.json({ error: "No members in circle" }, { status: 400 })
    }

    const { data: expenses } = await supabase
      .from("circle_expenses")
      .select("*")
      .eq("circle_id", circleId)

    const total = (expenses || []).reduce((sum: number, e: any) => sum + e.amount, 0)
    const perHead = total / members.length
    settlements = computeSettlements(members, perHead)
  } else {
    return NextResponse.json({ error: "No settlement data provided" }, { status: 400 })
  }

  // Assign IDs and persist to Supabase (best-effort — failures are non-fatal)
  const settlementRecords: Array<{ id: string; fromMemberId: string; toMemberId: string; amount: number }> = []
  for (const s of settlements) {
    const id = `settlement-${Date.now()}-${Math.random().toString(36).substring(7)}`

    if (supabase) {
      await supabase.from("settlements").insert({
        id,
        circle_id: circleId,
        from_member_id: s.fromId,
        to_member_id: s.toId,
        amount: s.amount,
        status: "pending",
      })
    }

    settlementRecords.push({ id, fromMemberId: s.fromId, toMemberId: s.toId, amount: s.amount })
  }

  return NextResponse.json({
    success: true,
    circleId,
    settlements: settlementRecords,
    count: settlementRecords.length,
  })
}

/**
 * Prepare a NETS transaction request for payment
 */
async function prepareNetsPayment(settlementId: string, fallbackAmount?: number, paymentMode = ""): Promise<NextResponse> {
  if (!NETS_MERCHANT_ID || !NETS_SECRET_KEY) {
    return NextResponse.json(
      { error: "NETS credentials not configured" },
      { status: 500 }
    )
  }

  let txnAmount = fallbackAmount

  if (supabase) {
    const { data: settlement } = await supabase
      .from("settlements")
      .select("*")
      .eq("id", settlementId)
      .single()

    if (settlement) {
      if (settlement.status !== "pending") {
        return NextResponse.json(
          { error: "Settlement is not pending", status: settlement.status },
          { status: 400 }
        )
      }
      txnAmount = settlement.amount
    }
  }

  if (txnAmount === undefined) {
    return NextResponse.json(
      { error: "Settlement not found" },
      { status: 404 }
    )
  }

  // Create NETS transaction request
  const callbackBase = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/settlements/${settlementId}`

  // Both callbacks point to the same route handler. NETS calls B2S as a browser
  // GET redirect and S2S as a server POST, and the handler differentiates by HTTP
  // method (GET = B2S, POST = S2S). There is no /b2s or /s2s subroute — adding one
  // would 404 the callback and the payment would never reconcile.
  const txnReq = createNetsTransactionRequest({
    netsMid: NETS_MERCHANT_ID,
    merchantTxnRef: settlementId,
    txnAmount,
    b2sTxnEndURL: `${callbackBase}/callback`,
    s2sTxnEndURL: `${callbackBase}/callback`,
    paymentMode,
  })

  // Generate MAC
  const mac = generateNetsMac(txnReq, NETS_SECRET_KEY)

  // Extract keyId from NETS merchant ID (or use default)
  const keyId = NETS_MERCHANT_ID

  // Gateway URL: defaults to the local simulated eNETS gateway so the full
  // redirect → pay → MAC-signed callback → balance deduction flow works
  // reliably for the prototype. Set NETS_GATEWAY_URL in .env.local to point at
  // a real eNETS endpoint instead.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const gatewayUrl = process.env.NETS_GATEWAY_URL || `${appUrl}/api/mock-enets`

  return NextResponse.json({
    success: true,
    settlementId,
    paymentInitiation: {
      txnReq,
      mac,
      keyId,
      gatewayUrl,
      settlement: { id: settlementId, amount: txnAmount },
    },
  })
}

function computeSettlements(
  members: any[],
  perHead: number
): Array<{ fromId: string; toId: string; amount: number }> {
  const balances = members.map((m) => ({
    id: m.member_id,
    balance: m.paid - perHead,
  }))

  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance)
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance)

  const settlements: Array<{ fromId: string; toId: string; amount: number }> = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const owe = Math.min(-debtors[i].balance, creditors[j].balance)
    settlements.push({
      fromId: debtors[i].id,
      toId: creditors[j].id,
      amount: owe,
    })
    debtors[i].balance += owe
    creditors[j].balance -= owe
    if (Math.abs(debtors[i].balance) < 0.01) i++
    if (Math.abs(creditors[j].balance) < 0.01) j++
  }

  return settlements
}
