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
  participants?: string[] // who split this item; empty = all members
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
// The app never says "Cheryl can't afford bowling" — it says
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

// ─── Trip Wallet (retained from V1 — not in V2 core concept, kept for demo) ──

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

export type WalletSupport = "full" | "partial" | "none"

// ─── Collaborative Idea Submission + Voting (concept doc §1.7) ───────────────

export type IdeaVoteScore = 1 | 2 | 3  // 1 = Not for me, 2 = Could work, 3 = Love it!

export type IdeaVote = {
  memberId: string
  score: IdeaVoteScore
}

export type CircleIdea = {
  id: string
  submittedById: string
  title: string
  category: string
  description?: string
  estimatedMin: number
  estimatedMax: number
  reviewScore: number    // out of 5.0
  reviewCount: number
  isCircleReady: boolean
  circleReadyDiscount?: number  // % discount if Circle-Ready
  netsMerchantScore: number     // 0–100 NETS acceptance score
  votes: IdeaVote[]
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
  tripWalletSupport: WalletSupport
  suggestedWallet: number
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
  // V2: User's declared commitment amount (dollar, never shared with others) — concept doc §1.3
  myCommitmentAmount?: number
  activityType: string
  costBreakdown: { label: string; amount: number }[]
  // Smart Participation alternatives (legacy — kept for backward compat)
  alternatives?: { title: string; description: string; saving: number; savingLabel: string }[]
  comfortProfile?: ComfortProfile
  interestTags?: string[]
  tripWallet?: TripWallet
}

// ─── Friend profiles ──────────────────────────────────────────────────────────

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
    // V2: Spend Band with merchant-confirmed data
    spendBand: {
      min: 70, max: 90,
      source: "merchant-confirmed",
      lastUpdated: "Today",
      confidenceLevel: "high",
      exclusions: "Excludes personal shopping"
    },
    coreActivities: ["Transport (petrol + tolls)", "Food & drinks"],
    optionalActivities: ["Shopping", "Massage"],
    circleConfidence: "high",
    checkOutcome: "circle-ready",
    myAffordabilitySignal: "within",
    myCommitmentAmount: 90,
    costBreakdown: [
      { label: "Transport (petrol + tolls)", amount: 20 },
      { label: "Food & drinks", amount: 35 },
      { label: "Shopping", amount: 20 },
      { label: "Miscellaneous", amount: 5 },
    ],
    comfortProfile: "balanced",
    members: [
      { ...friends.alex, paid: 0 },
      { ...friends.bryan, paid: 240.0 },
      { ...friends.cheryl, paid: 0 },
      { ...friends.dinesh, paid: 0 },
    ],
    expenses: [
      { id: "e1", title: "Petrol — Caltex", merchant: "Caltex Woodlands", category: "Transport", amount: 60.0, paidById: "bryan", time: "08:15" },
      { id: "e2", title: "Brunch", merchant: "Hailam Kopitiam JB", category: "Food & Drink", amount: 48.0, paidById: "bryan", time: "10:40" },
      { id: "e3", title: "Groceries", merchant: "AEON Tebrau", category: "Shopping", amount: 60.0, paidById: "bryan", time: "13:20" },
      { id: "e4", title: "Bubble tea", merchant: "Tealive", category: "Food & Drink", amount: 34.0, paidById: "bryan", time: "15:05" },
      { id: "e5", title: "Massage", merchant: "Thai Odyssey", category: "Wellness", amount: 38.0, paidById: "bryan", time: "16:30" },
    ],
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
    spendBand: {
      min: 38, max: 48,
      source: "merchant-confirmed",
      lastUpdated: "Last week",
      confidenceLevel: "high",
    },
    coreActivities: ["Dinner", "Birthday cake"],
    circleConfidence: "high",
    checkOutcome: "circle-ready",
    myAffordabilitySignal: "within",
    myCommitmentAmount: 50,
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
    spendBand: {
      min: 380, max: 460,
      source: "organiser-estimate",
      lastUpdated: "5 days ago",
      confidenceLevel: "low",
      exclusions: "Excludes activities and shopping — personal discretionary spend",
    },
    coreActivities: ["Flights", "Hotel (3 nights)", "Daily food & drinks"],
    optionalActivities: ["Activities", "Day tours"],
    circleConfidence: "moderate",
    checkOutcome: "adjust-plan",
    // V2: dynamic negotiation options (concept doc §1.5) — privacy-framed adjustments
    negotiationOptions: [
      {
        id: "n1",
        label: "Budget airline + guesthouse",
        type: "change-merchant",
        newSpendBand: { min: 280, max: 340 },
      },
      {
        id: "n2",
        label: "Make activities optional",
        type: "make-optional",
        newSpendBand: { min: 335, max: 390 },
      },
      {
        id: "n3",
        label: "4-night stay instead (better value)",
        type: "fixed-price-package",
        newSpendBand: { min: 340, max: 400 },
      },
    ],
    // V2: Circle-Ready Offers from participating merchants (concept doc §1.6)
    circleReadyOffers: [
      {
        id: "o1",
        merchantName: "Scoot × Agoda Bundle",
        tag: "bundle",
        items: [
          { label: "Return flight (Scoot)", amount: 140 },
          { label: "Hotel 3 nights (Agoda)", amount: 180 },
        ],
        combinedMin: 320,
        combinedMax: 360,
      },
    ],
    myAffordabilitySignal: "within",
    myCommitmentAmount: 350,
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
    spendBand: {
      min: 300, max: 340,
      source: "merchant-confirmed",
      lastUpdated: "Today",
      confidenceLevel: "high",
      exclusions: "Cat 1 tickets only — Cat 3/4 available at lower price points",
    },
    coreActivities: ["Tickets (Cat 1)", "Transport"],
    optionalActivities: ["Food & merch"],
    circleConfidence: "low",
    checkOutcome: "not-aligned",
    // V2: negotiation options that could bring this into alignment
    negotiationOptions: [
      {
        id: "n1",
        label: "Switch to Cat 3 seating",
        type: "change-merchant",
        newSpendBand: { min: 160, max: 185 },
      },
      {
        id: "n2",
        label: "Cat 4 + standing area",
        type: "reduce-activity",
        newSpendBand: { min: 110, max: 130 },
      },
    ],
    // V2: a Circle-Ready Offer available for this experience
    circleReadyOffers: [
      {
        id: "o1",
        merchantName: "SISTIC Group Bundle",
        tag: "group-set",
        items: [
          { label: "Cat 3 tickets × 4 (group rate)", amount: 155 },
          { label: "Combined transport (group Grab)", amount: 10 },
        ],
        combinedMin: 160,
        combinedMax: 175,
      },
    ],
    myAffordabilitySignal: "within",
    myCommitmentAmount: 150,
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
    ],
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
    netsMerchantScore: 92, merchantCount: 140, tripWalletSupport: "full",
    suggestedWallet: 50, confidence: 91,
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
    netsMerchantScore: 90, merchantCount: 60, tripWalletSupport: "full",
    suggestedWallet: 45, confidence: 88,
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
    netsMerchantScore: 88, merchantCount: 75, tripWalletSupport: "full",
    suggestedWallet: 40, confidence: 86,
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
    netsMerchantScore: 95, merchantCount: 40, tripWalletSupport: "full",
    suggestedWallet: 30, confidence: 87,
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
    netsMerchantScore: 90, merchantCount: 25, tripWalletSupport: "full",
    suggestedWallet: 25, confidence: 89,
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
    netsMerchantScore: 82, merchantCount: 30, tripWalletSupport: "full",
    suggestedWallet: 25, confidence: 92,
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
    netsMerchantScore: 80, merchantCount: 120, tripWalletSupport: "full",
    suggestedWallet: 25, confidence: 85,
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
    netsMerchantScore: 88, merchantCount: 110, tripWalletSupport: "full",
    suggestedWallet: 60, confidence: 84,
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
    netsMerchantScore: 58, merchantCount: 12, tripWalletSupport: "partial",
    suggestedWallet: 65, confidence: 72,
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
    netsMerchantScore: 70, merchantCount: 20, tripWalletSupport: "partial",
    suggestedWallet: 150, confidence: 38,
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
