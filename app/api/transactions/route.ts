import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { matchTransactionToCircle, categorizeTransaction } from "@/lib/expense-intelligence"

/**
 * POST /api/transactions/analyze
 * Analyze user transactions for potential circle expenses
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    // Get all transactions for the user (created in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        userId,
        suggestions: [],
      })
    }

    // Analyze each transaction
    const suggestions: any[] = []

    for (const transaction of transactions) {
      if (transaction.type !== "out") continue // Only outgoing transactions

      const matches = await matchTransactionToCircle(
        {
          id: transaction.id,
          merchant: transaction.merchant,
          amount: transaction.amount,
          date: transaction.date,
        },
        userId
      )

      if (matches.length > 0) {
        suggestions.push({
          transactionId: transaction.id,
          merchant: transaction.merchant,
          amount: transaction.amount,
          date: transaction.date,
          matches: matches.slice(0, 2), // Top 2 matches
        })
      }
    }

    return NextResponse.json({
      userId,
      suggestionsCount: suggestions.length,
      suggestions: suggestions.slice(0, 10), // Top 10 suggestions
    })
  } catch (error) {
    console.error("Transaction analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/transactions/add-to-circle
 * Add a transaction as an expense to a circle
 */
export async function PUT(request: NextRequest) {
  try {
    const { transactionId, circleId, paidById, category } =
      await request.json()

    if (!transactionId || !circleId || !paidById) {
      return NextResponse.json(
        { error: "transactionId, circleId, and paidById are required" },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    // Get transaction details
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single()

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Determine category
    const expenseCategory =
      category || categorizeTransaction(transaction.merchant)

    // Create circle expense
    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(7)}`

    await supabase.from("circle_expenses").insert({
      id: expenseId,
      circle_id: circleId,
      title: transaction.merchant,
      merchant: transaction.merchant,
      category: expenseCategory,
      amount: transaction.amount,
      paid_by_id: paidById,
      time: new Date(transaction.created_at).toLocaleTimeString("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })

    return NextResponse.json({
      success: true,
      expenseId,
      circleId,
      amount: transaction.amount,
    })
  } catch (error) {
    console.error("Add transaction to circle error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
