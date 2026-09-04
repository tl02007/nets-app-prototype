// Shared data + business logic for the NETS Circle prototype (Singapore context)

export type TxnType = "in" | "out"

export type Transaction = {
  id: string
  merchant: string
  category: string
  amount: number
  type: TxnType
  date: string
  icon: string
  color: string
}

export const user = {
  name: "Thanis",
  firstName: "Thanis",
  email: "thanis@nets.com.sg",
  handle: "+65 9001 2345",
  balance: 1247.50,
  tier: "NETS+ Gold",
  bank: "DBS •••• 8102",
}

export const transactions: Transaction[] = [
  { id: "t1", merchant: "Kopitiam @ Bugis",       category: "Food & Drink",  amount: 6.80,   type: "out", date: "Today, 12:42",    icon: "K",  color: "var(--nets-red)"   },
  { id: "t2", merchant: "SMRT Transit",            category: "Transport",     amount: 2.14,   type: "out", date: "Today, 09:03",    icon: "S",  color: "var(--nets-blue)"  },
  { id: "t3", merchant: "FairPrice Finest",        category: "Groceries",    amount: 43.50,  type: "out", date: "Yesterday, 19:15", icon: "F",  color: "var(--nets-navy)"  },
  { id: "t4", merchant: "Grab",                    category: "Transport",     amount: 9.20,   type: "out", date: "Yesterday, 17:45", icon: "G",  color: "var(--nets-green)" },
  { id: "t5", merchant: "Circle: Sherwin's Birthday", category: "Settlement", amount: 42.00,  type: "in",  date: "28 Aug, 21:10",   icon: "C",  color: "var(--nets-green)" },
  { id: "t6", merchant: "Tiong Bahru Bakery",      category: "Food & Drink",  amount: 9.40,   type: "out", date: "28 Aug, 08:20",   icon: "T",  color: "var(--nets-red)"   },
  { id: "t7", merchant: "Watsons",                 category: "Health",        amount: 14.80,  type: "out", date: "27 Aug, 14:30",   icon: "W",  color: "var(--nets-blue)"  },
  { id: "t8", merchant: "Don Don Donki Orchard",   category: "Shopping",      amount: 31.60,  type: "out", date: "26 Aug, 20:50",   icon: "D",  color: "var(--nets-red)"   },
  { id: "t9", merchant: "Salary — SP Group Pte",   category: "Income",        amount: 3800.00,type: "in",  date: "25 Aug, 00:01",   icon: "$",  color: "var(--nets-green)" },
]

export const promos = [
  { id: "p1", title: "5% cashback at FairPrice", subtitle: "Pay with NETS this weekend", bg: "var(--nets-navy)" },
  { id: "p2", title: "No top-up fees", subtitle: "Add your DBS / OCBC / UOB card", bg: "var(--nets-blue)" },
  { id: "p3", title: "Plan your next outing", subtitle: "Try NETS Circle with friends", bg: "var(--nets-red)" },
]

// ---------- NETS Circle ----------

export type CircleMember = {
  id: string
  name: string
  initial: string
  color: string
  paid: number
}

export type ExpenseSource = "meal" | "activity" | "detected-nets" | "manual"

export type CircleExpense = {
  id: string
  title: string
  merchant: string
  category: string
  amount: number
  paidById: string
  participants?: string[] // who split this item; empty = all members
  source?: ExpenseSource // tracking where this expense came from
  time: string
}

// Circle Check is the group-level signal — no individual finances are ever exposed.
// Concept doc §1.4: three privacy-safe outcomes replace the old confidence %.
export type CircleCheckOutcome = "circle-ready" | "adjust-plan" | "not-aligned"

// Kept for backward-compat with existing circle list display.
export type ConfidenceLevel = "high" | "moderate" | "low"

// Comfort Profile is retained for the Experience Match ranking algorithm.
// It is superseded by PrivateCommitment as the user-facing input (concept doc §1.3).
export type ComfortProfile = "easy-going" | "balanced" | "experience-first"

// ─── Spend Band (concept doc §1.2) ───────────────────────────────────────────
// A Spend Band is a planning estimate, not the final merchant bill.
// Every band carries provenance so users can judge its reliability.

export type SpendBandSource = "merchant-confirmed" | "nets-insights" | "organiser-estimate"

export type SpendBand = {
  min: number
  max: number
  // Source, last-updated, confidence and exclusions per concept doc §1.2
  source: SpendBandSource
  lastUpdated: string          // human-readable, e.g. "Today", "3 days ago"
  confidenceLevel: "high" | "moderate" | "low"
  exclusions?: string          // e.g. "Excludes drinks and dessert"
}

// ─── Dynamic Circle Negotiation (concept doc §1.5) ───────────────────────────
// When outcome is "adjust-plan", Circle suggests privacy-preserving changes.
// The app never says "Krishna can't afford bowling" — it says
// "Making bowling optional would improve Circle alignment."

export type NegotiationOption = {
  id: string
  label: string                 // e.g. "Make bowling optional"
  type: "make-optional" | "change-timeslot" | "change-merchant" | "fixed-price-package" | "reduce-activity" | "lower-cost-transport"
  newSpendBand: { min: number; max: number }
}

// ─── Circle-Ready Offers (concept doc §1.6) ──────────────────────────────────
// Commercial bridge between Circle Check and the NETS merchant ecosystem.
// Merchants offer packages specifically sized to bring Adjust Plan → Circle Ready.
// The merchant receives NO individual commitment information.

export type CircleReadyOffer = {
  id: string
  merchantName: string
  tag: "group-set" | "student-package" | "off-peak" | "bundle"
  items: { label: string; amount: number }[]
  combinedMin: number
  combinedMax: number
}

// ─── Collaborative Idea Submission + Voting (concept doc §1.7) ───────────────

export type IdeaVoteScore = 1 | 2 | 3  // 1 = Not for me, 2 = Could work, 3 = Love it!

export type IdeaVote = {
  memberId: string
  score: IdeaVoteScore
}

// A verified group offer from a participating merchant that changes the plan's total cost.
// An offer is only valid if applyGroupOffer(offer, memberSpendBands) returns true.
export type GroupOffer = {
  id: string
  merchantName: string
  offerTitle: string       // e.g. "Circle-Ready Set Menu"
  description: string
  originalMin: number
  originalMax: number
  offerMin: number
  offerMax: number
  minPeople: number
  validDuring: string
  revisedItinerary: CircleItinerary  // updated stops reflecting the offer
}

export type CircleIdea = {
  id: string
  submittedById: string
  title: string
  description?: string
  estimatedMin: number
  estimatedMax: number
  reviewScore: number    // out of 5.0
  reviewCount: number
  isCircleReady: boolean
  circleReadyDiscount?: number  // % discount if Circle-Ready
  netsMerchantScore: number     // 0–100 NETS acceptance score
  votes: IdeaVote[]
  circleScore?: number
  spendFitPct?: number
  groupPrefPct?: number
  practicalFitPct?: number
  preseededStatus?: CircleCheckOutcome  // fixed status for demo ideas
  itinerary?: CircleItinerary           // agreed stop sequence for Circle Ready plans
  groupOffer?: GroupOffer               // merchant-verified offer; only shown if it mathematically fits
}

// ─── Activity (enriched with Spend Band metadata) ────────────────────────────

export type Activity = {
  id: string
  name: string
  emoji: string
  category: string
  // Raw cost range retained for the confidence algorithm
  costMin: number
  costMax: number
  // V2: Spend Band with full provenance metadata (concept doc §1.2)
  spendBand: SpendBand
  crossBorder: boolean
  netsMerchantScore: number     // NETS acceptance score 0–100
  merchantCount: number
  confidence: number            // group Circle Confidence at Balanced/"Moderate" comfort
  tags: string[]
  description: string
}

// ─── Circle ──────────────────────────────────────────────────────────────────

export type Circle = {
  id: string
  name: string
  emoji: string
  cover: string
  status: "planning" | "active" | "settled"
  date: string
  members: CircleMember[]
  expenses: CircleExpense[]
  // Planning estimates
  estimatedCostPerPerson: number
  // V2: Spend Band with provenance (supersedes bare estimatedCostPerPerson for new circles)
  spendBand?: SpendBand
  // V2: Core (mandatory) vs optional activities — concept doc §1.1
  coreActivities?: string[]
  optionalActivities?: string[]
  // Circle Check outcome — concept doc §1.4
  circleConfidence: ConfidenceLevel   // kept for list display backward-compat
  checkOutcome?: CircleCheckOutcome
  // V2: Dynamic negotiation options shown on "Adjust Plan" — concept doc §1.5
  negotiationOptions?: NegotiationOption[]
  // V2: Circle-Ready Offers from participating merchants — concept doc §1.6
  circleReadyOffers?: CircleReadyOffer[]
  // Private per-user signal — only the current user ever sees this
  myAffordabilitySignal: "within" | "stretch" | "above"
  // V2: User's private spend band (never shared with others)
  mySpendBand?: { min: number; max: number }
  // Agreed plan itinerary — set once a plan is selected and circle activated
  itinerary?: CircleItinerary
  activityType: string
  costBreakdown: { label: string; amount: number }[]
  // Smart Participation alternatives (legacy — kept for backward compat)
  alternatives?: { title: string; description: string; saving: number; savingLabel: string }[]
  comfortProfile?: ComfortProfile
  interestTags?: string[]
}

// ─── New V2 types ─────────────────────────────────────────────────────────────

export type MemberSpendBand = { memberId: string; min: number; max: number }

export type MemberRanking = { memberId: string; ideaId: string; score: IdeaVoteScore }

export type CircleEngineResult = {
  ideaId: string
  circleScore: number
  spendFitPct: number
  groupPrefPct: number
  practicalFitPct: number
  outcome: CircleCheckOutcome
  rank: number
}

export type MenuItem = { id: string; name: string; description?: string; price: number; isShared?: boolean }
export type MerchantMenu = { merchantId: string; merchantName: string; category: string; items: MenuItem[] }
export type SharedDishInvitation = { id: string; dishName: string; price: number; initiatedBy: string; acceptedMembers: string[] }

export type CartItem = { id: string; name: string; price: number; quantity: number; orderedBy: string; splitAmong: string[] }
export type CircleCart = { circleId: string; items: CartItem[]; lockedAt?: string }
export type LockedOrder = { circleId: string; items: CartItem[]; totalAmount: number; lockedAt: string }

export type NETSPaymentEvent = { id: string; circleId: string; memberId: string; amount: number; merchant: string; status: "pending" | "success" | "failed"; timestamp: string }
export type SharedExpense = { id: string; circleId: string; title: string; merchant: string; totalAmount: number; splitAmong: string[]; paidById: string; category: string; timestamp: string }
// Next Round is an agreed outstanding balance carried into a future Circle.
// It is NOT a transfer, loan, or stored value — just a social commitment between friends.
export const NEXT_ROUND_THRESHOLD = 50   // S$ max eligible for Next Round

export type NextRoundRequest = {
  id: string
  fromId: string      // debtor — will cover the creditor's share on a future Circle
  toId: string        // creditor — will have their future share covered
  amount: number      // total amount committed
  remaining: number   // not yet applied
  originCircleId: string
  status: "pending"           // sent, waiting for creditor to accept
         | "accepted"         // active — will apply on next shared outing
         | "applied"          // fully used
         | "partial"          // partially applied, remainder still active
         | "cancelled"
         | "settled-instead"  // creditor chose Settle Now
}

export const initialNextRoundRequests: NextRoundRequest[] = []

export type NextRoundBalance = { fromCircleId: string; toCircleId?: string; memberId: string; carryAmount: number }

export type ItineraryStop = { id: string; order: number; type: "dining" | "activity" | "transport"; merchantName: string; address?: string; estimatedCost: { min: number; max: number }; duration?: string; time?: string; isCircleReady: boolean }
export type CircleItinerary = { ideaId: string; title: string; stops: ItineraryStop[]; totalEstimated: { min: number; max: number } }
export type SubmittedIdea = CircleIdea

// ─── Friend profiles ──────────────────────────────────────────────────────────

const friends = {
  thanis:  { id: "thanis",  name: "Thanis (You)", initial: "T", color: "var(--nets-red)"   },
  bryan:   { id: "bryan",   name: "Bryan",         initial: "B", color: "var(--nets-navy)"  },
  krishna: { id: "krishna", name: "Krishna",        initial: "K", color: "var(--nets-blue)"  },
  sherwin: { id: "sherwin", name: "Sherwin",         initial: "S", color: "var(--nets-green)" },
}

export const circles: Circle[] = [
  // ── c1: Active demo circle — judges add expenses live ─────────────
  {
    id: "c1",
    name: "Bugis Night Out",
    emoji: "Night out",
    cover: "var(--nets-blue)",
    status: "active",
    date: "Tonight",
    activityType: "Dinner + Activity",
    estimatedCostPerPerson: 46,
    spendBand: {
      min: 44, max: 54,
      source: "nets-insights",
      lastUpdated: "Today",
      confidenceLevel: "high",
    },
    coreActivities: ["Korean BBQ + Arcade @ Bugis"],
    circleConfidence: "high",
    checkOutcome: "circle-ready",
    myAffordabilitySignal: "within",
    mySpendBand: { min: 40, max: 46 },
    costBreakdown: [
      { label: "Korean BBQ dinner (Seoul Table, Bugis+)", amount: 26 },
      { label: "Arcade (Arcade Zone @ Bugis+)", amount: 18 },
    ],
    itinerary: {
      ideaId: "c1-plan",
      title: "Korean BBQ + Arcade @ Bugis",
      stops: [
        {
          id: "c1-s1", order: 1, type: "dining",
          merchantName: "Seoul Table",
          address: "Bugis+, #04-12, 201 Victoria St",
          estimatedCost: { min: 22, max: 28 },
          duration: "~1.5 hrs", time: "6:30 PM",
          isCircleReady: true,
        },
        {
          id: "c1-s2", order: 2, type: "activity",
          merchantName: "Arcade Zone @ Bugis+",
          address: "Bugis+, Level 3, 201 Victoria St",
          estimatedCost: { min: 18, max: 18 },
          duration: "~45 min", time: "8:00 PM",
          isCircleReady: true,
        },
      ],
      totalEstimated: { min: 40, max: 46 },
    },
    members: [
      { ...friends.thanis,  paid: 0 },
      { ...friends.bryan,   paid: 0 },
      { ...friends.krishna, paid: 0 },
      { ...friends.sherwin, paid: 0 },
    ],
    expenses: [
      {
        id: "exp-truffle",
        title: "Truffle Fries",
        merchant: "Seoul Table",
        category: "Meal",
        amount: 16,
        paidById: "thanis",
        participants: ["thanis", "bryan", "krishna", "sherwin"],
        source: "meal",
        time: "6:45 PM"
      },
      {
        id: "exp-arcade",
        title: "Arcade Credit Bundle",
        merchant: "Arcade Zone @ Bugis+",
        category: "Activity",
        amount: 30,
        paidById: "bryan",
        participants: ["bryan", "thanis"],
        source: "activity",
        time: "8:15 PM"
      },
      {
        id: "exp-detected-nets",
        title: "Detected NETS Payment",
        merchant: "Seoul Table",
        category: "Detected NETS",
        amount: 20,
        paidById: "thanis",
        participants: ["krishna", "sherwin"],
        source: "detected-nets",
        time: "6:50 PM"
      }
    ],
  },
  // ── c2: Settled — shows what a completed circle looks like ────────
  {
    id: "c2",
    name: "Sherwin's Birthday Dinner",
    emoji: "Celebration",
    cover: "var(--nets-red)",
    status: "settled",
    date: "28 Aug",
    activityType: "Dinner",
    estimatedCostPerPerson: 42,
    spendBand: {
      min: 38, max: 48,
      source: "merchant-confirmed",
      lastUpdated: "28 Aug",
      confidenceLevel: "high",
    },
    coreActivities: ["Peach Garden (MBS)"],
    circleConfidence: "high",
    checkOutcome: "circle-ready",
    myAffordabilitySignal: "within",
    mySpendBand: { min: 40, max: 50 },
    costBreakdown: [
      { label: "Dinner at Peach Garden (MBS)", amount: 33 },
      { label: "Cake from Bengawan Solo", amount: 9 },
    ],
    circleReadyOffers: [],
    members: [
      { ...friends.thanis,  paid: 0 },
      { ...friends.bryan,   paid: 0 },
      { ...friends.krishna, paid: 168.0 },
      { ...friends.sherwin, paid: 0 },
    ],
    expenses: [
      { id: "e-c2-1", title: "Dinner",        merchant: "Peach Garden (MBS)",  category: "Food & Drink", amount: 132.0,  paidById: "krishna", time: "19:30" },
      { id: "e-c2-2", title: "Birthday cake", merchant: "Bengawan Solo",        category: "Food & Drink", amount: 36.0,   paidById: "krishna", time: "20:45" },
    ],
  },
  // ── c-brunch: Pre-seeded future Circle for Next Round demo ──────
  {
    id: "c-brunch",
    name: "Saturday Brunch",
    emoji: "Brunch",
    cover: "var(--nets-red)",
    status: "planning",
    date: "Next Saturday",
    activityType: "Brunch",
    estimatedCostPerPerson: 40,
    spendBand: {
      min: 35, max: 48,
      source: "nets-insights" as const,
      lastUpdated: "Today",
      confidenceLevel: "high" as const,
    },
    coreActivities: ["Symmetry Café, Jalan Kubor"],
    circleConfidence: "high" as const,
    checkOutcome: "circle-ready" as const,
    myAffordabilitySignal: "within" as const,
    mySpendBand: { min: 35, max: 45 },
    costBreakdown: [
      { label: "Brunch at Symmetry Café", amount: 32 },
      { label: "Coffee & drinks", amount: 8 },
    ],
    members: [
      { ...friends.thanis,  paid: 0 },
      { ...friends.krishna, paid: 0 },
      { ...friends.bryan,   paid: 0 },
    ],
    expenses: [],
  },
  // ── c3: Planning — shows the planning / Circle Check phase ────────
  {
    id: "c3",
    name: "East Coast Park Outing",
    emoji: "Outdoors",
    cover: "var(--nets-green)",
    status: "planning",
    date: "This Weekend",
    activityType: "Group outing",
    estimatedCostPerPerson: 35,
    spendBand: {
      min: 28, max: 42,
      source: "nets-insights",
      lastUpdated: "Today",
      confidenceLevel: "high",
    },
    coreActivities: ["PAssion Wave @ ECP", "NParks BBQ Pit"],
    circleConfidence: "high",
    checkOutcome: "circle-ready",
    circleReadyOffers: [
      {
        id: "o-c3-1",
        merchantName: "PAssion Wave @ ECP",
        tag: "group-set",
        items: [
          { label: "Bicycle rental × 2 hrs", amount: 8 },
          { label: "BBQ pit package", amount: 15 },
        ],
        combinedMin: 23, combinedMax: 27,
      },
    ],
    myAffordabilitySignal: "within",
    mySpendBand: { min: 35, max: 45 },
    costBreakdown: [
      { label: "Bicycle rental (PAssion Wave, ECP)", amount: 8 },
      { label: "BBQ pit + charcoal (NParks)", amount: 15 },
      { label: "Groceries (NTUC FairPrice)", amount: 12 },
    ],
    members: [
      { ...friends.thanis,  paid: 0 },
      { ...friends.bryan,   paid: 0 },
      { ...friends.sherwin, paid: 0 },
    ],
    expenses: [],
  },
]

export const circleRecommendations = [
  { id: "r1", title: "Jumbo Seafood — Riverside", tag: "Group favourite", meta: "Seafood · $$ · 4.6★", color: "var(--nets-red)" },
  { id: "r2", title: "Sentosa Cable Car Bundle", tag: "Trending", meta: "Activity · $$ · 4.8★", color: "var(--nets-navy)" },
  { id: "r3", title: "PS.Cafe Dempsey", tag: "Matches your taste", meta: "Café · $$ · 4.5★", color: "var(--nets-green)" },
]

// ─── Helper functions ─────────────────────────────────────────────────────────

export function circleTotal(c: Circle) {
  return c.expenses.reduce((s, e) => s + e.amount, 0)
}

export function perHead(c: Circle) {
  const total = circleTotal(c)
  return c.members.length ? total / c.members.length : 0
}

export type Settlement = { fromId: string; toId: string; amount: number }

// Compute minimum-transfer settlements from actual expense records (debt compression).
// Builds each member's net position from expenses, then uses a greedy creditor/debtor
// algorithm to reduce N*(N-1) possible transfers down to at most N-1.
export function computeCompressedSettlements(c: Circle): Settlement[] {
  const net: Record<string, number> = {}
  for (const m of c.members) net[m.id] = 0

  for (const exp of c.expenses) {
    const participants = exp.participants?.length ? exp.participants : c.members.map(m => m.id)
    const perPerson = exp.amount / participants.length
    net[exp.paidById] = (net[exp.paidById] ?? 0) + exp.amount
    for (const p of participants) {
      net[p] = (net[p] ?? 0) - perPerson
    }
  }

  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.005)
    .map(([id, v]) => ({ id, bal: v }))
    .sort((a, b) => a.bal - b.bal)
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.005)
    .map(([id, v]) => ({ id, bal: v }))
    .sort((a, b) => b.bal - a.bal)

  const res: Settlement[] = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const owe = Math.min(-debtors[i].bal, creditors[j].bal)
    res.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: parseFloat(owe.toFixed(2)) })
    debtors[i].bal += owe
    creditors[j].bal -= owe
    if (Math.abs(debtors[i].bal) < 0.005) i++
    if (Math.abs(creditors[j].bal) < 0.005) j++
  }
  return res
}

export function computeSettlements(c: Circle): Settlement[] {
  const share = perHead(c)
  const balances = c.members.map((m) => ({ id: m.id, bal: m.paid - share }))
  const debtors = balances.filter((b) => b.bal < -0.01).sort((a, b) => a.bal - b.bal)
  const creditors = balances.filter((b) => b.bal > 0.01).sort((a, b) => b.bal - a.bal)
  const res: Settlement[] = []
  let i = 0; let j = 0
  while (i < debtors.length && j < creditors.length) {
    const owe = Math.min(-debtors[i].bal, creditors[j].bal)
    res.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: owe })
    debtors[i].bal += owe
    creditors[j].bal -= owe
    if (Math.abs(debtors[i].bal) < 0.01) i++
    if (Math.abs(creditors[j].bal) < 0.01) j++
  }
  return res
}

export function memberName(c: Circle, id: string) {
  return c.members.find((m) => m.id === id)?.name ?? id
}

export type MemberBalance = {
  fromId: string
  toId: string
  amount: number
  breakdown: { expenseTitle: string; amount: number }[]
}

export function computeBalancesFromExpenses(c: Circle): MemberBalance[] {
  const balances: Record<string, Record<string, number>> = {}
  const breakdowns: Record<string, Record<string, { expenseTitle: string; amount: number }[]>> = {}

  for (const m of c.members) {
    balances[m.id] = {}
    breakdowns[m.id] = {}
    for (const m2 of c.members) {
      if (m.id !== m2.id) {
        balances[m.id][m2.id] = 0
        breakdowns[m.id][m2.id] = []
      }
    }
  }

  for (const exp of c.expenses) {
    const participants = exp.participants && exp.participants.length > 0 ? exp.participants : c.members.map(m => m.id)
    const perPersonAmount = exp.amount / participants.length

    for (const participantId of participants) {
      if (participantId !== exp.paidById) {
        balances[participantId][exp.paidById] += perPersonAmount
        breakdowns[participantId][exp.paidById].push({ expenseTitle: exp.title, amount: perPersonAmount })
      }
    }
  }

  const result: MemberBalance[] = []
  for (const fromId of Object.keys(balances)) {
    for (const toId of Object.keys(balances[fromId])) {
      const amount = balances[fromId][toId]
      if (Math.abs(amount) > 0.01) {
        result.push({
          fromId,
          toId,
          amount,
          breakdown: breakdowns[fromId][toId]
        })
      }
    }
  }

  return netBalances(result)
}

function netBalances(balances: MemberBalance[]): MemberBalance[] {
  const netMap: Record<string, Record<string, MemberBalance>> = {}

  for (const b of balances) {
    const key1 = `${b.fromId}-${b.toId}`
    const key2 = `${b.toId}-${b.fromId}`

    if (!netMap[b.fromId]) netMap[b.fromId] = {}
    netMap[b.fromId][b.toId] = b
  }

  const result: MemberBalance[] = []
  const processed = new Set<string>()

  for (const b of balances) {
    const key = `${b.fromId}-${b.toId}`
    const reverseKey = `${b.toId}-${b.fromId}`

    if (processed.has(key) || processed.has(reverseKey)) continue

    const reverse = netMap[b.toId]?.[b.fromId]
    const netAmount = b.amount - (reverse?.amount ?? 0)

    if (Math.abs(netAmount) > 0.01) {
      if (netAmount > 0) {
        result.push({
          fromId: b.fromId,
          toId: b.toId,
          amount: netAmount,
          breakdown: b.breakdown
        })
      } else {
        result.push({
          fromId: b.toId,
          toId: b.fromId,
          amount: -netAmount,
          breakdown: reverse?.breakdown ?? []
        })
      }
    }

    processed.add(key)
    processed.add(reverseKey)
  }

  return result
}

export function confidenceConfig(level: ConfidenceLevel) {
  if (level === "high") return {
    label: "High Confidence",
    color: "var(--nets-green)",
    bg: "bg-nets-green/10",
    text: "text-nets-green",
    border: "border-nets-green/30",
    message: "This experience fits the Circle's selected comfort profile.",
    icon: "✓",
  }
  if (level === "moderate") return {
    label: "Moderate Confidence",
    color: "#d97706",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    message: "This experience may be a slight stretch for the Circle's comfort profile.",
    icon: "~",
  }
  return {
    label: "Low Confidence",
    color: "var(--nets-red)",
    bg: "bg-nets-red/10",
    text: "text-nets-red",
    border: "border-nets-red/20",
    message: "This experience may be outside the Circle's current comfort profile.",
    icon: "!",
  }
}

// ─── Circle Check Outcome helpers (concept doc §1.4) ─────────────────────────
// Compute the group-level check outcome from a user's private commitment vs the
// activity's Spend Band. In production this runs server-side across all members.

export function computeCircleCheck(
  spendBand: SpendBand | { min: number; max: number },
  userCommitment: number
): CircleCheckOutcome {
  if (userCommitment >= spendBand.max) return "circle-ready"
  if (userCommitment >= spendBand.min) return "adjust-plan"
  return "not-aligned"
}

// Returns display config for each of the three Circle Check outcomes.
export function circleCheckConfig(outcome: CircleCheckOutcome) {
  if (outcome === "circle-ready") return {
    label: "Circle Ready",
    icon: "✓",
    color: "var(--nets-green)",
    bg: "bg-nets-green/10",
    text: "text-nets-green",
    border: "border-nets-green/30",
    message: "The core experience aligns with the Circle. You're good to go.",
  }
  if (outcome === "adjust-plan") return {
    label: "Adjust Plan",
    icon: "~",
    color: "#d97706",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    message: "The experience is close to fitting. Small adjustments could improve alignment for everyone.",
  }
  return {
    label: "Not Aligned Yet",
    icon: "!",
    color: "var(--nets-red)",
    bg: "bg-nets-red/10",
    text: "text-nets-red",
    border: "border-nets-red/20",
    message: "The mandatory cost doesn't align well with the Circle. Consider a meaningfully different plan.",
  }
}

// Privacy principle: the outcome never reveals who caused it.
// "Adjust Plan = change part of this plan." / "Not Aligned Yet = different plan."
export function circleCheckPrivacyNote(outcome: CircleCheckOutcome): string {
  if (outcome === "circle-ready") return "Nobody's financial details are shared. NETS evaluates the group collectively."
  if (outcome === "adjust-plan") return "Nobody learns who selected what. Adjusting the plan preserves everyone's dignity."
  return "Nobody learns who or how many people were outside the range. This is a group signal, not a personal judgement."
}

// Private commitment guidance for the current user vs their own declared commitment.
// Only the current user ever sees this (concept doc §2.4).
export function privateCommitmentGuidance(
  currentTotal: number,
  commitmentAmount: number
): { label: string; ok: boolean } {
  if (currentTotal <= commitmentAmount) {
    return { label: `Within your selected commitment (S$${commitmentAmount})`, ok: true }
  }
  const over = (currentTotal - commitmentAmount).toFixed(2)
  return {
    label: `This exceeds your commitment by S$${over}. You may wish to adjust.`,
    ok: false,
  }
}

// Kept for affordability message backward-compat (used in legacy confidence view).
export function affordabilityMessage(signal: Circle["myAffordabilitySignal"]) {
  if (signal === "within") return "This experience sits within the comfort profile you selected."
  if (signal === "stretch") return "This experience is a slight stretch beyond the comfort profile you selected."
  return "This experience is above the comfort profile you selected."
}

// ─── Activity Database ────────────────────────────────────────────────────────
// Each activity now carries a full SpendBand with source metadata (concept doc §1.2).

export const activities: Activity[] = [
  {
    id: "a1", name: "JB Food Trail", emoji: "🍜", category: "Food + Travel",
    costMin: 45, costMax: 60, crossBorder: true,
    spendBand: {
      min: 45, max: 60,
      source: "merchant-confirmed",
      lastUpdated: "Today",
      confidenceLevel: "high",
      exclusions: "Excludes personal shopping",
    },
    netsMerchantScore: 92, merchantCount: 140,
    confidence: 91,
    tags: ["Food", "Travel"],
    description: "Hawker trail and dessert hop across the Causeway",
  },
  {
    id: "a2", name: "Haji Lane Cafe Hop", emoji: "☕", category: "Food + Chill",
    costMin: 35, costMax: 50, crossBorder: false,
    spendBand: {
      min: 35, max: 50,
      source: "merchant-confirmed",
      lastUpdated: "2 days ago",
      confidenceLevel: "high",
    },
    netsMerchantScore: 90, merchantCount: 60,
    confidence: 88,
    tags: ["Food", "Chill"],
    description: "Boutique cafes and street art along Haji Lane",
  },
  {
    id: "a3", name: "Cafe Hopping", emoji: "🥐", category: "Food + Chill",
    costMin: 30, costMax: 45, crossBorder: false,
    spendBand: {
      min: 30, max: 45,
      source: "organiser-estimate",
      lastUpdated: "5 days ago",
      confidenceLevel: "moderate",
      exclusions: "Organiser estimate based on typical orders",
    },
    netsMerchantScore: 88, merchantCount: 75,
    confidence: 86,
    tags: ["Food", "Chill"],
    description: "IG-worthy cafes around Tiong Bahru and Dempsey",
  },
  {
    id: "a4", name: "Movie Night", emoji: "🎬", category: "Entertainment",
    costMin: 20, costMax: 35, crossBorder: false,
    spendBand: {
      min: 20, max: 35,
      source: "merchant-confirmed",
      lastUpdated: "Today",
      confidenceLevel: "high",
      exclusions: "Popcorn and drinks sold separately",
    },
    netsMerchantScore: 95, merchantCount: 40,
    confidence: 87,
    tags: ["Entertainment", "Chill"],
    description: "Latest releases plus snacks at the cineplex",
  },
  {
    id: "a5", name: "Board Game Cafe", emoji: "🎲", category: "Entertainment + Chill",
    costMin: 15, costMax: 30, crossBorder: false,
    spendBand: {
      min: 15, max: 30,
      source: "merchant-confirmed",
      lastUpdated: "1 day ago",
      confidenceLevel: "high",
    },
    netsMerchantScore: 90, merchantCount: 25,
    confidence: 89,
    tags: ["Entertainment", "Chill"],
    description: "Unlimited board games with drinks and bites",
  },
  {
    id: "a6", name: "Night Cycling", emoji: "🚲", category: "Sports + Adventure",
    costMin: 15, costMax: 30, crossBorder: false,
    spendBand: {
      min: 15, max: 30,
      source: "organiser-estimate",
      lastUpdated: "7 days ago",
      confidenceLevel: "moderate",
      exclusions: "Bike rental + supper — prices vary by rental shop",
    },
    netsMerchantScore: 82, merchantCount: 30,
    confidence: 92,
    tags: ["Sports", "Adventure", "Chill"],
    description: "East Coast Park ride with a supper stop after",
  },
  {
    id: "a7", name: "Local Supper Trail", emoji: "🍢", category: "Food + Nightlife",
    costMin: 15, costMax: 30, crossBorder: false,
    spendBand: {
      min: 15, max: 30,
      source: "nets-insights",
      lastUpdated: "3 days ago",
      confidenceLevel: "moderate",
      exclusions: "Based on typical transaction ranges — per-person spend may vary",
    },
    netsMerchantScore: 80, merchantCount: 120,
    confidence: 85,
    tags: ["Food", "Nightlife"],
    description: "Late-night hawker and zi char supper crawl",
  },
  {
    id: "a8", name: "KSL Shopping", emoji: "🛍️", category: "Shopping + Travel",
    costMin: 50, costMax: 70, crossBorder: true,
    spendBand: {
      min: 50, max: 70,
      source: "organiser-estimate",
      lastUpdated: "2 days ago",
      confidenceLevel: "low",
      exclusions: "Personal shopping not included — this is transport + food only",
    },
    netsMerchantScore: 88, merchantCount: 110,
    confidence: 84,
    tags: ["Shopping", "Travel"],
    description: "Cross-border retail and cafe day at KSL City",
  },
  {
    id: "a9", name: "Escape Room", emoji: "🔐", category: "Entertainment",
    costMin: 55, costMax: 80, crossBorder: false,
    spendBand: {
      min: 55, max: 80,
      source: "merchant-confirmed",
      lastUpdated: "4 days ago",
      confidenceLevel: "high",
      exclusions: "Standard 60-min room for 4 pax",
    },
    netsMerchantScore: 58, merchantCount: 12,
    confidence: 72,
    tags: ["Entertainment", "Adventure"],
    description: "Team puzzle rooms — higher cost range, fewer NETS merchants nearby",
  },
  {
    id: "a10", name: "Staycation", emoji: "🏨", category: "Travel + Chill",
    costMin: 120, costMax: 180, crossBorder: false,
    spendBand: {
      min: 120, max: 180,
      source: "nets-insights",
      lastUpdated: "1 week ago",
      confidenceLevel: "low",
      exclusions: "Based on transaction-level data — someone may have paid for the whole room",
    },
    netsMerchantScore: 70, merchantCount: 20,
    confidence: 38,
    tags: ["Travel", "Chill"],
    description: "Hotel staycation with a higher upfront contribution",
  },
]

// ─── Spend Band source display helpers ───────────────────────────────────────

export function spendBandSourceLabel(source: SpendBandSource): string {
  if (source === "merchant-confirmed") return "Merchant-confirmed"
  if (source === "nets-insights") return "NETS transaction insights"
  return "Entered by organiser"
}

export function spendBandSourceNote(source: SpendBandSource): string {
  if (source === "merchant-confirmed") return "Pricing provided directly by the merchant."
  if (source === "nets-insights") return "Based on anonymised NETS transaction patterns at this merchant."
  return "Not independently verified — entered by the organiser."
}

// ─── Circle Confidence scoring (retained for Experience Match ranking) ────────

export const PROFILE_RANGES: Record<ComfortProfile, { min: number; max: number; stretch: number }> = {
  "easy-going": { min: 0, max: 30, stretch: 45 },
  "balanced": { min: 30, max: 80, stretch: 100 },
  "experience-first": { min: 80, max: 150, stretch: 180 },
}

function costFitPenalty(mid: number, range: { max: number; stretch: number }): number {
  if (mid <= range.max) return 0
  if (mid <= range.stretch) return -7
  return -18
}

export function computeConfidencePercent(
  activity: Activity,
  profile: ComfortProfile,
  _groupSize: number
): number {
  const mid = (activity.costMin + activity.costMax) / 2
  const adj =
    costFitPenalty(mid, PROFILE_RANGES[profile]) -
    costFitPenalty(mid, PROFILE_RANGES["balanced"])
  return Math.min(97, Math.max(30, Math.round(activity.confidence + adj)))
}

export function confidenceLabel(pct: number): ConfidenceLevel {
  if (pct >= 75) return "high"
  if (pct >= 50) return "moderate"
  return "low"
}

export function confidenceColor(pct: number): string {
  if (pct >= 75) return "var(--nets-green)"
  if (pct >= 50) return "#d97706"
  return "var(--nets-red)"
}
