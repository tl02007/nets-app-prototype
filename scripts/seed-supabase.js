const fs = require("fs")
const path = require("path")

function loadEnv() {
  const env = {}
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return env
  const raw = fs.readFileSync(envPath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...rest] = trimmed.split("=")
    env[key] = rest.join("=").trim()
  }
  return env
}

const env = { ...process.env, ...loadEnv() }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  process.exit(1)
}

if (!SUPABASE_ANON_KEY.startsWith("eyJ")) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY looks wrong — it must be a JWT (starting with 'eyJ').\n" +
    "  Go to: https://supabase.com/dashboard/project/_/settings/api\n" +
    "  Copy the 'anon public' key and paste it into .env.local"
  )
  process.exit(1)
}

const data = {
  user: {
    id: "alex",
    name: "Alex Tan",
    first_name: "Alex",
    email: "alex.tan@gmail.com",
    handle: "+65 9123 4567",
    balance: 1284.5,
    tier: "NETS+ Gold",
    bank: "DBS •••• 8102",
  },
  transactions: [
    { id: "t1", merchant: "Kopitiam @ Tampines", category: "Food & Drink", amount: 8.4, type: "out", date: "Today, 12:42", icon: "K", color: "var(--nets-red)" },
    { id: "t2", merchant: "FairPrice Finest", category: "Groceries", amount: 53.15, type: "out", date: "Today, 09:10", icon: "F", color: "var(--nets-navy)" },
    { id: "t3", merchant: "ComfortDelGro", category: "Transport", amount: 14.8, type: "out", date: "Yesterday, 19:55", icon: "C", color: "var(--nets-blue)" },
    { id: "t4", merchant: "Circle: JB Day Trip", category: "Settlement", amount: 42.0, type: "in", date: "Yesterday, 18:20", icon: "JB", color: "var(--nets-green)" },
    { id: "t5", merchant: "EZ-Link Top Up", category: "Transport", amount: 20.0, type: "out", date: "Mon, 08:30", icon: "EZ", color: "var(--nets-blue)" },
    { id: "t6", merchant: "Salary — Acme Pte Ltd", category: "Income", amount: 4200.0, type: "in", date: "1 Jun, 00:01", icon: "$", color: "var(--nets-green)" },
    { id: "t7", merchant: "Don Don Donki", category: "Shopping", amount: 36.9, type: "out", date: "31 May, 21:14", icon: "D", color: "var(--nets-red)" },
  ],
  circles: [
    {
      id: "c1",
      name: "JB Day Trip",
      emoji: "Road trip",
      cover: "var(--nets-navy)",
      status: "active",
      date: "Today",
      activity_type: "Day trip",
      estimated_cost_per_person: 80,
      circle_confidence: "high",
      my_affordability_signal: "within",
      cost_breakdown: [
        { label: "Transport (petrol + tolls)", amount: 20 },
        { label: "Food & drinks", amount: 35 },
        { label: "Shopping", amount: 20 },
        { label: "Miscellaneous", amount: 5 },
      ],
      alternatives: null,
    },
    {
      id: "c2",
      name: "Cheryl's Birthday Dinner",
      emoji: "Celebration",
      cover: "var(--nets-red)",
      status: "settled",
      date: "Last week",
      activity_type: "Dinner",
      estimated_cost_per_person: 42,
      circle_confidence: "high",
      my_affordability_signal: "within",
      cost_breakdown: [
        { label: "Dinner", amount: 33 },
        { label: "Cake", amount: 9 },
      ],
      alternatives: null,
    },
    {
      id: "c3",
      name: "Bangkok 2026",
      emoji: "Holiday",
      cover: "var(--nets-blue)",
      status: "planning",
      date: "In 3 weeks",
      activity_type: "Overseas trip",
      estimated_cost_per_person: 420,
      circle_confidence: "moderate",
      my_affordability_signal: "within",
      cost_breakdown: [
        { label: "Flights", amount: 180 },
        { label: "Hotel (3 nights)", amount: 120 },
        { label: "Food & drinks", amount: 75 },
        { label: "Activities", amount: 45 },
      ],
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
      activity_type: "Concert",
      estimated_cost_per_person: 320,
      circle_confidence: "low",
      my_affordability_signal: "within",
      cost_breakdown: [
        { label: "Premium tickets (Cat 1)", amount: 280 },
        { label: "Transport & parking", amount: 20 },
        { label: "Food & merch", amount: 20 },
      ],
      alternatives: [
        { title: "Cat 3 seating instead", description: "Still great sightlines, same experience", saving: 150, savingLabel: "~$150 less per person" },
        { title: "Cat 4 + standing", description: "Closest to the stage energy", saving: 200, savingLabel: "~$200 less per person" },
      ],
    },
  ],
  circle_members: [
    { circle_id: "c1", member_id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)", paid: 0 },
    { circle_id: "c1", member_id: "bryan", name: "Bryan Lim", initial: "B", color: "var(--nets-navy)", paid: 240.0 },
    { circle_id: "c1", member_id: "cheryl", name: "Cheryl Ng", initial: "C", color: "var(--nets-blue)", paid: 0 },
    { circle_id: "c1", member_id: "dinesh", name: "Dinesh R.", initial: "D", color: "var(--nets-green)", paid: 0 },
    { circle_id: "c2", member_id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)", paid: 0 },
    { circle_id: "c2", member_id: "bryan", name: "Bryan Lim", initial: "B", color: "var(--nets-navy)", paid: 0 },
    { circle_id: "c2", member_id: "cheryl", name: "Cheryl Ng", initial: "C", color: "var(--nets-blue)", paid: 168.0 },
    { circle_id: "c2", member_id: "dinesh", name: "Dinesh R.", initial: "D", color: "var(--nets-green)", paid: 0 },
    { circle_id: "c3", member_id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)", paid: 0 },
    { circle_id: "c3", member_id: "bryan", name: "Bryan Lim", initial: "B", color: "var(--nets-navy)", paid: 0 },
    { circle_id: "c3", member_id: "cheryl", name: "Cheryl Ng", initial: "C", color: "var(--nets-blue)", paid: 0 },
    { circle_id: "c4", member_id: "alex", name: "Alex (You)", initial: "A", color: "var(--nets-red)", paid: 0 },
    { circle_id: "c4", member_id: "bryan", name: "Bryan Lim", initial: "B", color: "var(--nets-navy)", paid: 0 },
    { circle_id: "c4", member_id: "cheryl", name: "Cheryl Ng", initial: "C", color: "var(--nets-blue)", paid: 0 },
    { circle_id: "c4", member_id: "dinesh", name: "Dinesh R.", initial: "D", color: "var(--nets-green)", paid: 0 },
  ],
  circle_expenses: [
    { id: "e1", circle_id: "c1", title: "Petrol — Caltex", merchant: "Caltex Woodlands", category: "Transport", amount: 60.0, paid_by_id: "bryan", time: "08:15" },
    { id: "e2", circle_id: "c1", title: "Brunch", merchant: "Hailam Kopitiam JB", category: "Food & Drink", amount: 48.0, paid_by_id: "bryan", time: "10:40" },
    { id: "e3", circle_id: "c1", title: "Groceries", merchant: "AEON Tebrau", category: "Shopping", amount: 60.0, paid_by_id: "bryan", time: "13:20" },
    { id: "e4", circle_id: "c1", title: "Bubble tea", merchant: "Tealive", category: "Food & Drink", amount: 34.0, paid_by_id: "bryan", time: "15:05" },
    { id: "e5", circle_id: "c1", title: "Massage", merchant: "Thai Odyssey", category: "Wellness", amount: 38.0, paid_by_id: "bryan", time: "16:30" },
    { id: "e1-c2", circle_id: "c2", title: "Dinner", merchant: "Marche Mövenpick", category: "Food & Drink", amount: 132.0, paid_by_id: "cheryl", time: "19:30" },
    { id: "e2-c2", circle_id: "c2", title: "Cake", merchant: "Awfully Chocolate", category: "Food & Drink", amount: 36.0, paid_by_id: "cheryl", time: "20:45" },
  ],
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log("Seeding Supabase tables...")

  await supabase.from("users").upsert(data.user)
  console.log("- users OK")

  await supabase.from("transactions").upsert(data.transactions)
  console.log("- transactions OK")

  await supabase.from("circles").upsert(data.circles)
  console.log("- circles OK")

  await supabase.from("circle_members").upsert(data.circle_members)
  console.log("- circle_members OK")

  await supabase.from("circle_expenses").upsert(data.circle_expenses)
  console.log("- circle_expenses OK")

  console.log("Seed complete. Restart your dev server.")
}

main().catch((error) => {
  console.error("Seed failed:", error)
  process.exit(1)
})
