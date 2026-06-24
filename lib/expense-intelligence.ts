// Expense Intelligence & Auto-detection
// Automatically detect circle expenses from user transactions

import { supabase } from "./supabase"

export type TransactionMatch = {
  transactionId: string
  circleId: string
  confidence: "high" | "medium" | "low"
  suggestedMember?: string
  category: string
}

const merchantCategoryMap: Record<string, string> = {
  restaurant: "Food & Drink",
  cafe: "Food & Drink",
  hotel: "Accommodation",
  airline: "Transport",
  taxi: "Transport",
  bus: "Transport",
  uber: "Transport",
  grab: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  activity: "Activities",
  wellness: "Wellness",
}

/**
 * Categorize a merchant name into a circle expense category
 */
export function categorizeTransaction(merchant: string): string {
  const normalized = merchant.toLowerCase()

  for (const [key, category] of Object.entries(merchantCategoryMap)) {
    if (normalized.includes(key)) {
      return category
    }
  }

  return "Miscellaneous"
}

/**
 * Match a transaction to active circles
 * Returns potential circle matches based on amount, merchant, and timing
 */
export async function matchTransactionToCircle(
  transaction: {
    id: string
    merchant: string
    amount: number
    date: string
  },
  userId: string
): Promise<TransactionMatch[]> {
  try {
    // Get user's active circles
    const { data: circles } = await supabase
      .from("circle_members")
      .select("circle_id")
      .eq("member_id", userId)

    if (!circles || circles.length === 0) return []

    const circleIds = circles.map((c) => c.circle_id)

    // Get circle details and expenses
    const { data: circleData } = await supabase
      .from("circles")
      .select("id, estimated_cost_per_person, activity_type")
      .in("id", circleIds)
      .eq("status", "active")

    if (!circleData || circleData.length === 0) return []

    const matches: TransactionMatch[] = []
    const category = categorizeTransaction(transaction.merchant)

    for (const circle of circleData) {
      // Calculate confidence based on amount and category
      const confidence = calculateMatchConfidence(
        transaction.amount,
        circle.estimated_cost_per_person,
        category,
        circle.activity_type
      )

      if (confidence !== "low") {
        matches.push({
          transactionId: transaction.id,
          circleId: circle.id,
          confidence,
          category,
        })
      }
    }

    return matches.sort((a, b) => {
      const confScore = { high: 3, medium: 2, low: 1 }
      return confScore[b.confidence] - confScore[a.confidence]
    })
  } catch (error) {
    console.error("Transaction matching error:", error)
    return []
  }
}

function calculateMatchConfidence(
  transactionAmount: number,
  estimatedCostPerPerson: number,
  category: string,
  activityType: string
): "high" | "medium" | "low" {
  // If amount is close to estimated per-person cost, high confidence
  if (
    transactionAmount >= estimatedCostPerPerson * 0.5 &&
    transactionAmount <= estimatedCostPerPerson * 3
  ) {
    return "high"
  }

  // If activity type matches category, medium confidence
  if (
    (activityType === "Dinner" && category === "Food & Drink") ||
    (activityType === "Day trip" && ["Transport", "Food & Drink"].includes(category)) ||
    (activityType === "Overseas trip" && ["Transport", "Accommodation", "Food & Drink"].includes(category))
  ) {
    return "medium"
  }

  return "low"
}

/**
 * Suggest splitting participants for an expense
 */
export async function inferExpenseSplitParticipants(
  circleId: string,
  merchant: string
): Promise<string[]> {
  try {
    const { data: members } = await supabase
      .from("circle_members")
      .select("member_id")
      .eq("circle_id", circleId)

    if (!members) return []

    // For now, suggest all active members
    // In future: use payment history to infer who typically pays
    return members.map((m) => m.member_id)
  } catch (error) {
    console.error("Split inference error:", error)
    return []
  }
}
