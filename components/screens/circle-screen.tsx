"use client"

import { motion, AnimatePresence } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Plus, Users, ChevronRight, ChevronLeft, Check, Sparkles,
  ArrowRight, UserPlus, Receipt, Wallet,
  ShieldCheck, Lightbulb, TrendingDown, QrCode, CreditCard,
  Bell, Zap, X, Minus, Smartphone,
} from "lucide-react"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import { useCircleData } from "../circle-data-context"
import {
  circleTotal, perHead, computeSettlements, memberName,
  circleRecommendations, confidenceConfig, affordabilityMessage,
  activities, computeConfidencePercent, confidenceLabel, confidenceColor, PROFILE_RANGES,
  type Circle, type CircleExpense, type ComfortProfile, type Activity,
} from "@/lib/nets-data"

const fmt = (n: number) =>
  n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusLabel: Record<Circle["status"], string> = {
  planning: "Planning",
  active: "Live now",
  settled: "Settled",
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function CircleScreen() {
  const { circleView, setCircleView, activeCircleId, openCircle } = useNav()
  const { circles, createCircle, activateCircle, settleCircle, setCircleProfile, createWallet, addCircleExpense } = useCircleData()
  const [pendingCircleId, setPendingCircleId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  const circle = useMemo(
    () => (activeCircleId ? circles.find((c) => c.id === activeCircleId) : circles[0]) ?? circles[0],
    [activeCircleId, circles]
  )
  const pendingCircle = pendingCircleId ? circles.find((c) => c.id === pendingCircleId) : null
  const selectedActivity = selectedActivityId ? activities.find((a) => a.id === selectedActivityId) : undefined

  return (
    <div className="flex h-full flex-col bg-nets-page">
      <AnimatePresence mode="wait">
        {circleView === "list" && (
          <CircleList key="list" onOpen={openCircle} onCreate={() => setCircleView("create")} circles={circles} />
        )}
        {circleView === "create" && (
          <CircleCreate
            key="create"
            onBack={() => setCircleView("list")}
            onDone={(name, selected) => {
              const id = createCircle(name, selected)
              setPendingCircleId(id)
              setCircleView("comfort")
            }}
          />
        )}
        {circleView === "comfort" && pendingCircle && (
          <ComfortProfileView
            key="comfort"
            onBack={() => setCircleView("create")}
            onDone={(profile, tags) => {
              setCircleProfile(pendingCircle.id, profile, tags)
              setCircleView("experience")
            }}
          />
        )}
        {circleView === "experience" && pendingCircle && (
          <ExperienceMatchView
            key="experience"
            circle={pendingCircle}
            onBack={() => setCircleView("comfort")}
            onSelect={(activityId) => {
              setSelectedActivityId(activityId)
              setCircleView("confidence")
            }}
          />
        )}
        {circleView === "confidence" && pendingCircle && (
          <CircleConfidenceView
            key="confidence"
            circle={pendingCircle}
            activity={selectedActivity}
            onBack={() => setCircleView("experience")}
            onProceed={() => setCircleView("wallet-setup")}
          />
        )}
        {circleView === "wallet-setup" && pendingCircle && (
          <WalletSetupView
            key="wallet-setup"
            circle={pendingCircle}
            activity={selectedActivity}
            onBack={() => setCircleView("confidence")}
            onDone={(target, perPerson) => {
              createWallet(pendingCircle.id, target, perPerson)
              activateCircle(pendingCircle.id, true)
              setPendingCircleId(null)
              setSelectedActivityId(null)
              openCircle(pendingCircle.id)
            }}
          />
        )}
        {circleView === "detail" && (
          <CircleDetail
            key="detail"
            circle={circle}
            onBack={() => setCircleView("list")}
            onSettle={() => setCircleView("settle")}
            onReconcile={() => setCircleView("reconcile")}
            onAddExpense={(expense, deduct) => addCircleExpense(circle.id, expense, deduct)}
          />
        )}
        {circleView === "settle" && (
          <CircleSettle
            key="settle"
            circle={circle}
            onBack={() => setCircleView("detail")}
            onDone={() => {
              settleCircle(circle.id)
              setCircleView("detail")
            }}
          />
        )}
        {circleView === "reconcile" && (
          <ReconcileView
            key="reconcile"
            circle={circle}
            onBack={() => setCircleView("detail")}
            onDone={() => {
              settleCircle(circle.id)
              setCircleView("detail")
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── List ─────────────────────────────────────────────────────────────────────

function CircleList({ onOpen, onCreate, circles }: { onOpen: (id: string) => void; onCreate: () => void; circles: Circle[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col">
      <div className="bg-nets-page">
        <StatusBar />
        <div className="px-5 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <img
              src="/nets-circle-logo.jpg"
              alt="NETS Circle"
              className="h-11 w-11 shrink-0 object-contain mix-blend-multiply"
            />
            <h1 className="text-xl font-extrabold text-nets-navy">NETS Circle</h1>
            <span className="rounded-full bg-nets-red/10 px-2 py-0.5 text-[10px] font-bold text-nets-red">NEW</span>
          </div>
          <p className="text-sm text-muted-foreground">Spend together, settle in one tap</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
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
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: c.cover }}>
                  <Users className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-nets-navy">{c.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={c.status} />
                    <span className="text-xs text-muted-foreground">{c.date}</span>
                  </div>
                  {c.status === "planning" && (
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${conf.bg} ${conf.text}`}>
                      <span>{conf.icon}</span> {conf.label}
                    </span>
                  )}
                  {c.tripWallet && c.status === "active" && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-nets-navy/10 px-2 py-0.5 text-[10px] font-bold text-nets-navy">
                      <Wallet className="h-2.5 w-2.5" /> Wallet ${fmt(c.tripWallet.balance)}
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

// ─── Create ───────────────────────────────────────────────────────────────────

function CircleCreate({ onBack, onDone }: { onBack: () => void; onDone: (name: string, selected: string[]) => void }) {
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
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${name === p ? "bg-nets-navy text-white" : "bg-card text-nets-navy shadow-sm"}`}
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
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: f.color }}>
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
          onClick={() => onDone(name, selected)}
          disabled={!name || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
        >
          Next: Set Your Profile ({selected.length + 1}) <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Comfort Profile ──────────────────────────────────────────────────────────

const PROFILES: { id: ComfortProfile; title: string; range: string; desc: string; emoji: string; color: string }[] = [
  {
    id: "easy-going",
    title: "Easy Going",
    range: "$0 – $30 / person",
    desc: "Prefers lower-cost outings. Soft stretch up to $45.",
    emoji: "😊",
    color: "var(--nets-green)",
  },
  {
    id: "balanced",
    title: "Balanced",
    range: "$30 – $80 / person",
    desc: "Comfortable with moderate-cost outings. Soft stretch up to $100.",
    emoji: "⚖️",
    color: "var(--nets-blue)",
  },
  {
    id: "experience-first",
    title: "Experience First",
    range: "$80 – $150 / person",
    desc: "Willing to spend more for memorable experiences. Soft stretch up to $180.",
    emoji: "✨",
    color: "var(--nets-red)",
  },
]

const INTEREST_TAGS = ["Food", "Travel", "Entertainment", "Sports", "Shopping", "Nightlife", "Chill", "Adventure"]

function ComfortProfileView({ onBack, onDone }: {
  onBack: () => void
  onDone: (profile: ComfortProfile, tags: string[]) => void
}) {
  const [selected, setSelected] = useState<ComfortProfile>("balanced")
  const [tags, setTags] = useState<string[]>(["Food", "Travel"])

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Comfort Profile" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-nets-blue" />
          <span className="text-xs font-semibold text-nets-blue">Private · Only you see this</span>
        </div>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          NETS uses this to match experiences to your group — without sharing your data with anyone.
        </p>

        <div className="space-y-3">
          {PROFILES.map((p) => {
            const isSelected = selected === p.id
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(p.id)}
                className={`flex w-full items-start gap-4 rounded-3xl border-2 p-4 text-left transition-all ${
                  isSelected ? "border-nets-navy bg-nets-navy/5" : "border-border bg-card"
                }`}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${p.color}20` }}
                >
                  {p.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-nets-navy">{p.title}</p>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${isSelected ? "border-nets-navy bg-nets-navy" : "border-border"}`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">{p.range}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">{p.desc}</p>
                </div>
              </motion.button>
            )
          })}
        </div>

        <h3 className="mt-6 text-sm font-bold text-nets-navy">Your interests</h3>
        <p className="text-xs text-muted-foreground mb-3">Helps NETS suggest activities you'll enjoy</p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => {
            const on = tags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => setTags((t) => on ? t.filter((x) => x !== tag) : [...t, tag])}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  on ? "bg-nets-navy text-white" : "bg-card text-nets-navy shadow-sm"
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => onDone(selected, tags)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-4 text-base font-bold text-white"
        >
          Find Experiences <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Experience Match ─────────────────────────────────────────────────────────

function ExperienceMatchView({ circle, onBack, onSelect }: {
  circle: Circle
  onBack: () => void
  onSelect: (activityId: string) => void
}) {
  const profile = circle.comfortProfile ?? "balanced"
  const groupSize = circle.members.length
  const interests = circle.interestTags ?? []

  // Experience Match ranks by shared interests first, then Circle Confidence
  // (concept doc: "shared interests, comfort profiles and NETS payment readiness").
  const scored = activities
    .map((a) => ({
      ...a,
      pct: computeConfidencePercent(a, profile, groupSize),
      overlap: a.tags.filter((t) => interests.includes(t)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || b.pct - a.pct)

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Experience Match™" onBack={onBack} />
      </div>

      <div className="px-5 pb-2">
        <p className="text-xs text-muted-foreground">
          Ranked by Circle Confidence™ for your group of {groupSize}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {scored.map((a, i) => {
          const color = confidenceColor(a.pct)
          const isTop = i === 0
          return (
            <div key={a.id}>
            {isTop && (
              <div className="mb-1 ml-1">
                <span className="rounded-full bg-nets-red px-2.5 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wide">
                  ★ Best match for your group
                </span>
              </div>
            )}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(a.id)}
              className={`flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-sm ${isTop ? "ring-2 ring-nets-red/30" : ""}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nets-navy/5 text-2xl">
                {a.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-nets-navy">{a.name}</p>
                <p className="text-xs text-muted-foreground">${a.costMin}–${a.costMax} / person</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.tripWalletSupport === "full" && (
                    <span className="rounded-full bg-nets-blue/10 px-2 py-0.5 text-[10px] font-bold text-nets-blue">Wallet ✓</span>
                  )}
                  {a.tripWalletSupport === "partial" && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Wallet partial</span>
                  )}
                  {a.crossBorder && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Cross-border</span>
                  )}
                  {a.netsMerchantScore >= 85 && (
                    <span className="rounded-full bg-nets-green/10 px-2 py-0.5 text-[10px] font-bold text-nets-green">{a.netsMerchantScore}% NETS</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
                  style={{ backgroundColor: color }}
                >
                  {a.pct}%
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold text-center leading-tight">Circle<br/>Confidence</span>
              </div>
            </motion.button>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Confidence Ring SVG ──────────────────────────────────────────────────────

function ConfidenceRing({ pct, color }: { pct: number; color: string }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(pct), 200)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - displayed / 100)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-3xl font-extrabold" style={{ color }}>{displayed}%</p>
        <p className="text-[10px] font-semibold text-muted-foreground">Confidence</p>
      </div>
    </div>
  )
}

// ─── Circle Confidence (Enhanced) ────────────────────────────────────────────

function CircleConfidenceView({
  circle,
  activity,
  onBack,
  onProceed,
}: {
  circle: Circle
  activity?: Activity
  onBack: () => void
  onProceed: () => void
}) {
  const profile = circle.comfortProfile ?? "balanced"
  const groupSize = circle.members.length

  const pct = activity
    ? computeConfidencePercent(activity, profile, groupSize)
    : circle.circleConfidence === "high" ? 87 : circle.circleConfidence === "moderate" ? 64 : 41

  const color = confidenceColor(pct)
  const conf = confidenceConfig(confidenceLabel(pct))

  // Private comfort check derived from the user's DECLARED comfort profile vs the
  // selected activity — never transaction history (concept doc, page 10).
  const range = PROFILE_RANGES[profile]
  const recommendedRange = `$${range.min}–$${range.max} / person`
  const activityMid = activity ? (activity.costMin + activity.costMax) / 2 : circle.estimatedCostPerPerson
  const mySignal: Circle["myAffordabilitySignal"] =
    activityMid <= range.max ? "within" : activityMid <= range.stretch ? "stretch" : "above"
  const myMsg = affordabilityMessage(mySignal)

  // "Why this scored" factors, phrased per the concept doc (pages 4–5).
  const factors = activity ? [
    {
      ok: pct >= 70,
      text: pct >= 70
        ? "Fits the Circle's comfort profile"
        : "Above the Circle's comfort range",
    },
    {
      ok: activity.netsMerchantScore >= 70,
      text: activity.netsMerchantScore >= 70
        ? "Strong NETS merchant coverage"
        : "Limited NETS-supported merchants nearby",
    },
    {
      ok: activity.tripWalletSupport === "full",
      text: activity.tripWalletSupport === "full"
        ? "Trip Wallet supported"
        : activity.tripWalletSupport === "partial"
        ? "Trip Wallet partially supported"
        : "Trip Wallet not available",
    },
    {
      ok: true, // both states are fine — cross-border ready, or local with no cross-border needed
      text: activity.crossBorder
        ? "Cross-border ready"
        : "Local — no cross-border payment needed",
    },
  ] : []

  const [showDetail, setShowDetail] = useState(false)

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Circle Confidence™" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {/* Hero score */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center py-4"
        >
          <ConfidenceRing pct={pct} color={color} />
          <p className="mt-3 text-lg font-extrabold text-nets-navy" style={{ color }}>
            {conf.label}
          </p>
          {activity && (
            <p className="mt-1 text-sm font-semibold text-nets-navy">
              {activity.emoji} {activity.name}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground text-center px-4 leading-relaxed">
            {conf.message}
          </p>
        </motion.div>

        {/* Factors */}
        {factors.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-2 rounded-3xl bg-card p-4 shadow-sm space-y-3"
          >
            <p className="text-xs font-bold text-nets-navy uppercase tracking-wide">Why this score</p>
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] ${f.ok ? "bg-nets-green" : "bg-amber-500"}`}>
                  {f.ok ? "✓" : "~"}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.text}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Private comfort check — declared profile only, never transaction history */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mt-3 rounded-3xl bg-nets-navy p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-white/60" />
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Private · Only you see this</span>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{myMsg}</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/65">Your comfort range</span>
              <span className="font-bold text-white">{recommendedRange}</span>
            </div>
            {activity && (
              <div className="flex justify-between text-xs">
                <span className="text-white/65">This experience</span>
                <span className="font-bold text-white">${activity.costMin}–${activity.costMax} / person</span>
              </div>
            )}
          </div>
          <p className="mt-3 text-[10px] text-white/50 leading-relaxed">
            Based on the comfort profile you selected. No individual financial data is shown to anyone.
          </p>
        </motion.div>

        {/* Alternatives */}
        {(circle.circleConfidence === "moderate" || circle.circleConfidence === "low") && circle.alternatives && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.36 }} className="mt-3">
            <button
              onClick={() => setShowDetail((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-nets-navy">Smart Participation Guidance</span>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showDetail ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showDetail && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 space-y-2">
                    {circle.alternatives.map((alt, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                          <TrendingDown className="h-4 w-4 text-amber-600" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-nets-navy">{alt.title}</p>
                          <p className="text-xs text-muted-foreground">{alt.description}</p>
                          <span className="mt-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">{alt.savingLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <p className="mt-5 text-center text-xs text-muted-foreground/60 px-4">
          Nobody's finances are revealed. NETS evaluates the group collectively.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={onProceed}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
        >
          <Wallet className="h-5 w-5" /> Set Up Trip Wallet
        </button>
      </div>
    </motion.div>
  )
}

// ─── Wallet Setup ─────────────────────────────────────────────────────────────

function WalletSetupView({ circle, activity, onBack, onDone }: {
  circle: Circle
  activity?: Activity
  onBack: () => void
  onDone: (target: number, perPerson: number) => void
}) {
  const baseEstimate = activity
    ? Math.ceil(((activity.costMin + activity.costMax) / 2) * circle.members.length / 10) * 10
    : Math.ceil(circle.estimatedCostPerPerson * circle.members.length / 10) * 10

  const [total, setTotal] = useState(baseEstimate)
  const perPerson = Math.round((total / circle.members.length) * 100) / 100

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Shared Trip Wallet™" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        <div className="rounded-3xl bg-nets-navy p-5 text-white text-center">
          <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">NETS recommends</p>
          <p className="mt-3 text-5xl font-extrabold tracking-tight">${fmt(total)}</p>
          <p className="text-sm text-white/70 mt-1">total pool · ${fmt(perPerson)} / person</p>
          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              onClick={() => setTotal((t) => Math.max(circle.members.length * 10, t - 50))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="text-sm text-white/50">Adjust ±$50</span>
            <button
              onClick={() => setTotal((t) => t + 50)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="mt-5 text-sm font-bold text-nets-navy">Members contributing</p>
        <div className="mt-2 space-y-2">
          {circle.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: m.color }}>
                {m.initial}
              </span>
              <p className="flex-1 text-sm font-semibold text-nets-navy">{m.name}</p>
              <span className="text-sm font-bold text-nets-navy">${fmt(perPerson)}</span>
              <Check className="h-4 w-4 text-nets-green" />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-nets-blue/10 border border-nets-blue/20 p-4">
          <p className="text-xs text-nets-blue leading-relaxed">
            Funds pool securely via NETS. As the group spends, the wallet deducts automatically.
            Any surplus is returned proportionally at the end.
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => onDone(total, perPerson)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
        >
          <Wallet className="h-5 w-5" /> Create Wallet · ${fmt(total)}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Simulated detections ─────────────────────────────────────────────────────

// The three documented detection scenarios (concept doc, pages 15–18):
// a shared ride, a partial-group activity, and a personal purchase to reject.
const SIMULATED_PAYMENTS = [
  { id: "sim-grab", label: "Simulate Grab $35", description: "Grab ride", merchant: "Grab", amount: 35.0, category: "Transport" },
  { id: "sim-arcade", label: "Simulate Arcade $40", description: "Arcade tickets", merchant: "Arcade World", amount: 40.0, category: "Entertainment" },
  { id: "sim-shopping", label: "Simulate Personal Shopping $25", description: "Personal item", merchant: "Uniqlo", amount: 25.0, category: "Shopping" },
]

// ─── Circle Detail ────────────────────────────────────────────────────────────

function CircleDetail({
  circle, onBack, onSettle, onReconcile, onAddExpense,
}: {
  circle: Circle
  onBack: () => void
  onSettle: () => void
  onReconcile: () => void
  onAddExpense: (expense: Omit<CircleExpense, "id">, deductFromWallet: boolean) => void
}) {
  const total = circleTotal(circle)
  const share = perHead(circle)
  const conf = confidenceConfig(circle.circleConfidence)
  const wallet = circle.tripWallet

  const [detection, setDetection] = useState<typeof SIMULATED_PAYMENTS[0] | null>(null)
  const [participantModal, setParticipantModal] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  function handleAddAll() {
    if (!detection) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense(
      { title: detection.description, merchant: detection.merchant, category: detection.category, amount: detection.amount, paidById: "alex", time: now },
      !!wallet
    )
    setDetection(null)
  }

  function handleConfirmParticipants() {
    if (!detection || selectedParticipants.length === 0) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense(
      { title: `${detection.description} (${selectedParticipants.length} ppl)`, merchant: detection.merchant, category: detection.category, amount: detection.amount, paidById: "alex", time: now },
      !!wallet
    )
    setDetection(null)
    setParticipantModal(false)
  }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
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
        {/* Trip Wallet live view */}
        {wallet && circle.status === "active" && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4 overflow-hidden rounded-3xl bg-nets-navy"
          >
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-white/60" />
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Trip Wallet™</span>
                </div>
                <span className="text-xs text-white/40">${fmt(wallet.target)} pooled</span>
              </div>
              <p className="text-3xl font-extrabold text-white">${fmt(wallet.balance)}</p>
              <p className="text-xs text-white/50">remaining</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, (wallet.balance / wallet.target) * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-white"
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-white/40">
                <span>${fmt(wallet.target - wallet.balance)} spent</span>
                <span>${fmt(wallet.balance)} left</span>
              </div>
            </div>
            {wallet.transactions.length > 0 && (
              <div className="border-t border-white/10">
                {wallet.transactions.slice(-3).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{txn.description}</p>
                      <p className="text-[10px] text-white/40">{txn.merchant} · {txn.time}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-white/80">-${fmt(txn.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Confidence badge */}
        {circle.status !== "settled" && (
          <div className={`mb-4 flex items-center gap-3 rounded-2xl border ${conf.border} ${conf.bg} px-4 py-3`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: conf.color }}>
              {conf.icon}
            </span>
            <div>
              <p className={`text-xs font-extrabold ${conf.text}`}>{conf.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{conf.message}</p>
            </div>
          </div>
        )}

        {/* Members */}
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

        {/* NETS Auto-Detection simulation */}
        {circle.status === "active" && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-800">Circle-Aware Expense Recognition™</p>
            </div>
            <p className="text-xs text-amber-700 mb-3 leading-relaxed">
              During an active Circle, NETS recognises possible Circle-related payments and asks the payer before adding them. Tap to simulate.
            </p>
            <div className="flex flex-col gap-2">
              {SIMULATED_PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDetection(p)}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white active:opacity-80"
                >
                  <Bell className="h-3.5 w-3.5 shrink-0" />
                  {p.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Expenses list */}
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

      {/* Bottom CTA */}
      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        {circle.status === "settled" ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-green/10 border border-nets-green/30 py-4 text-base font-bold text-nets-green">
            <Check className="h-5 w-5" /> Circle settled — no chasing needed
          </div>
        ) : circle.tripWallet ? (
          <button
            onClick={onReconcile}
            disabled={circle.expenses.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
          >
            <Zap className="h-5 w-5" />
            {circle.expenses.length === 0 ? "Waiting for expenses…" : "Reconcile Now"}
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

      {/* Expense Detection Modal */}
      <AnimatePresence>
        {detection && !participantModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40"
              onClick={() => setDetection(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-center gap-3 mb-4 rounded-2xl bg-nets-navy/5 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nets-red text-white">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-nets-navy uppercase tracking-wide">NETS detected a payment</p>
                  <p className="text-lg font-extrabold text-nets-navy">{detection.merchant} · ${fmt(detection.amount)}</p>
                  <p className="text-xs text-muted-foreground">{detection.description}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-nets-navy mb-3">
                Add to <span className="text-nets-red">{circle.name}</span>?
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleAddAll}
                  className="flex w-full items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 p-3 text-left"
                >
                  <Check className="h-5 w-5 text-nets-green shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-nets-navy">Yes, split with all {circle.members.length}</p>
                    <p className="text-xs text-muted-foreground">${fmt(detection.amount / circle.members.length)} per person</p>
                  </div>
                </button>
                <button
                  onClick={() => { setSelectedParticipants(circle.members.map((m) => m.id)); setParticipantModal(true) }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-3 text-left"
                >
                  <Users className="h-5 w-5 text-nets-navy shrink-0" />
                  <p className="text-sm font-bold text-nets-navy">Choose participants</p>
                </button>
                <button
                  onClick={() => setDetection(null)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-3 text-left"
                >
                  <X className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-nets-navy">No, personal expense</p>
                    <p className="text-xs text-muted-foreground">Keep this to myself</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Participant Selection Sheet */}
      <AnimatePresence>
        {participantModal && detection && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/40"
              onClick={() => setParticipantModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-[60] rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <p className="text-base font-bold text-nets-navy mb-0.5">Who's splitting?</p>
              <p className="text-xs text-muted-foreground mb-4">
                {detection.merchant} · ${fmt(detection.amount)} ·{" "}
                ${fmt(selectedParticipants.length > 0 ? detection.amount / selectedParticipants.length : detection.amount)} each
              </p>
              <div className="space-y-2 mb-4">
                {circle.members.map((m) => {
                  const on = selectedParticipants.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() =>
                        setSelectedParticipants((p) =>
                          on ? p.filter((x) => x !== m.id) : [...p, m.id]
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-2xl bg-nets-page p-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: m.color }}>
                        {m.initial}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-nets-navy text-left">{m.name}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${on ? "border-nets-red bg-nets-red" : "border-border"}`}>
                        {on && <Check className="h-3.5 w-3.5 text-white" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleConfirmParticipants}
                disabled={selectedParticipants.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                Add for {selectedParticipants.length} people · ${fmt(detection.amount)}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Auto Reconciliation ──────────────────────────────────────────────────────

function ReconcileView({ circle, onBack, onDone }: { circle: Circle; onBack: () => void; onDone: () => void }) {
  const settlements = computeSettlements(circle)
  const wallet = circle.tripWallet
  const total = circleTotal(circle)
  const [step, setStep] = useState<Step>("idle")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [netsForm, setNetsForm] = useState<NetsFormData | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const walletSurplus = wallet ? wallet.balance : 0
  const surplusPerPerson = walletSurplus > 0 ? walletSurplus / circle.members.length : 0
  const mySettlement = settlements.find((s) => s.fromId === "alex")

  useEffect(() => {
    if (netsForm && formRef.current) {
      setTimeout(() => formRef.current?.submit(), 100)
    }
  }, [netsForm])

  const handleReconcile = async (paymentMode: string) => {
    try {
      setStep("paying")
      setError(null)

      const createRes = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: circle.id, settlements }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || "Failed to create settlements")

      type SettlementRecord = { id: string; fromMemberId: string; toMemberId: string; amount: number }
      const myRecord = (createData.settlements as SettlementRecord[]).find((s) => s.fromMemberId === "alex")

      if (!myRecord) {
        // Alex is a creditor or everyone is square — no payment needed from Alex
        setDone(true)
        setTimeout(onDone, 1600)
        return
      }

      const payRes = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: myRecord.id, amount: myRecord.amount, paymentMode }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error || "Failed to prepare payment")

      // Optimistic balance deduction before redirecting to NETS gateway
      // Single source of truth is the NETS callback (deducts once in Supabase).
      // No optimistic write — it would double-deduct and is discarded on redirect.
      setStep("redirecting")
      setNetsForm(payData.paymentInitiation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
      setStep("idle")
    }
  }

  const handleClickReconcile = () => {
    if (mySettlement) {
      setStep("select")
    } else {
      // Nothing for Alex to pay — just mark done
      setDone(true)
      setTimeout(onDone, 1600)
    }
  }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      {netsForm && (
        <form ref={formRef} method="POST" action={netsForm.gatewayUrl} style={{ display: "none" }}>
          <input type="hidden" name="txnReq" value={netsForm.txnReq} />
          <input type="hidden" name="mac" value={netsForm.mac} />
          <input type="hidden" name="keyId" value={netsForm.keyId} />
        </form>
      )}

      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Auto Reconciliation™" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {/* Summary card */}
        <div className="rounded-3xl bg-nets-navy p-5 text-white">
          <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">NETS calculated the final split</p>
          <p className="mt-2 text-base font-bold">{circle.name} · {circle.members.length} members</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/50">Total tracked</p>
              <p className="text-xl font-extrabold">${fmt(total)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/50">Per person</p>
              <p className="text-xl font-extrabold">${fmt(perHead(circle))}</p>
            </div>
          </div>
        </div>

        {/* Wallet surplus */}
        {walletSurplus > 0 && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="mt-3 flex items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 p-4"
          >
            <Wallet className="h-5 w-5 text-nets-green shrink-0" />
            <div>
              <p className="text-sm font-bold text-nets-green">Wallet surplus: ${fmt(walletSurplus)}</p>
              <p className="text-xs text-muted-foreground">
                ${fmt(surplusPerPerson)} returned to each member automatically.
              </p>
            </div>
          </motion.div>
        )}

        {/* Settlements */}
        {settlements.length > 0 ? (
          <>
            <h2 className="mt-5 text-base font-bold text-nets-navy">Transfers needed</h2>
            <p className="text-xs text-muted-foreground mb-3">
              NETS minimises the number of transfers
            </p>
            <div className="space-y-3">
              {settlements.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className={`flex items-center gap-3 rounded-3xl p-4 shadow-sm ${s.fromId === "alex" ? "bg-nets-red/5 border border-nets-red/20" : "bg-card"}`}
                >
                  <span className="text-sm font-bold text-nets-navy">
                    {memberName(circle, s.fromId).replace(" (You)", "You")}
                  </span>
                  <div className="flex flex-1 items-center gap-2 text-muted-foreground">
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
            {mySettlement && (
              <p className="mt-3 text-center text-xs text-nets-red font-semibold">
                Your share: ${fmt(mySettlement.amount)} — paid via eNETS
              </p>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-3xl bg-nets-green/10 border border-nets-green/30 p-6 text-center">
            <Check className="h-8 w-8 text-nets-green mx-auto" />
            <p className="mt-2 text-sm font-bold text-nets-green">Everyone is already square!</p>
            <p className="text-xs text-muted-foreground mt-1">The wallet handled it perfectly — no transfers needed.</p>
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm font-semibold text-nets-red">{error}</p>}

        <p className="mt-5 text-center text-xs text-muted-foreground/60 px-4">
          NETS computes the minimum number of transfers so everyone settles with one tap.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <AnimatePresence mode="wait">
          {step === "paying" || step === "redirecting" ? (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 py-4 text-base font-bold text-nets-navy">
              <Wallet className="h-5 w-5 animate-pulse text-nets-red" />
              {step === "paying" ? "Preparing payment…" : "Redirecting to NETS…"}
            </motion.div>
          ) : (
            <motion.button
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClickReconcile}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
            >
              <Zap className="h-5 w-5" />
              {mySettlement ? `Reconcile Now · $${fmt(mySettlement.amount)}` : "Confirm Reconciliation"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Payment method sheet */}
      <AnimatePresence>
        {step === "select" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/40" onClick={() => setStep("idle")} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <p className="mb-1 text-center text-base font-bold text-nets-navy">Pay via eNETS</p>
              <p className="mb-4 text-center text-xs text-muted-foreground">Settling ${fmt(mySettlement!.amount)}</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.mode}
                    onClick={() => handleReconcile(method.mode)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-nets-page p-3 active:opacity-70"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: method.color }}>
                      <method.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-nets-navy">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-nets-navy/95 text-white"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green"
            >
              <Check className="h-10 w-10" />
            </motion.span>
            <p className="mt-4 text-lg font-extrabold">Circle settled.</p>
            <p className="text-sm text-white/70">No chasing needed.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Settle (legacy — for non-wallet circles) ─────────────────────────────────

const PAYMENT_METHODS = [
  { mode: "QR", name: "PayNow", desc: "Instant transfer via QR scan", icon: QrCode, color: "var(--nets-blue)" },
  { mode: "CC", name: "Credit / Debit Card", desc: "Visa, Mastercard, AMEX", icon: CreditCard, color: "var(--nets-navy)" },
  { mode: "DD", name: "NETS Debit", desc: "Direct from your bank account", icon: Wallet, color: "var(--nets-red)" },
]

type NetsFormData = { txnReq: string; mac: string; keyId: string; gatewayUrl: string }
type Step = "idle" | "select" | "paying" | "redirecting"

function CircleSettle({ circle, onBack, onDone }: { circle: Circle; onBack: () => void; onDone: () => void }) {
  const settlements = computeSettlements(circle)
  const [step, setStep] = useState<Step>("idle")
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [netsForm, setNetsForm] = useState<NetsFormData | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (netsForm && formRef.current) {
      setTimeout(() => formRef.current?.submit(), 100)
    }
  }, [netsForm])

  const handleSettle = async (paymentMode: string) => {
    try {
      setStep("paying")
      setError(null)

      const createRes = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: circle.id, settlements }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || "Failed to create settlements")

      type SettlementRecord = { id: string; fromMemberId: string; toMemberId: string; amount: number }
      const mySettlement = (createData.settlements as SettlementRecord[]).find((s) => s.fromMemberId === "alex")

      if (!mySettlement) {
        setPaid(true)
        setTimeout(onDone, 1100)
        return
      }

      const payRes = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: mySettlement.id, amount: mySettlement.amount, paymentMode }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error || "Failed to prepare payment")

      // No optimistic balance write here: the NETS callback is the single
      // source of truth and deducts once in Supabase. Writing optimistically
      // would double-deduct (callback reads the already-reduced balance), and
      // the client state is discarded on the redirect anyway.
      setStep("redirecting")
      setNetsForm(payData.paymentInitiation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
      setStep("idle")
    }
  }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      {netsForm && (
        <form ref={formRef} method="POST" action={netsForm.gatewayUrl} style={{ display: "none" }}>
          <input type="hidden" name="txnReq" value={netsForm.txnReq} />
          <input type="hidden" name="mac" value={netsForm.mac} />
          <input type="hidden" name="keyId" value={netsForm.keyId} />
        </form>
      )}

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
              <span className="text-sm font-bold text-nets-navy">{memberName(circle, s.fromId).replace(" (You)", "You")}</span>
              <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <ArrowRight className="h-4 w-4" />
                <span className="h-px flex-1 bg-border" />
              </div>
              <span className="text-sm font-bold text-nets-navy">{memberName(circle, s.toId).replace(" (You)", "You")}</span>
              <span className="ml-1 rounded-full bg-nets-red/10 px-2.5 py-1 text-sm font-extrabold text-nets-red">
                ${fmt(s.amount)}
              </span>
            </motion.div>
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm font-semibold text-nets-red">{error}</p>}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <AnimatePresence mode="wait">
          {step === "paying" || step === "redirecting" ? (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 py-4 text-base font-bold text-nets-navy">
              <Wallet className="h-5 w-5 animate-pulse text-nets-red" />
              {step === "paying" ? "Preparing payment…" : "Redirecting to NETS…"}
            </motion.div>
          ) : (
            <motion.button
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStep("select")}
              disabled={paid}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-60"
            >
              {paid ? <Check className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
              {paid ? "Settled!" : "Settle all in one tap"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step === "select" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/40" onClick={() => setStep("idle")} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <p className="mb-4 text-center text-base font-bold text-nets-navy">Pay via</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.mode}
                    onClick={() => handleSettle(method.mode)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-nets-page p-3 active:opacity-70"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: method.color }}>
                      <method.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-nets-navy">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("idle")} className="mt-4 w-full py-2 text-sm text-muted-foreground">Cancel</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-nets-navy/95 text-white"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green"
            >
              <Check className="h-10 w-10" />
            </motion.span>
            <p className="mt-4 text-lg font-extrabold">Circle settled.</p>
            <p className="text-sm text-white/70">No chasing needed.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
