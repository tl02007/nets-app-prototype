"use client"

import { motion, AnimatePresence } from "motion/react"
import { useState } from "react"
import {
  Plus,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  ArrowRight,
  UserPlus,
  Receipt,
  PartyPopper,
  Share2,
  Wallet,
  Star,
} from "lucide-react"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import {
  circles,
  circleTotal,
  perHead,
  computeSettlements,
  memberName,
  circleRecommendations,
  type Circle,
} from "@/lib/nets-data"

const fmt = (n: number) =>
  n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusLabel: Record<Circle["status"], string> = {
  planning: "Planning",
  active: "Live now",
  settled: "Settled",
}

export function CircleScreen() {
  const { circleView, setCircleView, activeCircleId, openCircle } = useNav()
  const circle = circles.find((c) => c.id === activeCircleId) ?? circles[0]

  return (
    <div className="flex h-full flex-col bg-nets-page">
      <AnimatePresence mode="wait">
        {circleView === "list" && (
          <CircleList key="list" onOpen={openCircle} onCreate={() => setCircleView("create")} />
        )}
        {circleView === "create" && (
          <CircleCreate key="create" onBack={() => setCircleView("list")} onDone={() => openCircle("c1")} />
        )}
        {circleView === "detail" && (
          <CircleDetail
            key="detail"
            circle={circle}
            onBack={() => setCircleView("list")}
            onSettle={() => setCircleView("settle")}
            onRecap={() => setCircleView("recap")}
          />
        )}
        {circleView === "settle" && (
          <CircleSettle key="settle" circle={circle} onBack={() => setCircleView("detail")} onDone={() => setCircleView("recap")} />
        )}
        {circleView === "recap" && (
          <CircleRecap key="recap" circle={circle} onBack={() => setCircleView("detail")} onClose={() => setCircleView("list")} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- LIST ---------------- */
function CircleList({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <div className="px-5 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-nets-navy">NETS Circle</h1>
            <span className="rounded-full bg-nets-red/10 px-2 py-0.5 text-[10px] font-bold text-nets-red">
              NEW
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Spend together, settle in one tap</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* hero */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative overflow-hidden rounded-3xl bg-nets-red p-5 text-white shadow-lg shadow-nets-red/25"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl" />
          <Sparkles className="h-6 w-6" />
          <p className="mt-3 text-lg font-extrabold leading-snug">
            No more spreadsheets or chasing friends for money.
          </p>
          <p className="mt-1 text-sm text-white/85">
            Pay normally with NETS — we track and split everything automatically.
          </p>
          <button
            onClick={onCreate}
            className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-nets-red"
          >
            <Plus className="h-4 w-4" /> Create a Circle
          </button>
        </motion.div>

        <h2 className="mt-6 text-base font-bold text-nets-navy">Your Circles</h2>
        <div className="mt-2 space-y-3">
          {circles.map((c, i) => {
            const total = circleTotal(c)
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpen(c.id)}
                className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-sm"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundColor: c.cover }}
                >
                  <Users className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-nets-navy">{c.name}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={c.status} />
                    <span className="text-xs text-muted-foreground">{c.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-nets-navy">${fmt(total)}</p>
                  <p className="text-[11px] text-muted-foreground">{c.members.length} friends</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

function StatusPill({ status }: { status: Circle["status"] }) {
  const map: Record<Circle["status"], string> = {
    planning: "bg-nets-blue/10 text-nets-blue",
    active: "bg-nets-red/10 text-nets-red",
    settled: "bg-nets-green/10 text-nets-green",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[status]}`}>
      {statusLabel[status]}
    </span>
  )
}

/* ---------------- CREATE ---------------- */
function CircleCreate({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState("")
  const allFriends = [
    { id: "bryan", name: "Bryan Lim", color: "var(--nets-navy)" },
    { id: "cheryl", name: "Cheryl Ng", color: "var(--nets-blue)" },
    { id: "dinesh", name: "Dinesh R.", color: "var(--nets-green)" },
    { id: "elaine", name: "Elaine Koh", color: "var(--nets-red)" },
    { id: "farah", name: "Farah B.", color: "var(--nets-navy)" },
  ]
  const [selected, setSelected] = useState<string[]>(["bryan", "cheryl"])
  const presets = ["Dinner", "JB Day Trip", "Concert", "Café Hop", "Overseas Trip", "Shopping"]

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Create Circle" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <label className="text-sm font-bold text-nets-navy">What&apos;s the occasion?</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sentosa Beach Day"
          className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-nets-navy outline-none focus:border-nets-blue"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setName(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                name === p ? "bg-nets-navy text-white" : "bg-card text-nets-navy shadow-sm"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <label className="mt-6 block text-sm font-bold text-nets-navy">Invite friends</label>
        <div className="mt-2 space-y-2">
          {allFriends.map((f) => {
            const on = selected.includes(f.id)
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: f.color }}
                >
                  {f.name[0]}
                </span>
                <span className="flex-1 text-left text-sm font-semibold text-nets-navy">
                  {f.name}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    on ? "border-nets-red bg-nets-red text-white" : "border-border"
                  }`}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />}
                </span>
              </button>
            )
          })}
        </div>

        {/* Smart recommendations */}
        <div className="mt-6 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-nets-red" />
          <h3 className="text-sm font-bold text-nets-navy">Recommended for your group</h3>
        </div>
        <div className="mt-2 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {circleRecommendations.map((r) => (
            <div
              key={r.id}
              className="min-w-[62%] rounded-2xl bg-card p-3 shadow-sm"
            >
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: r.color }}
              >
                {r.tag}
              </span>
              <p className="mt-2 text-sm font-bold text-nets-navy">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.meta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={onDone}
          disabled={!name || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
        >
          Start Circle ({selected.length + 1}) <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ---------------- DETAIL ---------------- */
function CircleDetail({
  circle,
  onBack,
  onSettle,
  onRecap,
}: {
  circle: Circle
  onBack: () => void
  onSettle: () => void
  onRecap: () => void
}) {
  const total = circleTotal(circle)
  const share = perHead(circle)

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      {/* colored header */}
      <div style={{ backgroundColor: circle.cover }} className="text-white">
        <StatusBar dark />
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <StatusPill status={circle.status} />
        </div>
        <div className="px-5 pb-5 pt-2">
          <h1 className="text-2xl font-extrabold">{circle.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
            <Users className="h-4 w-4" /> {circle.members.length} friends · {circle.date}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/70">Total tracked</p>
              <p className="text-3xl font-extrabold">${fmt(total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70">Per person</p>
              <p className="text-lg font-bold">${fmt(share)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-3 flex-1 overflow-y-auto rounded-t-3xl bg-nets-page px-5 pb-28 pt-5">
        {/* members */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {circle.members.map((m) => {
            const net = m.paid - share
            return (
              <div
                key={m.id}
                className="flex min-w-[88px] flex-col items-center rounded-2xl bg-card p-3 shadow-sm"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: m.color }}
                >
                  {m.initial}
                </span>
                <p className="mt-1.5 max-w-full truncate text-[11px] font-semibold text-nets-navy">
                  {m.name.replace(" (You)", "")}
                </p>
                <p
                  className={`text-[11px] font-bold ${net >= 0 ? "text-nets-green" : "text-nets-red"}`}
                >
                  {net >= 0 ? "+" : "-"}${fmt(Math.abs(net))}
                </p>
              </div>
            )
          })}
        </div>

        {/* expenses */}
        <div className="mt-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-nets-navy">
            <Receipt className="h-4.5 w-4.5" /> Shared expenses
          </h2>
          {circle.status === "active" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-nets-green">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nets-green" />
              Auto-tracking
            </span>
          )}
        </div>

        {circle.expenses.length === 0 ? (
          <div className="mt-3 rounded-3xl bg-card p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-nets-navy">No expenses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When members pay with NETS, expenses appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-2 rounded-3xl bg-card p-2 shadow-sm">
            {circle.expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nets-navy/5 text-xs font-bold text-nets-navy">
                  {e.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-nets-navy">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.merchant} · paid by {memberName(circle, e.paidById).replace(" (You)", "You")}
                  </p>
                </div>
                <span className="text-sm font-bold text-nets-navy">${fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        {circle.status === "settled" ? (
          <button
            onClick={onRecap}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-4 text-base font-bold text-white"
          >
            <PartyPopper className="h-5 w-5" /> View Circle Recap
          </button>
        ) : (
          <button
            onClick={onSettle}
            disabled={circle.expenses.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
          >
            <Wallet className="h-5 w-5" /> Settle up · ${fmt(total)}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ---------------- SETTLE ---------------- */
function CircleSettle({
  circle,
  onBack,
  onDone,
}: {
  circle: Circle
  onBack: () => void
  onDone: () => void
}) {
  const settlements = computeSettlements(circle)
  const [paid, setPaid] = useState(false)

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="One-Tap Settlement" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="rounded-3xl bg-nets-navy p-5 text-white shadow-lg shadow-nets-navy/20">
          <p className="text-xs text-white/70">We did the math</p>
          <p className="mt-1 text-sm leading-relaxed text-white/90">
            {settlements.length} transfer{settlements.length === 1 ? "" : "s"} will settle everyone
            in <span className="font-bold text-white">{circle.name}</span>.
          </p>
        </div>

        <h2 className="mt-5 text-base font-bold text-nets-navy">Who pays whom</h2>
        <div className="mt-2 space-y-3">
          {settlements.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-sm"
            >
              <span className="text-sm font-bold text-nets-navy">
                {memberName(circle, s.fromId).replace(" (You)", "You")}
              </span>
              <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <ArrowRight className="h-4 w-4" />
                <span className="h-px flex-1 bg-border" />
              </div>
              <span className="text-sm font-bold text-nets-navy">
                {memberName(circle, s.toId).replace(" (You)", "You")}
              </span>
              <span className="ml-1 rounded-full bg-nets-red/10 px-2.5 py-1 text-sm font-extrabold text-nets-red">
                ${fmt(s.amount)}
              </span>
            </motion.div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Funds move instantly between linked NETS accounts.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => {
            setPaid(true)
            setTimeout(onDone, 1100)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
        >
          {paid ? <Check className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
          {paid ? "Settled!" : "Settle all in one tap"}
        </button>
      </div>

      <AnimatePresence>
        {paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-nets-navy/95 text-white"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green"
            >
              <Check className="h-10 w-10" />
            </motion.span>
            <p className="mt-4 text-lg font-extrabold">All settled up!</p>
            <p className="text-sm text-white/70">Generating your Circle Recap...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ---------------- RECAP ---------------- */
function CircleRecap({
  circle,
  onBack,
  onClose,
}: {
  circle: Circle
  onBack: () => void
  onClose: () => void
}) {
  const total = circleTotal(circle)
  // category breakdown
  const byCat = circle.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const catColors = ["var(--nets-red)", "var(--nets-navy)", "var(--nets-blue)", "var(--nets-green)", "var(--chart-5)"]
  const topPayer = [...circle.members].sort((a, b) => b.paid - a.paid)[0]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col bg-nets-navy text-white"
    >
      <StatusBar dark />
      <div className="flex items-center justify-between px-5 pb-2 pt-1">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Share2 className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <PartyPopper className="h-7 w-7 text-amber-300" />
          </span>
          <h1 className="mt-3 text-2xl font-extrabold">Circle Recap</h1>
          <p className="text-sm text-white/70">{circle.name} · {circle.date}</p>
        </motion.div>

        {/* big stat */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Total spent" value={`$${fmt(total)}`} />
          <Stat label="Expenses" value={`${circle.expenses.length} items`} />
          <Stat label="Friends" value={`${circle.members.length} people`} />
          <Stat label="MVP payer" value={topPayer.name.replace(" (You)", "You")} />
        </div>

        {/* breakdown */}
        <h2 className="mt-6 text-base font-bold">Where it went</h2>
        <div className="mt-2 rounded-3xl bg-white/10 p-4">
          {cats.map(([cat, amt], i) => {
            const pct = (amt / total) * 100
            return (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{cat}</span>
                  <span className="font-bold">${fmt(amt)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: catColors[i % catColors.length] }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-white/10 p-4">
          <Star className="h-6 w-6 shrink-0 text-amber-300" />
          <p className="text-sm text-white/90">
            A great outing! Everyone&apos;s settled and the memories are saved to your Circle.
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-8 pt-3">
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-white py-4 text-base font-bold text-nets-navy"
        >
          Done
        </button>
      </div>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold">{value}</p>
    </div>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-2 pt-1">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5 text-nets-navy" />
      </button>
      <h1 className="text-lg font-extrabold text-nets-navy">{title}</h1>
    </div>
  )
}
