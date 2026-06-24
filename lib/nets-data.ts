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

export type Activity = {
  id: string
  name: string
  emoji: string
  costMin: number
  costMax: number
  netsMerchantScore: number
  tripWalletSupported: boolean
  crossBorder: boolean
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
      { ...friends.alex, paid: 86.0 },
      { ...friends.bryan, paid: 120.0 },
      { ...friends.cheryl, paid: 34.0 },
      { ...friends.dinesh, paid: 0 },
    ],
    expenses: [
      { id: "e1", title: "Petrol — Caltex", merchant: "Caltex Woodlands", category: "Transport", amount: 60.0, paidById: "bryan", time: "08:15" },
      { id: "e2", title: "Brunch", merchant: "Hailam Kopitiam JB", category: "Food & Drink", amount: 48.0, paidById: "alex", time: "10:40" },
      { id: "e3", title: "Groceries", merchant: "AEON Tebrau", category: "Shopping", amount: 60.0, paidById: "bryan", time: "13:20" },
      { id: "e4", title: "Bubble tea", merchant: "Tealive", category: "Food & Drink", amount: 34.0, paidById: "cheryl", time: "15:05" },
      { id: "e5", title: "Massage", merchant: "Thai Odyssey", category: "Wellness", amount: 38.0, paidById: "alex", time: "16:30" },
    ],
    tripWallet: {
      target: 320,
      perPerson: 80,
      balance: 152,
      contributions: [
        { memberId: "alex", contributed: true },
        { memberId: "bryan", contributed: true },
        { memberId: "cheryl", contributed: true },
        { memberId: "dinesh", contributed: true },
      ],
      transactions: [
        { id: "w1", description: "Petrol", merchant: "Caltex Woodlands", amount: 60, time: "08:15", splitWith: ["alex", "bryan", "cheryl", "dinesh"] },
        { id: "w2", description: "Brunch", merchant: "Hailam Kopitiam JB", amount: 48, time: "10:40", splitWith: ["alex", "bryan", "cheryl", "dinesh"] },
        { id: "w3", description: "Groceries", merchant: "AEON Tebrau", amount: 60, time: "13:20", splitWith: ["alex", "bryan", "cheryl", "dinesh"] },
      ],
    },
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
    message: "Most participants are likely comfortable with the expected spending.",
    icon: "✓",
  }
  if (level === "moderate") return {
    label: "Moderate Confidence",
    color: "#d97706",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    message: "Some participants may face affordability concerns. Consider a lower-cost option.",
    icon: "~",
  }
  return {
    label: "Low Confidence",
    color: "var(--nets-red)",
    bg: "bg-nets-red/10",
    text: "text-nets-red",
    border: "border-nets-red/20",
    message: "The activity may exceed the typical spending comfort range of several participants.",
    icon: "!",
  }
}

export function affordabilityMessage(signal: Circle["myAffordabilitySignal"]) {
  if (signal === "within") return "This activity falls within your typical weekend spending range."
  if (signal === "stretch") return "This activity is slightly above your usual spending pattern. You might want to budget ahead."
  return "This activity may significantly exceed your usual spending pattern."
}

// ─── Activity Database (Experience Match™) ───────────────────────────────────

export const activities: Activity[] = [
  {
    id: "a1",
    name: "JB Food Trail",
    emoji: "🍜",
    costMin: 30,
    costMax: 60,
    netsMerchantScore: 72,
    tripWalletSupported: true,
    crossBorder: true,
    tags: ["Food", "Travel", "Adventure"],
    description: "Day trip across the causeway for hawker food and desserts",
  },
  {
    id: "a2",
    name: "Café Hopping",
    emoji: "☕",
    costMin: 20,
    costMax: 35,
    netsMerchantScore: 88,
    tripWalletSupported: true,
    crossBorder: false,
    tags: ["Food", "Chill"],
    description: "Hit 3–4 IG-worthy cafés in Tiong Bahru or Dempsey",
  },
  {
    id: "a3",
    name: "Escape Room",
    emoji: "🔐",
    costMin: 35,
    costMax: 55,
    netsMerchantScore: 91,
    tripWalletSupported: true,
    crossBorder: false,
    tags: ["Entertainment", "Adventure"],
    description: "Team-based puzzle rooms across 3 venues in the city",
  },
  {
    id: "a4",
    name: "Night Safari + Eats",
    emoji: "🦁",
    costMin: 80,
    costMax: 120,
    netsMerchantScore: 96,
    tripWalletSupported: true,
    crossBorder: false,
    tags: ["Entertainment", "Food", "Travel"],
    description: "Night Safari admission + riverside dinner at Mandai",
  },
  {
    id: "a5",
    name: "Sentosa Beach Day",
    emoji: "🏖️",
    costMin: 50,
    costMax: 90,
    netsMerchantScore: 93,
    tripWalletSupported: true,
    crossBorder: false,
    tags: ["Chill", "Adventure"],
    description: "Siloso Beach, cable car, sunset at Tanjong Beach Club",
  },
  {
    id: "a6",
    name: "Pokémon GO Community",
    emoji: "🎮",
    costMin: 5,
    costMax: 20,
    netsMerchantScore: 38,
    tripWalletSupported: false,
    crossBorder: false,
    tags: ["Entertainment", "Chill"],
    description: "Monthly community day at Bishan Park or East Coast",
  },
  {
    id: "a7",
    name: "Hawker Supper Crawl",
    emoji: "🍢",
    costMin: 15,
    costMax: 30,
    netsMerchantScore: 35,
    tripWalletSupported: false,
    crossBorder: false,
    tags: ["Food", "Nightlife"],
    description: "Late-night tour of Singapore's best supper hawker spots",
  },
  {
    id: "a8",
    name: "Bowling + Arcade",
    emoji: "🎳",
    costMin: 30,
    costMax: 50,
    netsMerchantScore: 89,
    tripWalletSupported: true,
    crossBorder: false,
    tags: ["Entertainment", "Sports"],
    description: "Multiple lanes at Orchid Bowl + arcade credits at Timezone",
  },
  {
    id: "a9",
    name: "Art Exhibition + Hi-Tea",
    emoji: "🎨",
    costMin: 45,
    costMax: 80,
    netsMerchantScore: 94,
    tripWalletSupported: true,
    crossBorder: false,
    tags: ["Entertainment", "Food", "Chill"],
    description: "National Gallery + high tea at a heritage hotel",
  },
  {
    id: "a10",
    name: "Bukit Timah Hike",
    emoji: "🌿",
    costMin: 5,
    costMax: 20,
    netsMerchantScore: 18,
    tripWalletSupported: false,
    crossBorder: false,
    tags: ["Adventure", "Sports", "Chill"],
    description: "Summit hike + post-hike brunch at Beauty World hawkers",
  },
]

// ─── Circle Confidence™ scoring ──────────────────────────────────────────────

const PROFILE_RANGES: Record<ComfortProfile, { min: number; max: number }> = {
  "easy-going": { min: 0, max: 35 },
  "balanced": { min: 25, max: 80 },
  "experience-first": { min: 60, max: 150 },
}

export function computeConfidencePercent(
  activity: Activity,
  profile: ComfortProfile,
  groupSize: number
): number {
  const range = PROFILE_RANGES[profile]
  const midCost = (activity.costMin + activity.costMax) / 2
  let score = 78

  if (midCost <= range.max) score += 14
  else if (midCost <= range.max * 1.25) score -= 8
  else score -= 22

  if (midCost >= range.min) score += 3

  if (activity.netsMerchantScore >= 85) score += 6
  else if (activity.netsMerchantScore >= 60) score += 0
  else score -= 14

  if (activity.tripWalletSupported) score += 3
  if (activity.crossBorder) score -= 4
  if (groupSize >= 5) score -= 4

  return Math.min(97, Math.max(32, score))
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
