"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { supabase, hasSupabaseCredentials } from "@/lib/supabase"
import {
  circles as initialCircles,
  user as initialUser,
  transactions as initialTransactions,
  circleRecommendations,
  type Circle,
  type CircleExpense,
  type Transaction,
  type ComfortProfile,
  type TripWalletTransaction,
} from "@/lib/nets-data"

type CircleDataContextType = {
  user: typeof initialUser
  transactions: typeof initialTransactions
  circleRecommendations: typeof circleRecommendations
  circles: Circle[]
  loading: boolean
  createCircle: (name: string, participantIds: string[]) => string
  activateCircle: (id: string, withWallet?: boolean) => void
  settleCircle: (id: string) => void
  updateBalance: (newBalance: number) => Promise<void>
  setCircleProfile: (id: string, profile: ComfortProfile, tags: string[]) => void
  createWallet: (id: string, target: number, perPerson: number) => void
  addCircleExpense: (id: string, expense: Omit<CircleExpense, "id">, deductFromWallet?: boolean) => void
  deductWalletBalance: (id: string, amount: number, txn: Omit<TripWalletTransaction, "id">) => void
}

const CircleDataContext = createContext<CircleDataContextType | null>(null)

const friendProfiles: Record<string, Omit<Circle["members"][number], "paid">> = {
  alex: { id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)" },
  bryan: { id: "bryan", name: "Bryan Lim", initial: "B", color: "var(--nets-navy)" },
  cheryl: { id: "cheryl", name: "Cheryl Ng", initial: "C", color: "var(--nets-blue)" },
  dinesh: { id: "dinesh", name: "Dinesh R.", initial: "D", color: "var(--nets-green)" },
  elaine: { id: "elaine", name: "Elaine Koh", initial: "E", color: "var(--nets-red)" },
  farah: { id: "farah", name: "Farah B.", initial: "F", color: "var(--nets-navy)" },
}

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`

const inferActivityType = (name: string) => {
  const normalized = name.toLowerCase()
  if (normalized.includes("trip") || normalized.includes("holiday")) return "Day trip"
  if (normalized.includes("dinner") || normalized.includes("birthday") || normalized.includes("party")) return "Dinner"
  if (normalized.includes("concert") || normalized.includes("show")) return "Concert"
  if (normalized.includes("shopping") || normalized.includes("mall")) return "Shopping"
  return "Group outing"
}

const buildCostBreakdown = (groupSize: number) => {
  if (groupSize <= 3) {
    return [
      { label: "Food & drinks", amount: 35 },
      { label: "Transport", amount: 15 },
      { label: "Miscellaneous", amount: 10 },
    ]
  }
  return [
    { label: "Transport", amount: 20 },
    { label: "Food & drinks", amount: 35 },
    { label: "Activities", amount: 15 },
  ]
}

const buildAlternatives = (confidence: "moderate" | "low") =>
  confidence === "moderate"
    ? [
        { title: "Choose a lower-cost venue", description: "Keeps the group within budget without changing plans.", saving: 35, savingLabel: "~$35 less per person" },
        { title: "Share a ride instead of private transport", description: "More affordable and still convenient.", saving: 20, savingLabel: "~$20 less per person" },
      ]
    : [
        { title: "Move to weekday plans", description: "Lower costs while keeping the same experience.", saving: 70, savingLabel: "~$70 less per person" },
        { title: "Swap premium tickets for standard", description: "Enjoy the event, pay less.", saving: 110, savingLabel: "~$110 less per person" },
      ]

function normalizeUser(row: any) {
  return {
    ...initialUser,
    name: row?.name ?? initialUser.name,
    firstName: row?.first_name ?? initialUser.firstName,
    email: row?.email ?? initialUser.email,
    handle: row?.handle ?? initialUser.handle,
    balance: row?.balance ?? initialUser.balance,
    tier: row?.tier ?? initialUser.tier,
    bank: row?.bank ?? initialUser.bank,
  }
}

function normalizeTransaction(row: any): Transaction {
  return {
    id: row.id ?? createId("t"),
    merchant: row.merchant ?? "NETS",
    category: row.category ?? "Miscellaneous",
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount) || 0,
    type: row.type === "in" ? "in" : "out",
    date: typeof row.date === "string" ? row.date : new Date(row.date ?? Date.now()).toLocaleString("en-SG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    icon: row.icon ?? "N",
    color: row.color ?? "var(--nets-navy)",
  }
}

function normalizeCircleRow(row: any, members: any[], expenses: any[]): Circle {
  const circleMembers = members
    .filter((m) => m.circle_id === row.id)
    .map((member) => ({
      id: member.member_id,
      name: member.name,
      initial: member.initial,
      color: member.color,
      paid: member.paid,
    }))

  const circleExpenses = expenses
    .filter((expense) => expense.circle_id === row.id)
    .map((expense) => ({
      id: expense.id,
      title: expense.title,
      merchant: expense.merchant,
      category: expense.category,
      amount: expense.amount,
      paidById: expense.paid_by_id,
      time: expense.time,
    }))

  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? "Group",
    cover: row.cover ?? "var(--nets-blue)",
    status: row.status ?? "planning",
    date: row.date ?? "Soon",
    activityType: row.activity_type ?? "Group outing",
    estimatedCostPerPerson: row.estimated_cost_per_person ?? 55,
    circleConfidence: row.circle_confidence ?? "high",
    myAffordabilitySignal: row.my_affordability_signal ?? "within",
    costBreakdown: row.cost_breakdown ?? buildCostBreakdown(circleMembers.length || 3),
    members: circleMembers.length ? circleMembers : [{ id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)", paid: 0 }],
    expenses: circleExpenses,
    alternatives: row.alternatives ?? (row.circle_confidence === "high" ? undefined : buildAlternatives(row.circle_confidence ?? "moderate")),
  }
}

export function CircleDataProvider({ children }: { children: ReactNode }) {
  const [circles, setCircles] = useState<Circle[]>(initialCircles)
  const [transactions, setTransactions] = useState<typeof initialTransactions>(initialTransactions)
  const [user, setUser] = useState<typeof initialUser>(initialUser)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!hasSupabaseCredentials) {
      setLoading(false)
      return
    }

    async function loadFromSupabase() {
      if (!supabase) return
      const [circleRes, memberRes, expenseRes, txRes, userRes] = await Promise.all([
        supabase.from("circles").select("*").order("created_at", { ascending: false }),
        supabase.from("circle_members").select("*"),
        supabase.from("circle_expenses").select("*"),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("*").limit(1),
      ])

      if (!mounted.current) return

      if (userRes.data && userRes.data.length > 0) {
        setUser(normalizeUser(userRes.data[0]))
      }

      if (txRes.data) {
        setTransactions(txRes.data.map(normalizeTransaction))
      }

      if (circleRes.data) {
        const rows = circleRes.data
        const members = memberRes.data ?? []
        const expenses = expenseRes.data ?? []
        // Supabase stores the live state (members, expenses, status, balances).
        // Merge back only the non-persisted comfort metadata from the seed.
        // Note: Trip Wallet is intentionally NOT merged onto pre-seeded circles —
        // c1 uses the "fronted, settle via eNETS" model, and a pre-funded wallet
        // would contradict that. The Trip Wallet is showcased via the new-circle
        // creation flow instead.
        const seedById = new Map(initialCircles.map((c) => [c.id, c]))
        setCircles(
          rows.map((row) => {
            const circle = normalizeCircleRow(row, members, expenses)
            const seed = seedById.get(circle.id)
            if (!seed) return circle
            return {
              ...circle,
              comfortProfile: circle.comfortProfile ?? seed.comfortProfile,
              interestTags: circle.interestTags ?? seed.interestTags,
            }
          })
        )
      }

      setLoading(false)
    }

    loadFromSupabase().catch((error) => {
      console.error("Failed to load Supabase data", error)
      if (mounted.current) setLoading(false)
    })
  }, [])

  const persistCircle = async (circle: Circle) => {
    if (!supabase) return

    await supabase.from("circles").upsert({
      id: circle.id,
      name: circle.name,
      emoji: circle.emoji,
      cover: circle.cover,
      status: circle.status,
      date: circle.date,
      activity_type: circle.activityType,
      estimated_cost_per_person: circle.estimatedCostPerPerson,
      circle_confidence: circle.circleConfidence,
      my_affordability_signal: circle.myAffordabilitySignal,
      cost_breakdown: circle.costBreakdown,
      alternatives: circle.alternatives,
    })

    await supabase.from("circle_members").upsert(
      circle.members.map((member) => ({
        circle_id: circle.id,
        member_id: member.id,
        name: member.name,
        initial: member.initial,
        color: member.color,
        paid: member.paid,
      }))
    )

    if (circle.expenses.length > 0) {
      await supabase.from("circle_expenses").upsert(
        circle.expenses.map((expense) => ({
          ...expense,
          circle_id: circle.id,
          paid_by_id: expense.paidById,
        }))
      )
    }
  }

  const createCircle = (name: string, participantIds: string[]) => {
    const memberIds = Array.from(new Set(["alex", ...participantIds]))
    const members = memberIds.map((id) => ({
      ...friendProfiles[id] ?? { id, name: id, initial: id[0]?.toUpperCase() ?? "?", color: "var(--nets-navy)" },
      paid: 0,
    }))

    const estimatedCostPerPerson = Math.max(45, 55 + (members.length - 2) * 12)
    const confidence: Circle["circleConfidence"] = members.length >= 5 ? "moderate" : "high"
    const circle: Circle = {
      id: createId("c"),
      name,
      emoji: "Group",
      cover: "var(--nets-blue)",
      status: "planning",
      date: "In 2 weeks",
      activityType: inferActivityType(name),
      estimatedCostPerPerson,
      circleConfidence: confidence,
      myAffordabilitySignal: "within",
      costBreakdown: buildCostBreakdown(members.length),
      members,
      expenses: [],
      alternatives: confidence === "high" ? undefined : buildAlternatives(confidence),
    }

    setCircles((current) => [circle, ...current])
    void persistCircle(circle)
    return circle.id
  }

  const activateCircle = (id: string, withWallet = false) => {
    setCircles((current) =>
      current.map((circle) => {
        if (circle.id !== id) return circle
        if (circle.status === "active") return circle

        if (withWallet) {
          const updatedCircle: Circle = {
            ...circle,
            status: "active",
            members: circle.members.map((m) => ({ ...m, paid: circle.tripWallet?.perPerson ?? 0 })),
            expenses: [],
          }
          void persistCircle(updatedCircle)
          return updatedCircle
        }

        const totalAmount = circle.estimatedCostPerPerson * circle.members.length
        const updatedCircle: Circle = {
          ...circle,
          status: "active",
          members: circle.members.map((member) =>
            member.id === "alex"
              ? { ...member, paid: totalAmount }
              : { ...member, paid: 0 }
          ),
          expenses: [
            {
              id: `${circle.id}-e1`,
              title: `${circle.activityType} payment`,
              merchant: "NETS Circle",
              category: "miscellaneous",
              amount: totalAmount,
              paidById: "alex",
              time: "Now",
            },
          ],
        }
        void persistCircle(updatedCircle)
        return updatedCircle
      })
    )
  }

  const settleCircle = (id: string) => {
    setCircles((current) =>
      current.map((circle) => {
        if (circle.id !== id) return circle
        const updated: Circle = { ...circle, status: "settled" }
        void persistCircle(updated)
        return updated
      })
    )
  }

  const updateBalance = async (newBalance: number) => {
    setUser((current) => ({ ...current, balance: newBalance }))
    if (supabase) {
      await supabase.from("users").update({ balance: newBalance }).eq("id", "alex")
    }
  }

  const setCircleProfile = (id: string, profile: ComfortProfile, tags: string[]) => {
    setCircles((current) =>
      current.map((c) => {
        if (c.id !== id) return c
        const updated: Circle = { ...c, comfortProfile: profile, interestTags: tags }
        void persistCircle(updated)
        return updated
      })
    )
  }

  const createWallet = (id: string, target: number, perPerson: number) => {
    setCircles((current) =>
      current.map((c) => {
        if (c.id !== id) return c
        const wallet = {
          target,
          perPerson,
          balance: target,
          contributions: c.members.map((m) => ({ memberId: m.id, contributed: true })),
          transactions: [] as import("@/lib/nets-data").TripWalletTransaction[],
        }
        const updated: Circle = { ...c, tripWallet: wallet }
        void persistCircle(updated)
        return updated
      })
    )
  }

  const addCircleExpense = (id: string, expense: Omit<CircleExpense, "id">, deductFromNETS = false) => {
    // When deductFromNETS=true, deduct the amount from the user's personal NETS Prepaid balance
    if (deductFromNETS) {
      setUser((current) => {
        const newBalance = parseFloat(Math.max(0, current.balance - expense.amount).toFixed(2))
        if (supabase) void supabase.from("users").update({ balance: newBalance }).eq("id", "alex")
        return { ...current, balance: newBalance }
      })
    }
    setCircles((current) =>
      current.map((c) => {
        if (c.id !== id) return c
        const newExpense: CircleExpense = { ...expense, id: createId("e") }
        const updatedMembers = c.members.map((m) =>
          m.id === expense.paidById ? { ...m, paid: m.paid + expense.amount } : m
        )
        const updated: Circle = { ...c, expenses: [...c.expenses, newExpense], members: updatedMembers }
        void persistCircle(updated)
        return updated
      })
    )
  }

  const deductWalletBalance = (id: string, amount: number, txn: Omit<import("@/lib/nets-data").TripWalletTransaction, "id">) => {
    setCircles((current) =>
      current.map((c) => {
        if (c.id !== id || !c.tripWallet) return c
        const updated: Circle = {
          ...c,
          tripWallet: {
            ...c.tripWallet,
            balance: Math.max(0, c.tripWallet.balance - amount),
            transactions: [...c.tripWallet.transactions, { ...txn, id: createId("w") }],
          },
        }
        void persistCircle(updated)
        return updated
      })
    )
  }

  return (
    <CircleDataContext.Provider
      value={{
        user,
        transactions,
        circleRecommendations,
        circles,
        loading,
        createCircle,
        activateCircle,
        settleCircle,
        updateBalance,
        setCircleProfile,
        createWallet,
        addCircleExpense,
        deductWalletBalance,
      }}
    >
      {children}
    </CircleDataContext.Provider>
  )
}

export function useCircleData() {
  const ctx = useContext(CircleDataContext)
  if (!ctx) throw new Error("useCircleData must be used within CircleDataProvider")
  return ctx
}
