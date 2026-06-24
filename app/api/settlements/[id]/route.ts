import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * GET /api/settlements/[id]/status
 * Check settlement payment status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settlementId = params.id

    const { data: settlement } = await supabase
      .from("settlements")
      .select("*")
      .eq("id", settlementId)
      .single()

    if (!settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      settlementId,
      status: settlement.status,
      amount: settlement.amount,
      netsTransactionId: settlement.nets_transaction_id,
      completedAt: settlement.completed_at,
      createdAt: settlement.created_at,
    })
  } catch (error) {
    console.error("Settlement status check error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

