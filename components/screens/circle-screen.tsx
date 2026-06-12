"use client"

import { motion, AnimatePresence } from "motion/react"
import { useState } from "react"
import {
  Plus, Users, ChevronRight, ChevronLeft, Check, Sparkles,
  ArrowRight, UserPlus, Receipt, PartyPopper, Share2, Wallet,
  Star, ShieldCheck, Lightbulb, TrendingDown,
} from "lucide-react"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import {
  circles, circleTotal, perHead, computeSettlements, memberName,
  circleRecommendations, confidenceConfig, affordabilityMessage,
  type Circle, type ConfidenceLevel,
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
          <CircleCreate
            key="create"
            onBack={() => setCircleView("list")}
            onDone={() => {
              setCircleView("confidence")
            }}
          />
        )}
        {circleView === "confidence" && (
          <CircleConfidenceView
            key="confidence"
            circle={circles[3]} // Taylor Swift — low confidence — most illustrative
            onBack={() => setCircleView("create")}
            onProceed={() => openCircle("c4")}
          />
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
          <CircleSettle
            key="settle"
            circle={circle}
            onBack={() => setCircleView("detail")}
            onDone={() => setCircleView("recap")}
          />
        )}
        {circleView === "recap" && (
          <CircleRecap
            key="recap"
            circle={circle}
            onBack={() => setCircleView("detail")}
            onClose={() => setCircleView("list")}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ──────────────────── LIST ──────────────────── */
function CircleList({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
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
            <span className="rounded-full bg-nets-red/10 px-2 py-0.5 text-[10px] font-bold text-nets-red">NEW</span>
          </div>
          <p className="text-sm text-muted-foreground">Spend together, settle in one tap</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Hero */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative overflow-hidden rounded-3xl bg-nets-red p-5 text-white shadow-lg shadow-nets-red/25"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl" />
          <Sparkles className="h-6 w-6" />
          <p className="mt-3 text-lg font-extrabold leading-snug">
            Say yes to experiences, without the awkwardness of money.
          </p>
          <p className="mt-1 text-sm text-white/85">
            NETS tracks, splits and settles — invisibly in the background.
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
            const conf = confidenceConfig(c.circleConfidence)
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
                  <p className="truncate text-sm font-bold text-nets-navy">{c.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={c.status} />
                    <span className="text-xs text-muted-foreground">{c.date}</span>
                  </div>
                  {/* Circle Confidence badge */}
                  {c.status === "planning" && (
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${conf.bg} ${conf.text}`}>
                      <span>{conf.icon}</span> {conf.label}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {c.status !== "planning" ? (
                    <>
                      <p className="text-sm font-extrabold text-nets-navy">${fmt(total)}</p>
                      <p className="text-[11px] text-muted-foreground">{c.members.length} friends</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-extrabold text-nets-navy">~${c.estimatedCostPerPerson}</p>
                      <p className="text-[11px] text-muted-foreground">per person</p>
                    </>
                  )}
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

/* ──────────────────── CREATE ──────────────────── */
function CircleCreate({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState("")
  const allFriends = [
    { id: "bryan", name: "Bryan Lim", color: "var(--nets-navy)" },
    { id: "cheryl", name: "Cheryl Ng", color: "var(--nets-blue)" },
    { id: "dinesh", name: "Dinesh R.", color: "var(--nets-green)" },
    { id: "elaine", name: "Elaine Koh", color: "var(--nets-red)" },
    { id: "farah", name: "Farah B.", color: "var(--nets-navy)" },
  ]
  const [selected, setSelected] = useState<string[]>(["bryan", "cheryl", "dinesh"])
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
        <label className="text-sm font-bold text-nets-navy">What's the occasion?</label>
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
                <span className="flex-1 text-left text-sm font-semibold text-nets-navy">{f.name}</span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${on ? "border-nets-red bg-nets-red text-white" : "border-border"}`}>
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
            <div key={r.id} className="min-w-[62%] rounded-2xl bg-card p-3 shadow-sm">
              <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: r.color }}>
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
          Check Affordability ({selected.length + 1}) <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ──────────────────── CIRCLE CONFIDENCE ──────────────────── */
function CircleConfidenceView({
  circle,
  onBack,
  onProceed,
}: {
  circle: Circle
  onBack: () => void
  onProceed: () => void
}) {
  const conf = confidenceConfig(circle.circleConfidence)
  const myMsg = affordabilityMessage(circle.myAffordabilitySignal)
  const [showAlts, setShowAlts] = useState(false)

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Social Affordability" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">

        {/* Private signal — only the current user sees this */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-3xl bg-nets-navy p-5 text-white"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white/70" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Private · Only you see this</span>
          </div>
          <p className="mt-3 text-base font-bold leading-snug">{myMsg}</p>
          <div className="mt-4 space-y-2">
            {circle.costBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-white/75">{item.label}</span>
                <span className="text-sm font-bold text-white">~${item.amount}</span>
              </div>
            ))}
            <div className="border-t border-white/20 pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Estimated total</span>
              <span className="text-lg font-extrabold text-white">~${circle.estimatedCostPerPerson}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/50">Based on your spending history. No data is shared with anyone.</p>
        </motion.div>

        {/* Circle Confidence — group level, no individual exposure */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08 }}
          className={`mt-4 rounded-3xl border-2 ${conf.border} ${conf.bg} p-5`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Circle Confidence</p>
              <p className={`mt-0.5 text-lg font-extrabold ${conf.text}`}>{conf.label}</p>
            </div>
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-sm"
              style={{ backgroundColor: conf.color }}
            >
              {conf.icon}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{conf.message}</p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Nobody's finances are revealed. NETS evaluates the group collectively to help everyone participate comfortably.
          </p>
        </motion.div>

        {/* Smart Participation Guidance (show when moderate/low) */}
        {(circle.circleConfidence === "moderate" || circle.circleConfidence === "low") && circle.alternatives && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="mt-4"
          >
            <button
              onClick={() => setShowAlts((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-nets-navy">Smart Participation Guidance</span>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showAlts ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence>
              {showAlts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-3 px-1 text-xs text-muted-foreground">
                    The goal isn't to save money — it's to help everyone say yes. Here are options that raise participation confidence.
                  </p>
                  <div className="mt-2 space-y-2">
                    {circle.alternatives.map((alt, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                          <TrendingDown className="h-4 w-4 text-amber-600" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-nets-navy">{alt.title}</p>
                          <p className="text-xs text-muted-foreground">{alt.description}</p>
                          <span className="mt-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            {alt.savingLabel}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <p className="mt-5 text-center text-xs text-muted-foreground/60 px-4">
          NETS uses your transaction history to estimate costs. This is private and never shared with anyone in your Circle.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={onProceed}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
        >
          Start Circle <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ──────────────────── DETAIL ──────────────────── */
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
  const conf = confidenceConfig(circle.circleConfidence)

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
              <p className="text-xs text-white/70">{circle.status === "planning" ? "Est. per person" : "Total tracked"}</p>
              <p className="text-3xl font-extrabold">
                {circle.status === "planning" ? `~$${fmt(circle.estimatedCostPerPerson)}` : `$${fmt(total)}`}
              </p>
            </div>
            {circle.status !== "planning" && (
              <div className="text-right">
                <p className="text-xs text-white/70">Per person</p>
                <p className="text-lg font-bold">${fmt(share)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="-mt-3 flex-1 overflow-y-auto rounded-t-3xl bg-nets-page px-5 pb-28 pt-5">

        {/* Circle Confidence pill (planning/active only) */}
        {circle.status !== "settled" && (
          <div className={`mb-4 flex items-center gap-3 rounded-2xl border ${conf.border} ${conf.bg} px-4 py-3`}>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
              style={{ backgroundColor: conf.color }}
            >
              {conf.icon}
            </span>
            <div>
              <p className={`text-xs font-extrabold ${conf.text}`}>{conf.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{conf.message}</p>
            </div>
          </div>
        )}

        {/* members */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {circle.members.map((m) => {
            const net = m.paid - share
            return (
              <div key={m.id} className="flex min-w-[88px] flex-col items-center rounded-2xl bg-card p-3 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: m.color }}>
                  {m.initial}
                </span>
                <p className="mt-1.5 max-w-full truncate text-[11px] font-semibold text-nets-navy">
                  {m.name.replace(" (You)", "")}
                </p>
                {circle.status !== "planning" && (
                  <p className={`text-[11px] font-bold ${net >= 0 ? "text-nets-green" : "text-nets-red"}`}>
                    {net >= 0 ? "+" : "-"}${fmt(Math.abs(net))}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Smart Participation Guidance in detail (planning + low/moderate confidence) */}
        {circle.status === "planning" && (circle.circleConfidence === "low" || circle.circleConfidence === "moderate") && circle.alternatives && (
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800">Participation Suggestions</p>
            </div>
            {circle.alternatives.map((alt, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-nets-navy">{alt.title}</p>
                  <p className="text-[11px] text-muted-foreground">{alt.description}</p>
                </div>
                <span className="ml-2 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {alt.savingLabel}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* expenses */}
        <div className="mt-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-nets-navy">
            <Receipt className="h-4 w-4" /> Shared expenses
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
              When members pay with NETS, expenses appear here automatically — no manual entry needed.
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
            <Wallet className="h-5 w-5" />
            {circle.expenses.length === 0 ? "Waiting for expenses…" : `Settle up · $${fmt(total)}`}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ──────────────────── SETTLE ──────────────────── */
function CircleSettle({ circle, onBack, onDone }: { circle: Circle; onBack: () => void; onDone: () => void }) {
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
          <p className="text-xs text-white/70">NETS did the math</p>
          <p className="mt-1 text-sm leading-relaxed text-white/90">
            {settlements.length} transfer{settlements.length === 1 ? "" : "s"} will settle everyone in{" "}
            <span className="font-bold text-white">{circle.name}</span>.
          </p>
          <p className="mt-2 text-xs text-white/60">
            No one needs to chase anyone. NETS handles it automatically.
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
          Funds move instantly between linked NETS accounts. Friendships stay intact.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => { setPaid(true); setTimeout(onDone, 1100) }}
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
            <p className="text-sm text-white/70">Generating your Circle Recap…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ──────────────────── RECAP ──────────────────── */
function CircleRecap({ circle, onBack, onClose }: { circle: Circle; onBack: () => void; onClose: () => void }) {
  const total = circleTotal(circle)
  const byCat = circle.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const catColors = ["var(--nets-red)", "var(--nets-navy)", "var(--nets-blue)", "var(--nets-green)"]
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
          <Share2 className="h-4 w-4" />
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

        {/* Stats — focused on experience, not financial admin */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Total spent" value={`$${fmt(total)}`} />
          <Stat label="Expenses tracked" value={`${circle.expenses.length} items`} />
          <Stat label="Friends" value={`${circle.members.length} people`} />
          <Stat label="Top contributor" value={topPayer.name.replace(" (You)", "You")} />
        </div>

        {/* Breakdown */}
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

        {/* Memory-focused sign-off */}
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-white/10 p-4">
          <Star className="h-6 w-6 shrink-0 text-amber-300" />
          <p className="text-sm text-white/90">
            A great outing — everyone's settled and the memories are yours to keep. No awkward money conversations needed.
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
