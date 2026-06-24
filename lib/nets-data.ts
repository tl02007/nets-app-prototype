// Shared dummy data for the NETS Circle prototype (Singapore context)

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
  name: "Alex Tan",
  firstName: "Alex",
  email: "alex.tan@gmail.com",
  handle: "+65 9123 4567",
  balance: 1284.5,
  tier: "NETS+ Gold",
  bank: "DBS •••• 8102",
}

export const transactions: Transaction[] = [
  { id: "t1", merchant: "Kopitiam @ Tampines", category: "Food & Drink", amount: 8.4, type: "out", date: "Today, 12:42", icon: "K", color: "var(--nets-red)" },
  { id: "t2", merchant: "FairPrice Finest", category: "Groceries", amount: 53.15, type: "out", date: "Today, 09:10", icon: "F", color: "var(--nets-navy)" },
  { id: "t3", merchant: "ComfortDelGro", category: "Transport", amount: 14.8, type: "out", date: "Yesterday, 19:55", icon: "C", color: "var(--nets-blue)" },
  { id: "t4", merchant: "Circle: JB Day Trip", category: "Settlement", amount: 42.0, type: "in", date: "Yesterday, 18:20", icon: "JB", color: "var(--nets-green)" },
  { id: "t5", merchant: "EZ-Link Top Up", category: "Transport", amount: 20.0, type: "out", date: "Mon, 08:30", icon: "EZ", color: "var(--nets-blue)" },
  { id: "t6", merchant: "Salary — Acme Pte Ltd", category: "Income", amount: 4200.0, type: "in", date: "1 Jun, 00:01", icon: "$", color: "var(--nets-green)" },
  { id: "t7", merchant: "Don Don Donki", category: "Shopping", amount: 36.9, type: "out", date: "31 May, 21:14", icon: "D", color: "var(--nets-red)" },
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

export type CircleExpense = {
  id: string
  title: string
  merchant: string
  category: string
  amount: number
  paidById: string
  time: string
}

// Circle Confidence is a group-level signal (no individual finances exposed)
export type ConfidenceLevel = "high" | "moderate" | "low"

export type ComfortProfile = "easy-going" | "balanced" | "experience-first"

export type TripWalletTransaction = {
  id: string
  description: string
  merchant: string
  amount: number
  time: string
  splitWith: string[]
}

export type TripWallet = {
  target: number
  perPerson: number
  balance: number
  contributions: { memberId: string; contributed: boolean }[]
  transactions: TripWalletTransaction[]
}

// Per the concept doc, each Experience Match activity carries: category,
// estimated cost range, local/cross-border status, NETS acceptance score,
// merchant count, Trip Wallet support and a suggested wallet amount.
export type WalletSupport = "full" | "partial" | "none"

export type Activity = {
  id: string
  name: string
  emoji: string
  category: string
  costMin: number
  costMax: number
  crossBorder: boolean
  netsMerchantScore: number // NETS acceptance score (0–100)
  merchantCount: number // nearby NETS-accepting merchants
  tripWalletSupport: WalletSupport
  suggestedWallet: number // suggested per-person wallet contribution
  confidence: number // documented group Circle Confidence at Balanced/"Moderate" comfort
  tags: string[]
  description: string
}

export type Circle = {
  id: string
  name: string
  emoji: string
  cover: string
  status: "planning" | "active" | "settled"
  date: string
  members: CircleMember[]
  expenses: CircleExpense[]
  // Social Affordability Confidence data
  estimatedCostPerPerson: number
  circleConfidence: ConfidenceLevel
  // Private per-user affordability signal (only the current user sees this)
  myAffordabilitySignal: "within" | "stretch" | "above"
  activityType: string
  costBreakdown: { label: string; amount: number }[]
  // Smart Participation alternatives (shown when confidence is moderate/low)
  alternatives?: { title: string; description: string; saving: number; savingLabel: string }[]
  // NETSCircle Final features
  comfortProfile?: ComfortProfile
  interestTags?: string[]
  tripWallet?: TripWallet
}

const friends = {
  alex: { id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)" },
  bryan: { id: "bryan", name: "Bryan Lim", initial: "B", color: "var(--nets-navy)" },
  cheryl: { id: "cheryl", name: "Cheryl Ng", initial: "C", color: "var(--nets-blue)" },
  dinesh: { id: "dinesh", name: "Dinesh R.", initial: "D", color: "var(--nets-green)" },
}

export const circles: Circle[] = [
  {
    id: "c1",
    name: "JB Day Trip",
    emoji: "Road trip",
    cover: "var(--nets-navy)",
    status: "active",
    date: "Today",
    activityType: "Day trip",
    estimatedCostPerPerson: 80,
    circleConfidence: "high",
    myAffordabilitySignal: "within",
    costBreakdown: [
      { label: "Transport (petrol + tolls)", amount: 20 },
      { label: "Food & drinks", amount: 35 },
      { label: "Shopping", amount: 20 },
      { label: "Miscellaneous", amount: 5 },
    ],
    comfortProfile: "balanced",
    members: [
      { ...friends.alex, paid: 0 },     // Alex hasn't settled yet → owes $60 → triggers eNETS
      { ...friends.bryan, paid: 240.0 }, // Bryan fronted expenses → creditor
      { ...friends.cheryl, paid: 0 },
      { ...friends.dinesh, paid: 0 },
    ],
    // Bryan fronted the whole JB trip ($240 total). member.paid reflects this:
    // Bryan = 240, everyone else = 0. perHead = 60, so Alex/Cheryl/Dinesh each
    // owe Bryan $60 — Alex settles his $60 share via eNETS.
    expenses: [
      { id: "e1", title: "Petrol — Caltex", merchant: "Caltex Woodlands", category: "Transport", amount: 60.0, paidById: "bryan", time: "08:15" },
      { id: "e2", title: "Brunch", merchant: "Hailam Kopitiam JB", category: "Food & Drink", amount: 48.0, paidById: "bryan", time: "10:40" },
      { id: "e3", title: "Groceries", merchant: "AEON Tebrau", category: "Shopping", amount: 60.0, paidById: "bryan", time: "13:20" },
      { id: "e4", title: "Bubble tea", merchant: "Tealive", category: "Food & Drink", amount: 34.0, paidById: "bryan", time: "15:05" },
      { id: "e5", title: "Massage", merchant: "Thai Odyssey", category: "Wellness", amount: 38.0, paidById: "bryan", time: "16:30" },
    ],
    // No Trip Wallet on c1: it uses the "Bryan fronted, settle via eNETS" model.
    // The Trip Wallet feature is showcased through the new-circle creation flow.
  },
  {
    id: "c2",
    name: "Cheryl's Birthday Dinner",
    emoji: "Celebration",
    cover: "var(--nets-red)",
    status: "settled",
    date: "Last week",
    activityType: "Dinner",
    estimatedCostPerPerson: 42,
    circleConfidence: "high",
    myAffordabilitySignal: "within",
    costBreakdown: [
      { label: "Dinner", amount: 33 },
      { label: "Cake", amount: 9 },
    ],
    members: [
      { ...friends.alex, paid: 0 },
      { ...friends.bryan, paid: 0 },
      { ...friends.cheryl, paid: 168.0 },
      { ...friends.dinesh, paid: 0 },
    ],
    expenses: [
      { id: "e1", title: "Dinner", merchant: "Marche Mövenpick", category: "Food & Drink", amount: 132.0, paidById: "cheryl", time: "19:30" },
      { id: "e2", title: "Cake", merchant: "Awfully Chocolate", category: "Food & Drink", amount: 36.0, paidById: "cheryl", time: "20:45" },
    ],
  },
  {
    id: "c3",
    name: "Bangkok 2026",
    emoji: "Holiday",
    cover: "var(--nets-blue)",
    status: "planning",
    date: "In 3 weeks",
    activityType: "Overseas trip",
    estimatedCostPerPerson: 420,
    circleConfidence: "moderate",
    myAffordabilitySignal: "within",
    costBreakdown: [
      { label: "Flights", amount: 180 },
      { label: "Hotel (3 nights)", amount: 120 },
      { label: "Food & drinks", amount: 75 },
      { label: "Activities", amount: 45 },
    ],
    members: [
      { ...friends.alex, paid: 0 },
      { ...friends.bryan, paid: 0 },
      { ...friends.cheryl, paid: 0 },
    ],
    expenses: [],
    alternatives: [
      { title: "Budget airline + guesthouse combo", description: "AirAsia + hostel package", saving: 130, savingLabel: "~$130 less per person" },
      { title: "4-night instead of 3-night", description: "Better value, split across more nights", saving: 40, savingLabel: "~$40 less per person" },
    ],
  },
  {
    id: "c4",
    name: "Taylor Swift Concert",
    emoji: "Concert",
    cover: "#7c3aed",
    status: "planning",
    date: "Next Saturday",
    activityType: "Concert",
    estimatedCostPerPerson: 320,
    circleConfidence: "low",
    myAffordabilitySignal: "within",
    costBreakdown: [
      { label: "Premium tickets (Cat 1)", amount: 280 },
      { label: "Transport & parking", amount: 20 },
      { label: "Food & merch", amount: 20 },
    ],
    members: [
      { ...friends.alex, paid: 0 },
      { ...friends.bryan, paid: 0 },
      { ...friends.cheryl, paid: 0 },
      { ...friends.dinesh, paid: 0 },
    ],
    expenses: [],
    alternatives: [
      { title: "Cat 3 seating instead", description: "Still great sightlines, same experience", saving: 150, savingLabel: "~$150 less per person" },
      { title: "Cat 4 + standing", description: "Closest to the stage energy", saving: 200, savingLabel: "~$200 less per person" },
    ],
  },
]

export const circleRecommendations = [
  { id: "r1", title: "Jumbo Seafood — Riverside", tag: "Group favourite", meta: "Seafood · $$ · 4.6★", color: "var(--nets-red)" },
  { id: "r2", title: "Sentosa Cable Car Bundle", tag: "Trending", meta: "Activity · $$ · 4.8★", color: "var(--nets-navy)" },
  { id: "r3", title: "PS.Cafe Dempsey", tag: "Matches your taste", meta: "Café · $$ · 4.5★", color: "var(--nets-green)" },
]

export function circleTotal(c: Circle) {
  return c.expenses.reduce((s, e) => s + e.amount, 0)
}

export function perHead(c: Circle) {
  const total = circleTotal(c)
  return c.members.length ? total / c.members.length : 0
}

export type Settlement = { fromId: string; toId: string; amount: number }

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
    message: "This experience may be outside the Circle's current comfort profile. Consider a lower-cost alternative.",
    icon: "!",
  }
}

// Framed around the user's DECLARED comfort profile only — never transaction
// history (concept doc, page 10: "use declared profiles only").
export function affordabilityMessage(signal: Circle["myAffordabilitySignal"]) {
  if (signal === "within") return "This experience sits within the comfort profile you selected."
  if (signal === "stretch") return "This experience is a slight stretch beyond the comfort profile you selected."
  return "This experience is above the comfort profile you selected."
}

// ─── Activity Database (Experience Match™) ───────────────────────────────────

// The fixed mock experience database from the concept doc (page 6). Confidence
// values and spend ranges are the documented figures for a Balanced/"Moderate"
// group; computeConfidencePercent shifts them only if the comfort profile differs.
export const activities: Activity[] = [
  {
    id: "a1", name: "JB Food Trail", emoji: "🍜", category: "Food + Travel",
    costMin: 45, costMax: 60, crossBorder: true,
    netsMerchantScore: 92, merchantCount: 140, tripWalletSupport: "full",
    suggestedWallet: 50, confidence: 91,
    tags: ["Food", "Travel"],
    description: "Hawker trail and dessert hop across the Causeway",
  },
  {
    id: "a2", name: "Haji Lane Cafe Hop", emoji: "☕", category: "Food + Chill",
    costMin: 35, costMax: 50, crossBorder: false,
    netsMerchantScore: 90, merchantCount: 60, tripWalletSupport: "full",
    suggestedWallet: 45, confidence: 88,
    tags: ["Food", "Chill"],
    description: "Boutique cafes and street art along Haji Lane",
  },
  {
    id: "a3", name: "Cafe Hopping", emoji: "🥐", category: "Food + Chill",
    costMin: 30, costMax: 45, crossBorder: false,
    netsMerchantScore: 88, merchantCount: 75, tripWalletSupport: "full",
    suggestedWallet: 40, confidence: 86,
    tags: ["Food", "Chill"],
    description: "IG-worthy cafes around Tiong Bahru and Dempsey",
  },
  {
    id: "a4", name: "Movie Night", emoji: "🎬", category: "Entertainment",
    costMin: 20, costMax: 35, crossBorder: false,
    netsMerchantScore: 95, merchantCount: 40, tripWalletSupport: "full",
    suggestedWallet: 30, confidence: 87,
    tags: ["Entertainment", "Chill"],
    description: "Latest releases plus snacks at the cineplex",
  },
  {
    id: "a5", name: "Board Game Cafe", emoji: "🎲", category: "Entertainment + Chill",
    costMin: 15, costMax: 30, crossBorder: false,
    netsMerchantScore: 90, merchantCount: 25, tripWalletSupport: "full",
    suggestedWallet: 25, confidence: 89,
    tags: ["Entertainment", "Chill"],
    description: "Unlimited board games with drinks and bites",
  },
  {
    id: "a6", name: "Night Cycling", emoji: "🚲", category: "Sports + Adventure",
    costMin: 15, costMax: 30, crossBorder: false,
    netsMerchantScore: 82, merchantCount: 30, tripWalletSupport: "full",
    suggestedWallet: 25, confidence: 92,
    tags: ["Sports", "Adventure", "Chill"],
    description: "East Coast Park ride with a supper stop after",
  },
  {
    id: "a7", name: "Local Supper Trail", emoji: "🍢", category: "Food + Nightlife",
    costMin: 15, costMax: 30, crossBorder: false,
    netsMerchantScore: 80, merchantCount: 120, tripWalletSupport: "full",
    suggestedWallet: 25, confidence: 85,
    tags: ["Food", "Nightlife"],
    description: "Late-night hawker and zi char supper crawl",
  },
  {
    id: "a8", name: "KSL Shopping", emoji: "🛍️", category: "Shopping + Travel",
    costMin: 50, costMax: 70, crossBorder: true,
    netsMerchantScore: 88, merchantCount: 110, tripWalletSupport: "full",
    suggestedWallet: 60, confidence: 84,
    tags: ["Shopping", "Travel"],
    description: "Cross-border retail and cafe day at KSL City",
  },
  {
    id: "a9", name: "Escape Room", emoji: "🔐", category: "Entertainment",
    costMin: 55, costMax: 80, crossBorder: false,
    netsMerchantScore: 58, merchantCount: 12, tripWalletSupport: "partial",
    suggestedWallet: 65, confidence: 72,
    tags: ["Entertainment", "Adventure"],
    description: "Team puzzle rooms — higher cost range, fewer NETS merchants nearby",
  },
  {
    id: "a10", name: "Staycation", emoji: "🏨", category: "Travel + Chill",
    costMin: 120, costMax: 180, crossBorder: false,
    netsMerchantScore: 70, merchantCount: 20, tripWalletSupport: "partial",
    suggestedWallet: 150, confidence: 38,
    tags: ["Travel", "Chill"],
    description: "Hotel staycation with a higher upfront contribution",
  },
]

// ─── Circle Confidence™ scoring ──────────────────────────────────────────────

// Comfort Profile ranges, exactly as specified in the concept doc (pages 2 & 8).
export const PROFILE_RANGES: Record<ComfortProfile, { min: number; max: number; stretch: number }> = {
  "easy-going": { min: 0, max: 30, stretch: 45 },
  "balanced": { min: 30, max: 80, stretch: 100 },
  "experience-first": { min: 80, max: 150, stretch: 180 },
}

// How far an activity's cost midpoint sits outside a comfort range.
function costFitPenalty(mid: number, range: { max: number; stretch: number }): number {
  if (mid <= range.max) return 0 // comfortable
  if (mid <= range.stretch) return -7 // soft stretch
  return -18 // outside comfort
}

// Circle Confidence is rule-based (concept doc, page 10): take the activity's
// group-level confidence (calibrated for a Balanced / "Moderate" group), then
// shift it only by how the selected comfort profile differs from Balanced. A
// Balanced group therefore sees the documented figures exactly.
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
