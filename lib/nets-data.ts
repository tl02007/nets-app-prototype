// Shared dummy data for the NETS prototype (Singapore context)

export type TxnType = "in" | "out"

export type Transaction = {
  id: string
  merchant: string
  category: string
  amount: number
  type: TxnType
  date: string
  icon: string // emoji-free: we map to color + initial
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
  {
    id: "t1",
    merchant: "Kopitiam @ Tampines",
    category: "Food & Drink",
    amount: 8.4,
    type: "out",
    date: "Today, 12:42",
    icon: "K",
    color: "var(--nets-red)",
  },
  {
    id: "t2",
    merchant: "FairPrice Finest",
    category: "Groceries",
    amount: 53.15,
    type: "out",
    date: "Today, 09:10",
    icon: "F",
    color: "var(--nets-navy)",
  },
  {
    id: "t3",
    merchant: "ComfortDelGro",
    category: "Transport",
    amount: 14.8,
    type: "out",
    date: "Yesterday, 19:55",
    icon: "C",
    color: "var(--nets-blue)",
  },
  {
    id: "t4",
    merchant: "Circle: JB Day Trip",
    category: "Settlement",
    amount: 42.0,
    type: "in",
    date: "Yesterday, 18:20",
    icon: "JB",
    color: "var(--nets-green)",
  },
  {
    id: "t5",
    merchant: "EZ-Link Top Up",
    category: "Transport",
    amount: 20.0,
    type: "out",
    date: "Mon, 08:30",
    icon: "EZ",
    color: "var(--nets-blue)",
  },
  {
    id: "t6",
    merchant: "Salary — Acme Pte Ltd",
    category: "Income",
    amount: 4200.0,
    type: "in",
    date: "1 Jun, 00:01",
    icon: "$",
    color: "var(--nets-green)",
  },
  {
    id: "t7",
    merchant: "Don Don Donki",
    category: "Shopping",
    amount: 36.9,
    type: "out",
    date: "31 May, 21:14",
    icon: "D",
    color: "var(--nets-red)",
  },
]

export const promos = [
  {
    id: "p1",
    title: "5% cashback at FairPrice",
    subtitle: "Pay with NETS this weekend",
    bg: "var(--nets-navy)",
  },
  {
    id: "p2",
    title: "No top-up fees",
    subtitle: "Add your DBS / OCBC / UOB card",
    bg: "var(--nets-blue)",
  },
  {
    id: "p3",
    title: "Plan your next outing",
    subtitle: "Try NETS Circle with friends",
    bg: "var(--nets-red)",
  },
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

export type Circle = {
  id: string
  name: string
  emoji: string // used only as decorative label text, not as an icon
  cover: string
  status: "planning" | "active" | "settled"
  date: string
  members: CircleMember[]
  expenses: CircleExpense[]
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
    members: [
      { ...friends.alex, paid: 86.0 },
      { ...friends.bryan, paid: 120.0 },
      { ...friends.cheryl, paid: 34.0 },
      { ...friends.dinesh, paid: 0 },
    ],
    expenses: [
      {
        id: "e1",
        title: "Petrol — Caltex",
        merchant: "Caltex Woodlands",
        category: "Transport",
        amount: 60.0,
        paidById: "bryan",
        time: "08:15",
      },
      {
        id: "e2",
        title: "Brunch",
        merchant: "Hailam Kopitiam JB",
        category: "Food & Drink",
        amount: 48.0,
        paidById: "alex",
        time: "10:40",
      },
      {
        id: "e3",
        title: "Groceries",
        merchant: "AEON Tebrau",
        category: "Shopping",
        amount: 60.0,
        paidById: "bryan",
        time: "13:20",
      },
      {
        id: "e4",
        title: "Bubble tea",
        merchant: "Tealive",
        category: "Food & Drink",
        amount: 34.0,
        paidById: "cheryl",
        time: "15:05",
      },
      {
        id: "e5",
        title: "Massage",
        merchant: "Thai Odyssey",
        category: "Wellness",
        amount: 38.0,
        paidById: "alex",
        time: "16:30",
      },
    ],
  },
  {
    id: "c2",
    name: "Cheryl's Birthday Dinner",
    emoji: "Celebration",
    cover: "var(--nets-red)",
    status: "settled",
    date: "Last week",
    members: [
      { ...friends.alex, paid: 0 },
      { ...friends.bryan, paid: 0 },
      { ...friends.cheryl, paid: 168.0 },
      { ...friends.dinesh, paid: 0 },
    ],
    expenses: [
      {
        id: "e1",
        title: "Dinner",
        merchant: "Marche Mövenpick",
        category: "Food & Drink",
        amount: 132.0,
        paidById: "cheryl",
        time: "19:30",
      },
      {
        id: "e2",
        title: "Cake",
        merchant: "Awfully Chocolate",
        category: "Food & Drink",
        amount: 36.0,
        paidById: "cheryl",
        time: "20:45",
      },
    ],
  },
  {
    id: "c3",
    name: "Bangkok 2026",
    emoji: "Holiday",
    cover: "var(--nets-blue)",
    status: "planning",
    date: "In 3 weeks",
    members: [
      { ...friends.alex, paid: 0 },
      { ...friends.bryan, paid: 0 },
      { ...friends.cheryl, paid: 0 },
    ],
    expenses: [],
  },
]

export const circleRecommendations = [
  {
    id: "r1",
    title: "Jumbo Seafood — Riverside",
    tag: "Group favourite",
    meta: "Seafood · $$ · 4.6★",
    color: "var(--nets-red)",
  },
  {
    id: "r2",
    title: "Sentosa Cable Car Bundle",
    tag: "Trending",
    meta: "Activity · $$ · 4.8★",
    color: "var(--nets-navy)",
  },
  {
    id: "r3",
    title: "PS.Cafe Dempsey",
    tag: "Matches your taste",
    meta: "Café · $$ · 4.5★",
    color: "var(--nets-green)",
  },
]

export function circleTotal(c: Circle) {
  return c.expenses.reduce((s, e) => s + e.amount, 0)
}

export function perHead(c: Circle) {
  const total = circleTotal(c)
  return c.members.length ? total / c.members.length : 0
}

export type Settlement = { fromId: string; toId: string; amount: number }

// Greedy debt simplification for one-tap settlement
export function computeSettlements(c: Circle): Settlement[] {
  const share = perHead(c)
  const balances = c.members.map((m) => ({ id: m.id, bal: m.paid - share }))
  const debtors = balances.filter((b) => b.bal < -0.01).sort((a, b) => a.bal - b.bal)
  const creditors = balances.filter((b) => b.bal > 0.01).sort((a, b) => b.bal - a.bal)
  const res: Settlement[] = []
  let i = 0
  let j = 0
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
