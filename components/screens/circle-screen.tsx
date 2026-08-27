"use client"

import { motion, AnimatePresence } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Plus, Users, ChevronRight, ChevronLeft, Check, Sparkles,
  ArrowRight, UserPlus, Receipt, Wallet,
  ShieldCheck, Lightbulb, QrCode, CreditCard,
  Bell, Zap, X, Minus, Smartphone, Store,
  Star, AlertTriangle, Info, MapPin, Clock,
  Download, FileText, Tag, PenLine, ScanLine,
} from "lucide-react"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import { NetsQrPayment } from "../nets-qr-payment"
import { useCircleData } from "../circle-data-context"
import {
  circleTotal, perHead, computeSettlements, memberName,
  circleRecommendations, confidenceConfig, affordabilityMessage,
  activities, computeConfidencePercent, confidenceLabel, confidenceColor, PROFILE_RANGES,
  computeCircleCheck, circleCheckConfig, circleCheckPrivacyNote,
  spendBandSourceLabel, spendBandSourceNote, privateCommitmentGuidance,
  type Circle, type CircleExpense, type ComfortProfile, type Activity,
  type CircleCheckOutcome, type SpendBand, type NegotiationOption, type CircleReadyOffer,
} from "@/lib/nets-data"

const fmt = (n: number) =>
  n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusLabel: Record<Circle["status"], string> = {
  planning: "Planning",
  active: "Live now",
  settled: "Settled",
}

// ─── Main Screen (router) ────────────────────────────────────────────────────

export function CircleScreen() {
  const { circleView, setCircleView, activeCircleId, openCircle } = useNav()
  const { circles, createCircle, activateCircle, settleCircle, setCircleProfile, createWallet, addCircleExpense } = useCircleData()
  const [pendingCircleId, setPendingCircleId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  // Private commitment amount — stored locally, never sent to other members (concept doc §1.3)
  const [myCommitment, setMyCommitment] = useState(50)

  const circle = useMemo(
    () => (activeCircleId ? circles.find((c) => c.id === activeCircleId) : circles[0]) ?? circles[0],
    [activeCircleId, circles]
  )
  const pendingCircle = pendingCircleId ? circles.find((c) => c.id === pendingCircleId) : null
  const selectedActivity = selectedActivityId ? activities.find((a) => a.id === selectedActivityId) : undefined

  // Normalise legacy view names to V2 names
  const resolvedView =
    circleView === "comfort" ? "commitment" :
    circleView === "confidence" ? "check" :
    circleView

  return (
    <div className="flex h-full flex-col bg-nets-page">
      <AnimatePresence mode="wait">
        {resolvedView === "list" && (
          <CircleList key="list" onOpen={openCircle} onCreate={() => setCircleView("create")} circles={circles} />
        )}
        {resolvedView === "create" && (
          <CircleCreate
            key="create"
            onBack={() => setCircleView("list")}
            onDone={(name, selected) => {
              const id = createCircle(name, selected)
              setPendingCircleId(id)
              // V2 flow: create → private commitment check (concept doc §1.3)
              setCircleView("commitment")
            }}
          />
        )}
        {/* V2: Private Commitment — dollar amount each member privately commits (concept doc §1.3) */}
        {resolvedView === "commitment" && pendingCircle && (
          <PrivateCommitmentView
            key="commitment"
            circle={pendingCircle}
            initialAmount={myCommitment}
            onBack={() => setCircleView("create")}
            onDone={(amount) => {
              setMyCommitment(amount)
              // Store profile for backward-compat with experience matching algorithm
              setCircleProfile(pendingCircle.id, "balanced", ["Food", "Travel"])
              setCircleView("experience")
            }}
          />
        )}
        {/* Experience Match with Spend Band metadata (concept doc §1.2) */}
        {resolvedView === "experience" && pendingCircle && (
          <ExperienceMatchView
            key="experience"
            circle={pendingCircle}
            onBack={() => setCircleView("commitment")}
            onSelect={(activityId) => {
              setSelectedActivityId(activityId)
              // V2 flow: experience → Circle Check outcome (concept doc §1.4)
              setCircleView("check")
            }}
          />
        )}
        {/* V2: Circle Check — Circle Ready / Adjust Plan / Not Aligned (concept doc §1.4–1.6) */}
        {resolvedView === "check" && pendingCircle && (
          <CircleCheckView
            key="check"
            circle={pendingCircle}
            activity={selectedActivity}
            myCommitment={myCommitment}
            onBack={() => setCircleView("experience")}
            onProceed={() => setCircleView("wallet-setup")}
          />
        )}
        {resolvedView === "wallet-setup" && pendingCircle && (
          <WalletSetupView
            key="wallet-setup"
            circle={pendingCircle}
            activity={selectedActivity}
            onBack={() => setCircleView("check")}
            onSkip={() => {
              activateCircle(pendingCircle.id, false)
              setPendingCircleId(null)
              setSelectedActivityId(null)
              openCircle(pendingCircle.id)
            }}
            onDone={(target, perPerson) => {
              createWallet(pendingCircle.id, target, perPerson)
              activateCircle(pendingCircle.id, true)
              setPendingCircleId(null)
              setSelectedActivityId(null)
              openCircle(pendingCircle.id)
            }}
          />
        )}
        {resolvedView === "detail" && (
          <CircleDetail
            key="detail"
            circle={circle}
            myCommitment={circle.myCommitmentAmount ?? myCommitment}
            onBack={() => setCircleView("list")}
            onSettle={() => setCircleView("settle")}
            onReconcile={() => setCircleView("reconcile")}
            onAddExpense={(expense, deduct) => addCircleExpense(circle.id, expense, deduct)}
          />
        )}
        {resolvedView === "settle" && (
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
        {resolvedView === "reconcile" && (
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

// ─── Shared sub-components ────────────────────────────────────────────────────

function Header({ title, onBack, subtitle }: { title: string; onBack: () => void; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-3 pt-1">
      <button onClick={onBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-border">
        <ChevronLeft className="h-5 w-5 text-nets-navy" />
      </button>
      <div>
        <h1 className="text-lg font-extrabold text-nets-navy leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
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

// Spend Band badge used across multiple views (concept doc §1.2)
function SpendBandBadge({ band }: { band: SpendBand }) {
  const srcColor =
    band.source === "merchant-confirmed" ? "text-nets-green bg-nets-green/10" :
    band.source === "nets-insights" ? "text-nets-blue bg-nets-blue/10" :
    "text-amber-700 bg-amber-50"
  const srcIcon =
    band.source === "merchant-confirmed" ? <Store className="h-2.5 w-2.5" /> :
    band.source === "nets-insights" ? <Sparkles className="h-2.5 w-2.5" /> :
    <Info className="h-2.5 w-2.5" />
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${srcColor}`}>
      {srcIcon} {spendBandSourceLabel(band.source)}
    </span>
  )
}

// Journey stage indicator — shows which of the 3 stages the user is in
function JourneySteps({ active }: { active: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Circle Check", sub: "Before" },
    { n: 2, label: "Circle Pay", sub: "During" },
    { n: 3, label: "Circle Close", sub: "After" },
  ] as const
  return (
    <div className="mx-5 mb-4 flex items-center gap-0">
      {steps.map((s, i) => {
        const done = s.n < active
        const current = s.n === active
        return (
          <div key={s.n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold transition-all ${done ? "bg-nets-green text-white" : current ? "bg-nets-navy text-white" : "bg-border text-muted-foreground"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : s.n}
              </div>
              <p className={`text-[9px] font-bold text-center leading-tight ${current ? "text-nets-navy" : done ? "text-nets-green" : "text-muted-foreground"}`}>{s.label}</p>
              <p className={`text-[8px] text-center ${current ? "text-nets-navy/60" : "text-muted-foreground/60"}`}>{s.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 mb-6 ${done ? "bg-nets-green" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Circle List ──────────────────────────────────────────────────────────────

function CircleList({ onOpen, onCreate, circles }: { onOpen: (id: string) => void; onCreate: () => void; circles: Circle[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col">
      <div className="bg-nets-page">
        <StatusBar />
        <div className="px-5 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <img src="/nets-circle-logo.jpg" alt="NETS Circle" className="h-11 w-11 shrink-0 object-contain mix-blend-multiply" />
            <h1 className="text-xl font-extrabold text-nets-navy">NETS Circle</h1>
            <span className="rounded-full bg-nets-red/10 px-2 py-0.5 text-[10px] font-bold text-nets-red">NEW</span>
          </div>
          <p className="text-sm text-muted-foreground">Check privately. Plan confidently. Pay fairly. Settle simply.</p>
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
            NETS checks privately, tracks spending, and settles without any chasing.
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
            // V2: show Circle Check outcome for planning circles; confidence for legacy
            const checkCfg = c.checkOutcome ? circleCheckConfig(c.checkOutcome) : null
            const legacyCfg = confidenceConfig(c.circleConfidence)
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
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${checkCfg ? `${checkCfg.bg} ${checkCfg.text}` : `${legacyCfg.bg} ${legacyCfg.text}`}`}>
                      <span>{checkCfg ? checkCfg.icon : legacyCfg.icon}</span>{" "}
                      {checkCfg ? checkCfg.label : legacyCfg.label}
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
                      <p className="text-sm font-extrabold text-nets-navy">
                        {c.spendBand ? `$${c.spendBand.min}–$${c.spendBand.max}` : `~$${c.estimatedCostPerPerson}`}
                      </p>
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

// ─── Circle Create ────────────────────────────────────────────────────────────
// V2: three creation modes + core vs optional activities (concept doc §1.1)

type CreateMode = "custom" | "nets-supported" | "ai-assisted"

const NETS_SUPPORTED_PACKAGES = [
  { id: "ns1", title: "Dinner + Bowling", merchant: "Hub Leisure", price: "$45–$55/pax", emoji: "🎳", core: ["Dinner"], optional: ["Bowling"] },
  { id: "ns2", title: "Cafe Hop Bundle", merchant: "Haji Lane", price: "$30–$40/pax", emoji: "☕", core: ["Cafe visits"], optional: ["Dessert"] },
  { id: "ns3", title: "Movie + Supper", merchant: "Shaw / Cathay", price: "$28–$38/pax", emoji: "🎬", core: ["Movie tickets"], optional: ["Supper"] },
  { id: "ns4", title: "Escape Room + Dinner", merchant: "Lost SG", price: "$65–$80/pax", emoji: "🔐", core: ["Escape room"], optional: ["Dinner"] },
]

function CircleCreate({ onBack, onDone }: { onBack: () => void; onDone: (name: string, selected: string[]) => void }) {
  const [mode, setMode] = useState<CreateMode>("custom")
  const [name, setName] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggested, setAiSuggested] = useState(false)
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

  // Simulates AI-Assisted Discovery: AI recommends, organiser decides (concept doc §1.1)
  function handleAiSearch() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setTimeout(() => {
      setAiLoading(false)
      setAiSuggested(true)
      setName("Saturday Outing")
    }, 1400)
  }

  const MODES: { id: CreateMode; label: string; desc: string }[] = [
    { id: "custom", label: "Custom Plan", desc: "Pick activities yourself" },
    { id: "nets-supported", label: "NETS-Supported", desc: "Merchant packages" },
    { id: "ai-assisted", label: "AI-Assisted", desc: "Describe your outing" },
  ]

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Create a Circle" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* V2: three creation modes (concept doc §1.1) */}
        <div className="flex gap-2 mb-5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 rounded-2xl border-2 px-2 py-2.5 text-center transition-all ${
                mode === m.id ? "border-nets-navy bg-nets-navy/5" : "border-border bg-card"
              }`}
            >
              <p className={`text-[11px] font-bold ${mode === m.id ? "text-nets-navy" : "text-muted-foreground"}`}>{m.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
            </button>
          ))}
        </div>

        {mode === "custom" && (
          <>
            <label className="text-sm font-bold text-nets-navy">What's the occasion?</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sentosa Beach Day"
              className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-nets-navy outline-none focus:border-nets-blue"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p} onClick={() => setName(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${name === p ? "bg-nets-navy text-white" : "bg-card text-nets-navy shadow-sm"}`}>
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "nets-supported" && (
          <>
            <p className="text-xs text-muted-foreground mb-3">Select a merchant-backed package with confirmed pricing</p>
            <div className="space-y-2">
              {NETS_SUPPORTED_PACKAGES.map((pkg) => (
                <button key={pkg.id} onClick={() => setName(pkg.title)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${name === pkg.title ? "border-nets-navy bg-nets-navy/5" : "border-border bg-card"}`}>
                  <span className="text-2xl">{pkg.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-nets-navy">{pkg.title}</p>
                    <p className="text-xs text-muted-foreground">{pkg.merchant} · {pkg.price}</p>
                    <div className="mt-1 flex gap-1">
                      {pkg.core.map((c) => <span key={c} className="rounded-full bg-nets-green/10 px-1.5 py-0.5 text-[9px] font-bold text-nets-green">Core: {c}</span>)}
                      {pkg.optional.map((o) => <span key={o} className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Optional: {o}</span>)}
                    </div>
                  </div>
                  {name === pkg.title && <Check className="h-4 w-4 text-nets-navy shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "ai-assisted" && (
          <>
            {/* V2: AI assists. The organiser and members decide. (concept doc §1.1) */}
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-nets-blue/10 border border-nets-blue/20 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-nets-blue shrink-0" />
              <p className="text-[11px] text-nets-blue leading-relaxed">
                AI assists with suggestions. You and your group decide.
              </p>
            </div>
            <label className="text-sm font-bold text-nets-navy">Describe your outing</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Affordable Saturday outing for four students — something fun that won't break the bank"
              rows={3}
              className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-nets-navy outline-none focus:border-nets-blue resize-none"
            />
            <button
              onClick={handleAiSearch}
              disabled={!aiPrompt.trim() || aiLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {aiLoading ? (
                <><span className="animate-pulse">Finding suggestions…</span></>
              ) : (
                <><Sparkles className="h-4 w-4" /> Find experiences</>
              )}
            </button>
            {aiSuggested && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
                <p className="text-xs font-bold text-nets-navy">AI suggests — you choose:</p>
                {[
                  { name: "Cafe Hop + Board Games", desc: "$30–$45/pax · Affordable, fun indoors" },
                  { name: "Night Cycling + Supper", desc: "$20–$35/pax · Active + food" },
                  { name: "Movie Night", desc: "$20–$35/pax · Classic chill outing" },
                ].map((s) => (
                  <button key={s.name} onClick={() => setName(s.name)}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 p-3 text-left transition-all ${name === s.name ? "border-nets-navy bg-nets-navy/5" : "border-border bg-card"}`}>
                    <div>
                      <p className="text-sm font-bold text-nets-navy">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                    {name === s.name && <Check className="h-4 w-4 text-nets-navy shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </>
        )}

        <label className="mt-6 block text-sm font-bold text-nets-navy">Invite friends</label>
        <div className="mt-2 space-y-2">
          {allFriends.map((f) => {
            const on = selected.includes(f.id)
            return (
              <button key={f.id} onClick={() => toggle(f.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
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

        {mode === "custom" && (
          <>
            <div className="mt-6 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-nets-red" />
              <h3 className="text-sm font-bold text-nets-navy">Recommended for your group</h3>
            </div>
            <div className="mt-2 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {circleRecommendations.map((r) => (
                <div key={r.id} className="min-w-[62%] rounded-2xl bg-card p-3 shadow-sm">
                  <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: r.color }}>{r.tag}</span>
                  <p className="mt-2 text-sm font-bold text-nets-navy">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.meta}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => onDone(name, selected)}
          disabled={!name || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
        >
          Next: Your Commitment ({selected.length + 1} people) <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Private Commitment View ──────────────────────────────────────────────────
// V2 concept doc §1.3: replaces ComfortProfile tiers.
// User declares what they're comfortable committing — a dollar amount, not a tier.
// NETS does NOT inspect salary, bank balance, credit score, or spending history.
// Nobody else sees this value — it's used only to compute the group-level outcome.

function PrivateCommitmentView({
  circle, initialAmount, onBack, onDone,
}: {
  circle: Circle
  initialAmount: number
  onBack: () => void
  onDone: (amount: number) => void
}) {
  const [amount, setAmount] = useState(initialAmount)

  const step = 10
  const min = 10
  const max = 300

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Your Commitment" onBack={onBack} subtitle="Private · Only you see this" />
        <JourneySteps active={1} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {/* Privacy declaration */}
        <div className="flex items-center gap-2 rounded-2xl bg-nets-navy/5 border border-nets-navy/10 px-4 py-3 mb-5">
          <ShieldCheck className="h-5 w-5 text-nets-navy shrink-0" />
          <div>
            <p className="text-xs font-bold text-nets-navy">Completely private</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No one else in the Circle sees this number — not even the organiser.
            </p>
          </div>
        </div>

        {/* Dollar commitment input */}
        <div className="rounded-3xl bg-nets-navy p-6 text-white text-center">
          <p className="text-xs text-white/60 font-semibold uppercase tracking-wide mb-1">
            What are you comfortable committing?
          </p>
          <p className="text-6xl font-extrabold tracking-tight mt-3">
            S${amount}
          </p>
          <p className="text-sm text-white/50 mt-1">per person</p>

          {/* Range slider */}
          <div className="mt-5 px-2">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-white h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>S${min}</span>
              <span>S${max}</span>
            </div>
          </div>

          {/* Comfort emoji indicator */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {[
              { emoji: "😄", label: "Very comfortable", threshold: 120 },
              { emoji: "🙂", label: "Comfortable", threshold: 80 },
              { emoji: "😐", label: "Okay", threshold: 50 },
              { emoji: "😟", label: "A stretch", threshold: 20 },
              { emoji: "😬", label: "Too much", threshold: 0 },
            ].map((e) => {
              const active = amount >= e.threshold
              return (
                <button
                  key={e.emoji}
                  onClick={() => setAmount(e.threshold + 10 <= max ? e.threshold + 10 : max)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all ${active && amount >= e.threshold && amount < e.threshold + 40 ? "bg-white/25 scale-125" : "bg-white/10 opacity-50"}`}
                  title={e.label}
                >
                  {e.emoji}
                </button>
              )
            })}
          </div>

          {/* Fine-tune +/- */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setAmount((a) => Math.max(min, a - step))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-xs text-white/40">fine tune ± $10</span>
            <button
              onClick={() => setAmount((a) => Math.min(max, a + step))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Privacy principles */}
        <div className="mt-5 space-y-2">
          <p className="text-xs font-bold text-nets-navy mb-2">NETS does NOT look at:</p>
          {[
            "Your bank balance or savings",
            "Your salary or income",
            "Your credit score",
            "Your spending history",
            "An AI-generated affordability score",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 shadow-sm">
              <X className="h-3.5 w-3.5 text-nets-red shrink-0" />
              <p className="text-xs text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground/70 px-4 leading-relaxed">
          NETS asks "What are you comfortable committing?" — not "What can you afford?"
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => onDone(amount)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-4 text-base font-bold text-white"
        >
          Find Experiences <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Experience Match View ────────────────────────────────────────────────────
// V2: Now shows Spend Bands with source metadata alongside Circle Confidence (concept doc §1.2)

function ExperienceMatchView({ circle, onBack, onSelect }: {
  circle: Circle
  onBack: () => void
  onSelect: (activityId: string) => void
}) {
  const profile = circle.comfortProfile ?? "balanced"
  const groupSize = circle.members.length
  const interests = circle.interestTags ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        <Header title="Choose an Experience" onBack={onBack} subtitle={`Group of ${groupSize + 1}`} />
        <JourneySteps active={1} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {scored.map((a, i) => {
          const color = confidenceColor(a.pct)
          const isTop = i === 0
          const isExpanded = expandedId === a.id
          return (
            <div key={a.id}>
              {isTop && (
                <div className="mb-1 ml-1">
                  <span className="rounded-full bg-nets-red px-2.5 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wide">
                    ★ Best match for your group
                  </span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-3xl bg-card shadow-sm overflow-hidden ${isTop ? "ring-2 ring-nets-red/30" : ""}`}
              >
                <button
                  onClick={() => onSelect(a.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nets-navy/5 text-2xl">
                    {a.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-nets-navy">{a.name}</p>
                    {/* V2: Spend Band with source badge (concept doc §1.2) */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs font-semibold text-nets-navy">
                        S${a.spendBand.min}–S${a.spendBand.max}<span className="text-muted-foreground font-normal"> /person</span>
                      </p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <SpendBandBadge band={a.spendBand} />
                      {a.crossBorder && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Cross-border</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold text-white" style={{ backgroundColor: color }}>
                      {a.pct}%
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold text-center leading-tight">Circle<br />Check</span>
                  </div>
                </button>
                {/* Expandable spend band detail */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex w-full items-center gap-2 border-t border-border/50 px-4 py-2 text-left"
                >
                  <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">{isExpanded ? "Hide" : "View"} spend band details</span>
                  <ChevronRight className={`h-3 w-3 ml-auto text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/30 px-4 py-3 bg-nets-page/50 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Source</span>
                          <SpendBandBadge band={a.spendBand} />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Last updated</span>
                          <span className="font-semibold text-nets-navy">{a.spendBand.lastUpdated}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Band confidence</span>
                          <span className={`font-bold ${a.spendBand.confidenceLevel === "high" ? "text-nets-green" : a.spendBand.confidenceLevel === "moderate" ? "text-amber-600" : "text-nets-red"}`}>
                            {a.spendBand.confidenceLevel.charAt(0).toUpperCase() + a.spendBand.confidenceLevel.slice(1)}
                          </span>
                        </div>
                        {a.spendBand.exclusions && (
                          <p className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-2">{a.spendBand.exclusions}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 pt-1">{spendBandSourceNote(a.spendBand.source)}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Circle Check View ────────────────────────────────────────────────────────
// V2 concept doc §1.4–1.6: replaces the Confidence % ring.
// Shows one of three outcomes + Dynamic Negotiation + Circle-Ready Offers.
// Privacy guarantee: nobody learns who caused the result.

function CircleCheckView({
  circle, activity, myCommitment, onBack, onProceed,
}: {
  circle: Circle
  activity?: Activity
  myCommitment: number
  onBack: () => void
  onProceed: () => void
}) {
  const spendBand = activity?.spendBand ?? {
    min: circle.estimatedCostPerPerson * 0.9,
    max: circle.estimatedCostPerPerson * 1.1,
    source: "organiser-estimate" as const,
    lastUpdated: "Today",
    confidenceLevel: "moderate" as const,
  }

  // Compute outcome from user's private commitment vs the spend band (concept doc §1.4)
  const outcome: CircleCheckOutcome = circle.checkOutcome ??
    computeCircleCheck(spendBand, myCommitment)
  const cfg = circleCheckConfig(outcome)
  const privacyNote = circleCheckPrivacyNote(outcome)

  // Dynamic negotiation options (concept doc §1.5)
  const negotiationOptions: NegotiationOption[] = circle.negotiationOptions ?? (
    activity && outcome !== "circle-ready" ? [
      {
        id: "n1",
        label: `Make one activity optional`,
        type: "make-optional",
        newSpendBand: { min: Math.round(spendBand.min * 0.8), max: Math.round(spendBand.max * 0.8) },
      },
      {
        id: "n2",
        label: "Select an off-peak time slot",
        type: "change-timeslot",
        newSpendBand: { min: Math.round(spendBand.min * 0.85), max: Math.round(spendBand.max * 0.85) },
      },
    ] : []
  )

  // Circle-Ready Offers (concept doc §1.6)
  const circleReadyOffers: CircleReadyOffer[] = circle.circleReadyOffers ?? []

  const [showNegotiation, setShowNegotiation] = useState(outcome === "adjust-plan")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [acceptedOffer, setAcceptedOffer] = useState<string | null>(null)

  const negotiationTypeIcon: Record<NegotiationOption["type"], string> = {
    "make-optional": "◎",
    "change-timeslot": "🕐",
    "change-merchant": "🏪",
    "fixed-price-package": "📦",
    "reduce-activity": "↓",
    "lower-cost-transport": "🚌",
  }

  const offerTagLabel: Record<CircleReadyOffer["tag"], string> = {
    "group-set": "Group Set",
    "student-package": "Student Package",
    "off-peak": "Off-Peak",
    "bundle": "Bundle Deal",
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
        <Header title="Circle Check" onBack={onBack} />
        <JourneySteps active={1} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {/* Outcome hero card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-3xl border-2 p-5 text-center ${cfg.bg} ${cfg.border}`}
        >
          <span className={`inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl font-extrabold text-white mx-auto`}
            style={{ backgroundColor: cfg.color }}>
            {cfg.icon}
          </span>
          <p className={`mt-3 text-xl font-extrabold ${cfg.text}`}>{cfg.label}</p>
          {activity && (
            <p className="mt-1 text-sm font-semibold text-nets-navy">{activity.emoji} {activity.name}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed px-2">{cfg.message}</p>

          {/* Spend Band summary */}
          <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Expected spend</span>
              <SpendBandBadge band={spendBand} />
            </div>
            <p className="text-lg font-extrabold text-nets-navy mt-0.5">
              S${spendBand.min}–S${spendBand.max} <span className="text-sm font-normal text-muted-foreground">per person</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Updated {spendBand.lastUpdated}</p>
          </div>
        </motion.div>

        {/* Private commitment status — only the current user sees this (concept doc §2.4) */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-3 rounded-3xl bg-nets-navy p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-white/60" />
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Private · Only you see this</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">Your commitment</span>
            <span className="text-base font-extrabold text-white">S${myCommitment}/person</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm text-white/80">Spend band</span>
            <span className="text-base font-extrabold text-white">S${spendBand.min}–S${spendBand.max}</span>
          </div>
          <div className={`mt-3 rounded-xl px-3 py-2 ${myCommitment >= spendBand.min ? "bg-nets-green/20" : "bg-nets-red/20"}`}>
            <p className="text-xs font-semibold text-white leading-relaxed">
              {myCommitment >= spendBand.max
                ? "✓ You're comfortably within range"
                : myCommitment >= spendBand.min
                ? "~ You're within range, though near the lower end"
                : "! This plan is above your stated commitment"}
            </p>
          </div>
          <p className="mt-3 text-[10px] text-white/40 leading-relaxed">
            Based on your declared commitment only — no financial data is shown to anyone.
          </p>
        </motion.div>

        {/* Privacy note */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 rounded-2xl bg-nets-blue/5 border border-nets-blue/15 px-4 py-3"
        >
          <p className="text-[11px] text-nets-blue/80 leading-relaxed">{privacyNote}</p>
        </motion.div>

        {/* V2: Dynamic Circle Negotiation — when "Adjust Plan" (concept doc §1.5) */}
        {negotiationOptions.length > 0 && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3">
            <button
              onClick={() => setShowNegotiation((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-nets-navy">Ways to improve alignment</span>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showNegotiation ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showNegotiation && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 space-y-2">
                    {/* Privacy framing: never blame an individual (concept doc §1.5) */}
                    <p className="text-[10px] text-muted-foreground px-1">
                      These are group-level suggestions. Nobody is identified as the reason.
                    </p>
                    {negotiationOptions.map((opt) => {
                      const isSelected = selectedOption === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOption(isSelected ? null : opt.id)}
                          className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${isSelected ? "border-amber-400 bg-amber-50" : "border-border bg-card"}`}
                        >
                          <span className="mt-0.5 text-base shrink-0">{negotiationTypeIcon[opt.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-nets-navy">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              New Spend Band: S${opt.newSpendBand.min}–S${opt.newSpendBand.max}/person
                            </p>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* V2: Circle-Ready Offers (concept doc §1.6) */}
        {circleReadyOffers.length > 0 && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.32 }} className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
              <p className="text-sm font-bold text-nets-navy">Circle-Ready Offers</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
              Participating merchants have offers sized to bring this Circle into alignment.
              They receive no individual commitment information.
            </p>
            <div className="space-y-2">
              {circleReadyOffers.map((offer) => {
                const isAccepted = acceptedOffer === offer.id
                return (
                  <div key={offer.id} className={`rounded-2xl border-2 p-4 transition-all ${isAccepted ? "border-nets-green bg-nets-green/5" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${isAccepted ? "bg-nets-green text-white" : "bg-amber-500 text-white"}`}>
                            {offerTagLabel[offer.tag]}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-nets-navy">{offer.merchantName}</p>
                        {offer.items.map((item) => (
                          <p key={item.label} className="text-xs text-muted-foreground mt-0.5">
                            {item.label}: S${item.amount}/person
                          </p>
                        ))}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold text-nets-navy">S${offer.combinedMin}–{offer.combinedMax}</p>
                        <p className="text-[10px] text-muted-foreground">/person</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAcceptedOffer(isAccepted ? null : offer.id)}
                      className={`mt-3 w-full rounded-xl py-2 text-xs font-bold transition-colors ${isAccepted ? "bg-nets-green text-white" : "bg-amber-500 text-white"}`}
                    >
                      {isAccepted ? "✓ Offer selected — Circle Ready" : "Select this offer"}
                    </button>
                  </div>
                )
              })}
            </div>
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
          <Wallet className="h-5 w-5" /> Set Up & Activate Circle
        </button>
      </div>
    </motion.div>
  )
}

// ─── Wallet Setup View ────────────────────────────────────────────────────────

function WalletSetupView({ circle, activity, onBack, onSkip, onDone }: {
  circle: Circle
  activity?: Activity
  onBack: () => void
  onSkip: () => void
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
        <Header title="Shared Trip Wallet" onBack={onBack} subtitle="Optional — you can skip this" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        <div className="rounded-3xl bg-nets-navy p-5 text-white text-center">
          <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">Shared pool</p>
          <p className="mt-3 text-5xl font-extrabold tracking-tight">${fmt(total)}</p>
          <p className="text-sm text-white/70 mt-1">total · ${fmt(perPerson)} / person</p>
          <div className="mt-5 flex items-center justify-center gap-5">
            <button onClick={() => setTotal((t) => Math.max(circle.members.length * 10, t - 50))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25">
              <Minus className="h-5 w-5" />
            </button>
            <span className="text-sm text-white/50">± $50</span>
            <button onClick={() => setTotal((t) => t + 50)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25">
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
            Funds pool via NETS. As the group spends, the wallet deducts automatically.
            Any surplus is returned proportionally at the end.
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3 space-y-2">
        <button
          onClick={() => onDone(total, perPerson)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
        >
          <Wallet className="h-5 w-5" /> Create Wallet · ${fmt(total)}
        </button>
        <button onClick={onSkip} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-muted-foreground">
          Skip — settle manually later
        </button>
      </div>
    </motion.div>
  )
}

// ─── Circle Detail (Circle Pay) ───────────────────────────────────────────────
// V2 concept doc §2: two modes — Integrated Merchant and Universal Merchant.
// Shows private real-time commitment guidance only to the current user (§2.4).

type PayMode = "integrated" | "universal"

// Simulated Merchant Push items (Integrated mode — concept doc §2.2)
const MERCHANT_PUSH_ITEMS = [
  { id: "mp1", name: "Ramen", price: 18.0, assignedTo: "alex" },
  { id: "mp2", name: "Curry", price: 15.0, assignedTo: "bryan" },
  { id: "mp3", name: "Steak", price: 28.0, assignedTo: "cheryl" },
  { id: "mp4", name: "Noodles", price: 17.0, assignedTo: "dinesh" },
  { id: "mp5", name: "Drinks × 4", price: 16.0, assignedTo: null }, // shared
  { id: "mp6", name: "Fries (shared)", price: 6.0, assignedTo: null }, // shared
]

// Simulated Auto-Detection events (Circle-Aware Expense Recognition — concept doc §3.1)
const SIMULATED_PAYMENTS = [
  { id: "sim-grab", label: "Simulate Grab $35", description: "Grab ride", merchant: "Grab", amount: 35.0, category: "Transport" },
  { id: "sim-arcade", label: "Simulate Arcade $40", description: "Arcade tickets", merchant: "Arcade World", amount: 40.0, category: "Entertainment" },
  { id: "sim-shopping", label: "Simulate Personal Shopping $25", description: "Personal item", merchant: "Uniqlo", amount: 25.0, category: "Shopping" },
]

function CircleDetail({
  circle, myCommitment, onBack, onSettle, onReconcile, onAddExpense,
}: {
  circle: Circle
  myCommitment: number
  onBack: () => void
  onSettle: () => void
  onReconcile: () => void
  onAddExpense: (expense: Omit<CircleExpense, "id">, deductFromWallet: boolean) => void
}) {
  const total = circleTotal(circle)
  const share = perHead(circle)
  const wallet = circle.tripWallet

  const [payMode, setPayMode] = useState<PayMode>("integrated")
  const [detection, setDetection] = useState<typeof SIMULATED_PAYMENTS[0] | null>(null)
  const [participantModal, setParticipantModal] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  // ── NETS QR Scan-to-pay (Circle Pay → NETS Prepaid deduction) ──
  type ScanStep = "scanning" | "detected" | "done"
  const [scanQrOpen, setScanQrOpen] = useState(false)
  const [scanStep, setScanStep] = useState<ScanStep>("scanning")
  const [scanMerchant, setScanMerchant] = useState("")
  const [scanAmount, setScanAmount] = useState("")
  const [scanCategory, setScanCategory] = useState("Food")
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const MOCK_QRS = [
    { merchant: "Paradise Dynasty", amount: "23.50", category: "Food" },
    { merchant: "Fun World Bowling", amount: "12.00", category: "Entertainment" },
    { merchant: "7-Eleven", amount: "8.50", category: "Food" },
    { merchant: "Grab (Ride)", amount: "14.00", category: "Transport" },
    { merchant: "BreadTalk", amount: "6.00", category: "Food" },
    { merchant: "Uniqlo", amount: "35.00", category: "Shopping" },
  ]

  function openQrScanner() {
    const mock = MOCK_QRS[Math.floor(Math.random() * MOCK_QRS.length)]
    setScanMerchant(mock.merchant)
    setScanAmount(mock.amount)
    setScanCategory(mock.category)
    setScanStep("scanning")
    setScanQrOpen(true)
    scanTimerRef.current = setTimeout(() => setScanStep("detected"), 1800)
  }

  function closeQrScanner() {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    setScanQrOpen(false)
    setScanStep("scanning")
  }

  function handleQrPay() {
    const amt = parseFloat(scanAmount)
    if (!amt || amt <= 0) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    // deductFromWallet=true → context deducts from NETS Prepaid wallet + records expense
    onAddExpense(
      {
        title: `${scanMerchant} (NETS QR)`,
        merchant: scanMerchant,
        category: scanCategory,
        amount: amt,
        paidById: "alex",
        time: now,
      },
      true
    )
    setScanStep("done")
    scanTimerRef.current = setTimeout(closeQrScanner, 2200)
  }

  // Manual expense entry state
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState("")
  const [manualAmount, setManualAmount] = useState("")
  const [manualCategory, setManualCategory] = useState("Food")
  const [manualPaidBy, setManualPaidBy] = useState("alex")
  const [manualSplit, setManualSplit] = useState<string[]>(circle.members.map((m) => m.id))

  const EXPENSE_CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Accommodation", "Others"]

  function handleManualAddExpense() {
    if (!manualTitle.trim() || !manualAmount || parseFloat(manualAmount) <= 0) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense(
      { title: manualTitle, merchant: manualTitle, category: manualCategory, amount: parseFloat(manualAmount), paidById: manualPaidBy, participants: manualSplit, time: now },
      !!wallet
    )
    setManualEntryOpen(false)
    setManualTitle("")
    setManualAmount("")
    setManualCategory("Food")
  }

  // Integrated mode: Merchant Push item assignment (concept doc §2.3)
  const [itemsVisible, setItemsVisible] = useState(false)
  const [myItems, setMyItems] = useState<string[]>(["mp1"]) // Alex's claimed items

  // Universal mode: Circle Order Preview (concept doc §2.7)
  const [orderPreview, setOrderPreview] = useState<{ name: string; price: number; assignedTo: string }[]>([])
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")

  // Private real-time commitment guidance (concept doc §2.4)
  const alexShare = MERCHANT_PUSH_ITEMS
    .filter((item) => myItems.includes(item.id) || item.assignedTo === null)
    .reduce((sum, item) => {
      if (item.assignedTo === "alex") return sum + item.price
      if (item.assignedTo === null) return sum + item.price / 4 // shared equally
      return sum
    }, 0)
  const commitmentGuidance = privateCommitmentGuidance(alexShare, myCommitment)

  function handleAddAll() {
    if (!detection) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense({ title: detection.description, merchant: detection.merchant, category: detection.category, amount: detection.amount, paidById: "alex", time: now }, !!wallet)
    setDetection(null)
  }

  function handleConfirmParticipants() {
    if (!detection || selectedParticipants.length === 0) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense({ title: `${detection.description} (${selectedParticipants.length} ppl)`, merchant: detection.merchant, category: detection.category, amount: detection.amount, paidById: "alex", participants: selectedParticipants, time: now }, !!wallet)
    setDetection(null)
    setParticipantModal(false)
  }

  function addPreviewItem() {
    if (!newItemName.trim() || !newItemPrice) return
    setOrderPreview((prev) => [...prev, { name: newItemName, price: parseFloat(newItemPrice), assignedTo: "alex" }])
    setNewItemName("")
    setNewItemPrice("")
  }

  const previewTotal = orderPreview.reduce((s, i) => s + i.price, 0)
  const previewCommitmentGuidance = privateCommitmentGuidance(previewTotal, myCommitment)

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
              <p className="text-xs text-white/70">{circle.status === "planning" ? "Spend Band" : "Total tracked"}</p>
              <p className="text-3xl font-extrabold">
                {circle.status === "planning"
                  ? circle.spendBand
                    ? `S$${circle.spendBand.min}–${circle.spendBand.max}`
                    : `~S$${fmt(circle.estimatedCostPerPerson)}`
                  : `S$${fmt(total)}`}
              </p>
            </div>
            {circle.status !== "planning" && (
              <div className="text-right">
                <p className="text-xs text-white/70">Per person</p>
                <p className="text-lg font-bold">S${fmt(share)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="-mt-3 flex-1 overflow-y-auto rounded-t-3xl bg-nets-page px-5 pb-28 pt-5">
        {circle.status === "active" && <JourneySteps active={2} />}
        {/* Trip Wallet */}
        {wallet && circle.status === "active" && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 overflow-hidden rounded-3xl bg-nets-navy">
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-white/60" />
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Trip Wallet</span>
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
          </motion.div>
        )}

        {/* Members */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {/* V2: Circle Pay mode selector — Integrated vs Universal (concept doc §2) */}
        {circle.status === "active" && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }} className="mb-4">
            <p className="text-xs font-bold text-nets-navy mb-2">Circle Pay Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "integrated" as PayMode, label: "Integrated Merchant", icon: <Smartphone className="h-4 w-4" />, desc: "Merchant POS linked" },
                { id: "universal" as PayMode, label: "Any Merchant", icon: <Store className="h-4 w-4" />, desc: "Works everywhere" },
              ] as const).map((m) => (
                <button key={m.id} onClick={() => setPayMode(m.id)}
                  className={`flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-all ${payMode === m.id ? "border-nets-navy bg-nets-navy/5" : "border-border bg-card"}`}>
                  <span className={payMode === m.id ? "text-nets-navy" : "text-muted-foreground"}>{m.icon}</span>
                  <p className={`text-[11px] font-bold mt-1 ${payMode === m.id ? "text-nets-navy" : "text-muted-foreground"}`}>{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Integrated mode: Merchant Push + Item Assignment (concept doc §2.2–2.3) */}
            {payMode === "integrated" && (
              <div className="mt-3 rounded-2xl border border-nets-navy/20 bg-nets-navy/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-nets-navy" />
                    <p className="text-xs font-bold text-nets-navy">Merchant Push — Live Items</p>
                  </div>
                  <button onClick={() => setItemsVisible((v) => !v)}
                    className="text-[11px] font-semibold text-nets-blue">
                    {itemsVisible ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  Items appear here as the waiter enters them into the POS. Claim yours — shared items are split equally.
                </p>
                <AnimatePresence>
                  {itemsVisible && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-1.5 mb-3">
                        {MERCHANT_PUSH_ITEMS.map((item) => {
                          const isMine = myItems.includes(item.id)
                          const isShared = item.assignedTo === null
                          return (
                            <div key={item.id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-nets-navy">{item.name}</span>
                                {isShared && <span className="ml-1.5 text-[10px] text-muted-foreground">(shared ÷ 4)</span>}
                              </div>
                              <span className="text-xs font-bold text-nets-navy">
                                S${isShared ? fmt(item.price / 4) : fmt(item.price)}
                              </span>
                              {!isShared && (
                                <button
                                  onClick={() => setMyItems((prev) => isMine ? prev.filter((x) => x !== item.id) : [...prev, item.id])}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${isMine ? "border-nets-red bg-nets-red text-white" : "border-border"}`}>
                                  {isMine && <Check className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {/* V2: Private Real-Time Commitment Guidance — only Alex sees this (concept doc §2.4) */}
                      <div className={`rounded-xl px-3 py-2.5 border ${commitmentGuidance.ok ? "bg-nets-green/10 border-nets-green/30" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${commitmentGuidance.ok ? "text-nets-green" : "text-amber-600"}`} />
                          <p className={`text-[10px] font-semibold leading-relaxed ${commitmentGuidance.ok ? "text-nets-green" : "text-amber-700"}`}>
                            {commitmentGuidance.label}
                          </p>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">Private · Only you see this</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Universal mode: Circle Order Preview (concept doc §2.7) */}
            {payMode === "universal" && (
              <div className="mt-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-nets-navy" />
                  <p className="text-xs font-bold text-nets-navy">Circle Order Preview</p>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  Build your intended order before you order normally. This gives everyone private commitment guidance before the bill arrives.
                </p>
                <div className="space-y-1.5 mb-3">
                  {orderPreview.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl bg-nets-page px-3 py-2">
                      <span className="flex-1 text-xs font-semibold text-nets-navy">{item.name}</span>
                      <span className="text-xs font-bold text-nets-navy">S${fmt(item.price)}</span>
                      <button onClick={() => setOrderPreview((p) => p.filter((_, i) => i !== idx))}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-border text-muted-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-3">
                  <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Item name"
                    className="flex-1 rounded-xl border border-border bg-nets-page px-3 py-2 text-xs outline-none focus:border-nets-blue" />
                  <input value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="$0.00" type="number"
                    className="w-20 rounded-xl border border-border bg-nets-page px-3 py-2 text-xs outline-none focus:border-nets-blue" />
                  <button onClick={addPreviewItem} className="rounded-xl bg-nets-navy px-3 py-2">
                    <Plus className="h-4 w-4 text-white" />
                  </button>
                </div>
                {orderPreview.length > 0 && (
                  <>
                    <div className="flex justify-between text-xs font-bold text-nets-navy mb-2 border-t border-border pt-2">
                      <span>Preview total</span>
                      <span>S${fmt(previewTotal)}</span>
                    </div>
                    {/* V2: private commitment guidance before ordering (concept doc §2.7) */}
                    <div className={`rounded-xl px-3 py-2.5 border ${previewCommitmentGuidance.ok ? "bg-nets-green/10 border-nets-green/30" : "bg-amber-50 border-amber-200"}`}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${previewCommitmentGuidance.ok ? "text-nets-green" : "text-amber-600"}`} />
                        <p className={`text-[10px] font-semibold ${previewCommitmentGuidance.ok ? "text-nets-green" : "text-amber-700"}`}>
                          {previewCommitmentGuidance.label}
                        </p>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">Private · Only you see this</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* V2: Circle-Aware Expense Recognition (concept doc §3.1) */}
        {circle.status === "active" && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-800">Circle-Aware Expense Recognition</p>
            </div>
            <p className="text-[11px] text-amber-700 mb-3 leading-relaxed">
              When a NETS transaction may belong to this Circle, NETS asks the payer before adding it.
              Nothing is added automatically. Tap to simulate.
            </p>
            <div className="flex flex-col gap-2">
              {SIMULATED_PAYMENTS.map((p) => (
                <button key={p.id} onClick={() => setDetection(p)}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white active:opacity-80">
                  <Bell className="h-3.5 w-3.5 shrink-0" />
                  {p.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Expenses list */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-nets-navy">
            <Receipt className="h-4 w-4" /> Shared expenses
          </h2>
          {circle.status === "active" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-nets-green">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nets-green" />
              Tracking
            </span>
          )}
        </div>
        {circle.expenses.length === 0 ? (
          <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-nets-navy">No expenses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Expenses appear here as members pay.</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-2 shadow-sm">
            {circle.expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nets-navy/5 text-xs font-bold text-nets-navy">{e.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-nets-navy">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.merchant} · paid by {memberName(circle, e.paidById).replace(" (You)", "You")}</p>
                </div>
                <span className="text-sm font-bold text-nets-navy">${fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3 space-y-2">
        {circle.status === "active" && (
          wallet ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={openQrScanner}
                className="flex items-center justify-center gap-2 rounded-2xl bg-nets-red py-3 text-sm font-bold text-white shadow-sm shadow-nets-red/20"
              >
                <QrCode className="h-4 w-4" /> Scan NETS QR
              </button>
              <button
                onClick={() => setManualEntryOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-nets-navy/20 bg-nets-navy/5 py-3 text-sm font-bold text-nets-navy"
              >
                <PenLine className="h-4 w-4" /> Add Manually
              </button>
            </div>
          ) : (
            <button
              onClick={() => setManualEntryOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-nets-navy/20 bg-nets-navy/5 py-3 text-sm font-bold text-nets-navy"
            >
              <PenLine className="h-4 w-4" /> Add Expense Manually
            </button>
          )
        )}
        {circle.status === "settled" ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-green/10 border border-nets-green/30 py-4 text-base font-bold text-nets-green">
            <Check className="h-5 w-5" /> Circle settled — no chasing needed
          </div>
        ) : circle.tripWallet ? (
          <button onClick={onReconcile} disabled={circle.expenses.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40">
            <Zap className="h-5 w-5" />
            {circle.expenses.length === 0 ? "Waiting for expenses…" : "Reconcile Now"}
          </button>
        ) : (
          <button onClick={onSettle} disabled={circle.expenses.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40">
            <Wallet className="h-5 w-5" />
            {circle.expenses.length === 0 ? "Waiting for expenses…" : `Settle up · $${fmt(total)}`}
          </button>
        )}
      </div>

      {/* Manual Expense Entry Sheet */}
      <AnimatePresence>
        {manualEntryOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40" onClick={() => setManualEntryOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <p className="mb-4 text-base font-extrabold text-nets-navy">Add Expense</p>

              <label className="text-xs font-bold text-nets-navy">What was it for?</label>
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Bowling, Dinner, Grab ride"
                className="mt-1.5 mb-3 w-full rounded-2xl border border-border bg-nets-page px-4 py-3 text-sm outline-none focus:border-nets-blue"
              />

              <label className="text-xs font-bold text-nets-navy">Amount (S$)</label>
              <input
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                inputMode="decimal"
                className="mt-1.5 mb-3 w-full rounded-2xl border border-border bg-nets-page px-4 py-3 text-sm outline-none focus:border-nets-blue"
              />

              <label className="text-xs font-bold text-nets-navy">Category</label>
              <div className="mt-1.5 mb-3 flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setManualCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${manualCategory === cat ? "bg-nets-navy text-white" : "bg-nets-page text-nets-navy border border-border"}`}>
                    {cat}
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-nets-navy">Paid by</label>
              <div className="mt-1.5 mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {circle.members.map((m) => (
                  <button key={m.id} onClick={() => setManualPaidBy(m.id)}
                    className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition-all ${manualPaidBy === m.id ? "border-nets-navy bg-nets-navy/5" : "border-border bg-nets-page"}`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.initial}</span>
                    <span className="text-[10px] font-semibold text-nets-navy">{m.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-nets-navy">Split with</label>
              <div className="mt-1.5 mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {circle.members.map((m) => {
                  const on = manualSplit.includes(m.id)
                  return (
                    <button key={m.id}
                      onClick={() => setManualSplit((s) => on ? s.filter((x) => x !== m.id) : [...s, m.id])}
                      className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition-all ${on ? "border-nets-red bg-nets-red/5" : "border-border bg-nets-page opacity-50"}`}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.initial}</span>
                      <span className="text-[10px] font-semibold text-nets-navy">{m.name.split(" ")[0]}</span>
                    </button>
                  )
                })}
              </div>

              {manualAmount && parseFloat(manualAmount) > 0 && manualSplit.length > 0 && (
                <div className="mb-3 rounded-xl bg-nets-navy/5 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    S${fmt(parseFloat(manualAmount) / manualSplit.length)} per person · {manualSplit.length} splitting
                  </p>
                </div>
              )}

              <button
                onClick={handleManualAddExpense}
                disabled={!manualTitle.trim() || !manualAmount || parseFloat(manualAmount) <= 0 || manualSplit.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-3.5 text-sm font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
              >
                <Receipt className="h-4 w-4" /> Add S${manualAmount ? fmt(parseFloat(manualAmount)) : "0.00"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Expense Detection Modal (concept doc §3.1: user controls what gets added) */}
      <AnimatePresence>
        {detection && !participantModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40" onClick={() => setDetection(null)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-center gap-3 mb-4 rounded-2xl bg-nets-navy/5 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nets-red text-white">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-nets-navy uppercase tracking-wide">This transaction may belong to {circle.name}</p>
                  <p className="text-lg font-extrabold text-nets-navy">{detection.merchant} · ${fmt(detection.amount)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={handleAddAll}
                  className="flex w-full items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 p-3 text-left">
                  <Check className="h-5 w-5 text-nets-green shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-nets-navy">Split with all {circle.members.length}</p>
                    <p className="text-xs text-muted-foreground">${fmt(detection.amount / circle.members.length)} per person</p>
                  </div>
                </button>
                <button onClick={() => { setSelectedParticipants(circle.members.map((m) => m.id)); setParticipantModal(true) }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-3 text-left">
                  <Users className="h-5 w-5 text-nets-navy shrink-0" />
                  <p className="text-sm font-bold text-nets-navy">Choose participants</p>
                </button>
                <button onClick={() => setDetection(null)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-3 text-left">
                  <X className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-nets-navy">No, keep personal</p>
                    <p className="text-xs text-muted-foreground">This is my own expense</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── NETS QR Scan-to-Pay Sheet ── */}
      <AnimatePresence>
        {scanQrOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/50"
              onClick={scanStep !== "done" ? closeQrScanner : undefined}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-nets-navy px-5 pb-10 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

              <AnimatePresence mode="wait">
                {/* Step 1: Scanning animation */}
                {scanStep === "scanning" && (
                  <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center pb-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/50">Circle Pay · NETS Prepaid</p>
                    <p className="mb-5 text-base font-extrabold text-white">Scanning NETS QR…</p>
                    <div className="relative h-52 w-52 rounded-3xl border border-white/10 bg-black/30">
                      {[
                        "left-3 top-3 border-l-4 border-t-4 rounded-tl-xl",
                        "right-3 top-3 border-r-4 border-t-4 rounded-tr-xl",
                        "left-3 bottom-3 border-l-4 border-b-4 rounded-bl-xl",
                        "right-3 bottom-3 border-r-4 border-b-4 rounded-br-xl",
                      ].map((c, i) => (
                        <span key={i} className={`absolute h-9 w-9 border-nets-red ${c}`} />
                      ))}
                      <motion.div
                        animate={{ top: ["12%", "82%", "12%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-x-6 h-0.5 rounded-full bg-nets-red shadow-[0_0_10px_2px_var(--nets-red)]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ScanLine className="h-10 w-10 text-white/15" />
                      </div>
                    </div>
                    <p className="mt-4 text-center text-xs text-white/50">Align the merchant's NETS QR within the frame</p>
                    <button onClick={closeQrScanner} className="mt-4 text-xs text-white/40 underline">Cancel</button>
                  </motion.div>
                )}

                {/* Step 2: QR detected — confirm & pay */}
                {scanStep === "detected" && (
                  <motion.div key="detected" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="pb-2">
                    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nets-red">
                        <QrCode className="h-5 w-5 text-white" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">NETS QR Detected</p>
                        <p className="text-sm font-extrabold text-white">{scanMerchant}</p>
                      </div>
                      <Check className="ml-auto h-5 w-5 text-nets-green" />
                    </div>

                    <p className="mb-1.5 text-xs font-bold text-white/70">Amount (S$)</p>
                    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                      <span className="text-base font-extrabold text-white/50">S$</span>
                      <input
                        value={scanAmount}
                        onChange={(e) => setScanAmount(e.target.value)}
                        type="number"
                        inputMode="decimal"
                        className="flex-1 bg-transparent text-xl font-extrabold text-white outline-none placeholder:text-white/20"
                        placeholder="0.00"
                      />
                    </div>

                    <p className="mb-1.5 text-xs font-bold text-white/70">Category</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {["Food", "Transport", "Entertainment", "Shopping", "Others"].map((cat) => (
                        <button key={cat} onClick={() => setScanCategory(cat)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${scanCategory === cat ? "bg-white text-nets-navy" : "bg-white/10 text-white/70"}`}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    {wallet && (
                      <div className="mb-4 rounded-2xl bg-white/10 px-4 py-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Circle Wallet balance</span>
                          <span className="font-extrabold text-white">S${fmt(wallet.balance)}</span>
                        </div>
                        {scanAmount && parseFloat(scanAmount) > 0 && (
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="text-white/60">After this payment</span>
                            <span className={`font-extrabold ${wallet.balance - parseFloat(scanAmount) >= 0 ? "text-nets-green" : "text-nets-red"}`}>
                              S${fmt(Math.max(0, wallet.balance - parseFloat(scanAmount || "0")))}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3 text-white/40 shrink-0" />
                          <p className="text-[10px] text-white/40">Deducted from NETS Prepaid Circle wallet</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleQrPay}
                      disabled={!scanAmount || parseFloat(scanAmount) <= 0}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/30 disabled:opacity-40"
                    >
                      <Wallet className="h-5 w-5" />
                      Pay S${scanAmount ? fmt(parseFloat(scanAmount)) : "0.00"} · Circle Wallet
                    </button>
                    <button onClick={closeQrScanner} className="mt-2 flex w-full items-center justify-center py-2 text-xs text-white/40 underline">
                      Cancel
                    </button>
                  </motion.div>
                )}

                {/* Step 3: Success */}
                {scanStep === "done" && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center pb-4">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 14 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green"
                    >
                      <Check className="h-10 w-10 text-white" />
                    </motion.span>
                    <p className="mt-4 text-xl font-extrabold text-white">Payment Done!</p>
                    <p className="mt-1 text-sm text-white/60">S${fmt(parseFloat(scanAmount || "0"))} · {scanMerchant}</p>
                    <p className="mt-3 text-xs text-white/40">Deducted from Circle Wallet · Added to shared expenses</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Participant Selection Sheet */}
      <AnimatePresence>
        {participantModal && detection && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/40" onClick={() => setParticipantModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
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
                    <button key={m.id}
                      onClick={() => setSelectedParticipants((p) => on ? p.filter((x) => x !== m.id) : [...p, m.id])}
                      className="flex w-full items-center gap-3 rounded-2xl bg-nets-page p-3">
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
              <button onClick={handleConfirmParticipants} disabled={selectedParticipants.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-3 text-sm font-bold text-white disabled:opacity-40">
                Add for {selectedParticipants.length} people · ${fmt(detection.amount)}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Circle Close — Auto Reconciliation ──────────────────────────────────────
// V2 concept doc §3: After the experience — settle without awkward chasing.
// Automatic net settlement reduces N obligations to the minimum transfers.

const PAYMENT_METHODS = [
  { mode: "QR", name: "NETS QR", desc: "Scan with your bank app — instant", icon: QrCode, color: "var(--nets-red)" },
  { mode: "CC", name: "Credit / Debit Card", desc: "Visa, Mastercard, AMEX", icon: CreditCard, color: "var(--nets-navy)" },
  { mode: "DD", name: "NETS Debit", desc: "Direct from your bank account", icon: Wallet, color: "var(--nets-blue)" },
]

type NetsFormData = { txnReq: string; mac: string; keyId: string; gatewayUrl: string }
// "qr" = NETS QR Web flow (inline); "paying"/"redirecting" = legacy eNETS form-POST path (CC/DD)
type Step = "idle" | "select" | "qr" | "paying" | "redirecting"

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
    // NETS QR Web path — show inline QR screen, no redirect
    if (paymentMode === "QR") {
      setStep("qr")
      return
    }
    // Legacy eNETS form-POST path for CC / DD
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
      if (!myRecord) { setDone(true); setTimeout(onDone, 1600); return }

      const payRes = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: myRecord.id, amount: myRecord.amount, paymentMode }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error || "Failed to prepare payment")
      setStep("redirecting")
      setNetsForm(payData.paymentInitiation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
      setStep("idle")
    }
  }

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} className="flex h-full flex-col">
      {/* Legacy eNETS hidden form for CC/DD modes */}
      {netsForm && (
        <form ref={formRef} method="POST" action={netsForm.gatewayUrl} style={{ display: "none" }}>
          <input type="hidden" name="txnReq" value={netsForm.txnReq} />
          <input type="hidden" name="mac" value={netsForm.mac} />
          <input type="hidden" name="keyId" value={netsForm.keyId} />
        </form>
      )}

      {/* NETS QR Web — inline payment screen (no redirect) */}
      <AnimatePresence>
        {step === "qr" && mySettlement && (
          <NetsQrPayment
            amount={mySettlement.amount}
            label={`Settling your share · $${fmt(mySettlement.amount)}`}
            onSuccess={() => { setDone(true); setTimeout(onDone, 1800) }}
            onCancel={() => setStep("idle")}
          />
        )}
      </AnimatePresence>

      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Circle Close" onBack={onBack} subtitle="Settle everything. Chase nobody." />
        <JourneySteps active={3} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
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

        {walletSurplus > 0 && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}
            className="mt-3 flex items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 p-4">
            <Wallet className="h-5 w-5 text-nets-green shrink-0" />
            <div>
              <p className="text-sm font-bold text-nets-green">Wallet surplus: ${fmt(walletSurplus)}</p>
              <p className="text-xs text-muted-foreground">${fmt(surplusPerPerson)} returned to each member.</p>
            </div>
          </motion.div>
        )}

        {/* V2: Automatic net settlement — reduces to minimum transfers (concept doc §3.3) */}
        {settlements.length > 0 ? (
          <>
            <div className="mt-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-nets-navy">Transfers needed</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              NETS reduced {circle.members.length * (circle.members.length - 1) / 2} potential obligations to {settlements.length} transfer{settlements.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {settlements.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                  className={`flex items-center gap-3 rounded-3xl p-4 shadow-sm ${s.fromId === "alex" ? "bg-nets-red/5 border border-nets-red/20" : "bg-card"}`}>
                  <span className="text-sm font-bold text-nets-navy">{memberName(circle, s.fromId).replace(" (You)", "You")}</span>
                  <div className="flex flex-1 items-center gap-2 text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <ArrowRight className="h-4 w-4" />
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <span className="text-sm font-bold text-nets-navy">{memberName(circle, s.toId).replace(" (You)", "You")}</span>
                  <span className="ml-1 rounded-full bg-nets-red/10 px-2.5 py-1 text-sm font-extrabold text-nets-red">${fmt(s.amount)}</span>
                </motion.div>
              ))}
            </div>
            {mySettlement && (
              <p className="mt-3 text-center text-xs text-nets-red font-semibold">
                Your share: ${fmt(mySettlement.amount)} — pay via NETS QR or card
              </p>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-3xl bg-nets-green/10 border border-nets-green/30 p-6 text-center">
            <Check className="h-8 w-8 text-nets-green mx-auto" />
            <p className="mt-2 text-sm font-bold text-nets-green">Everyone is square!</p>
            <p className="text-xs text-muted-foreground mt-1">No transfers needed.</p>
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm font-semibold text-nets-red">{error}</p>}

        <p className="mt-5 text-center text-xs text-muted-foreground/60 px-4">
          No spreadsheets. No repeated requests. No awkward chasing.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <AnimatePresence mode="wait">
          {step === "paying" || step === "redirecting" ? (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-4 text-base font-bold text-nets-navy">
              <Wallet className="h-5 w-5 animate-pulse text-nets-red" />
              {step === "paying" ? "Preparing payment…" : "Redirecting to NETS…"}
            </motion.div>
          ) : (
            <motion.button key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => mySettlement ? setStep("select") : (setDone(true), setTimeout(onDone, 1600))}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25">
              <Zap className="h-5 w-5" />
              {mySettlement ? `Settle Now · $${fmt(mySettlement.amount)}` : "Confirm — Circle Closed"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step === "select" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40" onClick={() => setStep("idle")} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <p className="mb-1 text-center text-base font-bold text-nets-navy">Choose Payment Method</p>
              <p className="mb-4 text-center text-xs text-muted-foreground">Settling ${fmt(mySettlement!.amount)}</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method.mode} onClick={() => handleReconcile(method.mode)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-nets-page p-3 active:opacity-70">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-nets-navy/95 text-white px-6">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green">
              <Check className="h-10 w-10" />
            </motion.span>
            <p className="mt-4 text-xl font-extrabold">All Settled!</p>
            <p className="text-sm text-white/70 mt-1">Thanks everyone!</p>

            {/* Summary card */}
            <div className="mt-6 w-full rounded-3xl bg-white/10 p-5 space-y-3">
              <p className="text-xs font-bold text-white/50 uppercase tracking-wide">Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Total Spent</span>
                <span className="font-extrabold text-white">S${fmt(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Paid</span>
                <span className="font-extrabold text-nets-green">S${fmt(total)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                <span className="text-white/70">Outstanding</span>
                <span className="font-extrabold text-white">S$0.00</span>
              </div>
            </div>

            <button
              onClick={onDone}
              className="mt-5 flex items-center gap-2 rounded-2xl bg-white/20 px-6 py-3 text-sm font-bold text-white"
            >
              <Download className="h-4 w-4" /> Download Summary
            </button>
            <p className="mt-3 text-xs text-white/40">More confident "YES" next time.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Circle Settle (non-wallet circles — Universal NETS Settlement) ────────────
// V2 concept doc §2.10: one person pays, others reimburse via NETS.

function CircleSettle({ circle, onBack, onDone }: { circle: Circle; onBack: () => void; onDone: () => void }) {
  const settlements = computeSettlements(circle)
  const [step, setStep] = useState<Step>("idle")
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [netsForm, setNetsForm] = useState<NetsFormData | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const mySettlement = settlements.find((s) => s.fromId === "alex")
  const creditor = settlements.length > 0 ? memberName(circle, settlements[0].toId) : null

  useEffect(() => {
    if (netsForm && formRef.current) {
      setTimeout(() => formRef.current?.submit(), 100)
    }
  }, [netsForm])

  const handleSettle = async (paymentMode: string) => {
    // NETS QR Web path — show inline QR screen, no redirect
    if (paymentMode === "QR") {
      setStep("qr")
      return
    }
    // Legacy eNETS form-POST path for CC / DD
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
      if (!myRecord) { setPaid(true); setTimeout(onDone, 1600); return }

      const payRes = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: myRecord.id, amount: myRecord.amount, paymentMode }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error || "Failed to prepare payment")
      setStep("redirecting")
      setNetsForm(payData.paymentInitiation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
      setStep("idle")
    }
  }

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} className="flex h-full flex-col">
      {/* Legacy eNETS hidden form for CC/DD modes */}
      {netsForm && (
        <form ref={formRef} method="POST" action={netsForm.gatewayUrl} style={{ display: "none" }}>
          <input type="hidden" name="txnReq" value={netsForm.txnReq} />
          <input type="hidden" name="mac" value={netsForm.mac} />
          <input type="hidden" name="keyId" value={netsForm.keyId} />
        </form>
      )}

      {/* NETS QR Web — inline payment screen (no redirect) */}
      <AnimatePresence>
        {step === "qr" && mySettlement && (
          <NetsQrPayment
            amount={mySettlement.amount}
            label={`Settling your share · $${fmt(mySettlement.amount)}`}
            onSuccess={() => { setPaid(true); setTimeout(onDone, 1800) }}
            onCancel={() => setStep("idle")}
          />
        )}
      </AnimatePresence>

      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Circle Close" onBack={onBack} subtitle="Universal settlement" />
        <JourneySteps active={3} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {/* V2: frame this as one payer + reimburse model (concept doc §2.10) */}
        {creditor && (
          <div className="mb-4 rounded-2xl bg-nets-blue/10 border border-nets-blue/20 px-4 py-3">
            <p className="text-xs text-nets-blue font-semibold leading-relaxed">
              <strong>{creditor}</strong> paid for the group at the merchant. Everyone now reimburses their confirmed share directly to {creditor} via NETS.
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-nets-navy p-5 text-white mb-4">
          <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">Final split</p>
          <p className="mt-2 text-base font-bold">{circle.name}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/50">Total</p>
              <p className="text-xl font-extrabold">${fmt(circleTotal(circle))}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/50">Per person</p>
              <p className="text-xl font-extrabold">${fmt(perHead(circle))}</p>
            </div>
          </div>
        </div>

        <h2 className="text-base font-bold text-nets-navy mb-1">Transfers</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {settlements.length} transfer{settlements.length !== 1 ? "s" : ""} to fully settle this Circle
        </p>
        <div className="space-y-3">
          {settlements.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
              className={`flex items-center gap-3 rounded-3xl p-4 shadow-sm ${s.fromId === "alex" ? "bg-nets-red/5 border border-nets-red/20" : "bg-card"}`}>
              <span className="text-sm font-bold text-nets-navy">{memberName(circle, s.fromId).replace(" (You)", "You")}</span>
              <div className="flex flex-1 items-center gap-2 text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <ArrowRight className="h-4 w-4" />
                <span className="h-px flex-1 bg-border" />
              </div>
              <span className="text-sm font-bold text-nets-navy">{memberName(circle, s.toId).replace(" (You)", "You")}</span>
              <span className="ml-1 rounded-full bg-nets-red/10 px-2.5 py-1 text-sm font-extrabold text-nets-red">${fmt(s.amount)}</span>
            </motion.div>
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm font-semibold text-nets-red">{error}</p>}
        <p className="mt-5 text-center text-xs text-muted-foreground/60 px-4">
          No spreadsheets. No repeated requests. No awkward chasing.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <AnimatePresence mode="wait">
          {step === "paying" || step === "redirecting" ? (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-4 text-base font-bold text-nets-navy">
              <Wallet className="h-5 w-5 animate-pulse text-nets-red" />
              {step === "paying" ? "Preparing payment…" : "Redirecting to NETS…"}
            </motion.div>
          ) : (
            <motion.button key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => mySettlement ? setStep("select") : (setPaid(true), setTimeout(onDone, 1600))}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25">
              <Wallet className="h-5 w-5" />
              {mySettlement ? `Settle Now · $${fmt(mySettlement.amount)}` : "Confirm — Circle Closed"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step === "select" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40" onClick={() => setStep("idle")} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-2xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <p className="mb-1 text-center text-base font-bold text-nets-navy">Choose Payment Method</p>
              <p className="mb-4 text-center text-xs text-muted-foreground">Settling ${fmt(mySettlement!.amount)}</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method.mode} onClick={() => handleSettle(method.mode)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-nets-page p-3 active:opacity-70">
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
        {paid && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-nets-navy/95 text-white px-6">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green">
              <Check className="h-10 w-10" />
            </motion.span>
            <p className="mt-4 text-xl font-extrabold">All Settled!</p>
            <p className="text-sm text-white/70 mt-1">Thanks everyone!</p>

            {/* Summary card */}
            <div className="mt-6 w-full rounded-3xl bg-white/10 p-5 space-y-3">
              <p className="text-xs font-bold text-white/50 uppercase tracking-wide">Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Total Spent</span>
                <span className="font-extrabold text-white">S${fmt(circleTotal(circle))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Paid</span>
                <span className="font-extrabold text-nets-green">S${fmt(circleTotal(circle))}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                <span className="text-white/70">Outstanding</span>
                <span className="font-extrabold text-white">S$0.00</span>
              </div>
            </div>

            <button
              onClick={onDone}
              className="mt-5 flex items-center gap-2 rounded-2xl bg-white/20 px-6 py-3 text-sm font-bold text-white"
            >
              <Download className="h-4 w-4" /> Download Summary
            </button>
            <p className="mt-3 text-xs text-white/40">No spreadsheets. No chasing. Ever.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
