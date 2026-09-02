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
  Lock, UtensilsCrossed, Gamepad2, TrendingUp,
} from "lucide-react"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import { NetsQrPayment } from "../nets-qr-payment"
import { useCircleData } from "../circle-data-context"
import { useDemoContext } from "@/lib/demo-context"
import {
  circleTotal, perHead, computeSettlements, memberName,
  circleRecommendations, confidenceConfig, affordabilityMessage,
  activities, computeConfidencePercent, confidenceLabel, confidenceColor, PROFILE_RANGES,
  computeCircleCheck, circleCheckConfig, circleCheckPrivacyNote,
  spendBandSourceLabel, spendBandSourceNote, privateCommitmentGuidance,
  NEXT_ROUND_THRESHOLD,
  computeBalancesFromExpenses,
  type Circle, type CircleExpense, type ComfortProfile, type Activity,
  type CircleCheckOutcome, type SpendBand, type NegotiationOption, type CircleReadyOffer,
  type CircleIdea, type IdeaVoteScore, type GroupOffer, type NextRoundRequest,
  type MemberBalance,
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
  const { circles, createCircle, activateCircle, settleCircle, setCircleProfile, addCircleExpense } = useCircleData()
  const { scene, clearScene, resetKey } = useDemoContext()
  const [pendingCircleId, setPendingCircleId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  // V2: custom activity built from a CircleIdea (used when user picks via the new idea flow)
  const [customActivity, setCustomActivity] = useState<Activity | undefined>(undefined)
  // V2: ideas collected across the 3-step idea flow
  const [pendingIdeas, setPendingIdeas] = useState<CircleIdea[]>([])
  // Private spend band — stored locally, never sent to other members (concept doc §1.3)
  const [mySpendBand, setMySpendBand] = useState({ min: 40, max: 50 })
  // The status of the idea selected from Circle Engine Results — passed to CircleCheckView
  // to ensure the same status is shown (single source of truth, not re-computed)
  const [selectedIdeaStatus, setSelectedIdeaStatus] = useState<CircleCheckOutcome>("circle-ready")

  // Handle demo check scenarios — set outcome + use c3 as the demo pending circle
  useEffect(() => {
    if (!scene?.startsWith("check:")) return
    const outcome = scene.replace("check:", "") as CircleCheckOutcome
    setSelectedIdeaStatus(outcome)
    setPendingCircleId("c3")
    setCircleView("check")
    clearScene()
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  const circle = useMemo(
    () => (activeCircleId ? circles.find((c) => c.id === activeCircleId) : circles[0]) ?? circles[0],
    [activeCircleId, circles]
  )
  const pendingCircle = pendingCircleId ? circles.find((c) => c.id === pendingCircleId) : null
  const selectedActivity = customActivity ?? (selectedActivityId ? activities.find((a) => a.id === selectedActivityId) : undefined)

  const resolvedView = circleView

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
              // V2 flow: create → collaborative idea submission
              setCircleView("idea-submission")
            }}
          />
        )}
        {/* V2: Collaborative idea submission — each member pitches one idea */}
        {resolvedView === "idea-submission" && pendingCircle && (
          <IdeaSubmissionView
            key="idea-submission"
            circle={pendingCircle}
            onBack={() => setCircleView("create")}
            onDone={(ideas) => {
              setPendingIdeas(ideas)
              // V2 flow: ideas collected → private spend band
              setCircleView("commitment")
            }}
          />
        )}
        {/* V2: Private Spend Band — spend band each member privately commits (concept doc §1.3) */}
        {resolvedView === "commitment" && pendingCircle && (
          <SpendBandView
            key="commitment"
            circle={pendingCircle}
            initialAmount={mySpendBand}
            onBack={() => setCircleView("idea-submission")}
            onDone={(band) => {
              setMySpendBand(band)
              setCircleProfile(pendingCircle.id, "balanced", ["Food", "Travel"])
              // V2 flow: spend band set → rank the ideas
              setCircleView("idea-voting")
            }}
          />
        )}
        {/* V2: Rank the ideas — members rank all submitted ideas by preference */}
        {resolvedView === "idea-voting" && pendingCircle && (
          <IdeaVotingView
            key="idea-voting"
            ideas={pendingIdeas}
            myMemberId="thanis"
            onBack={() => setCircleView("commitment")}
            onDone={(rankedIdeas) => {
              setPendingIdeas(rankedIdeas)
              setCircleView("ai-ranking")
            }}
          />
        )}
        {/* V2: Circle Engine ranking — engine ranks ideas, user picks winner */}
        {resolvedView === "ai-ranking" && pendingCircle && (
          <AIRankingView
            key="ai-ranking"
            ideas={pendingIdeas}
            mySpendBand={mySpendBand}
            circle={pendingCircle}
            onBack={() => setCircleView("idea-voting")}
            onSelect={(idea, status) => {
              setCustomActivity(ideaToActivity(idea))
              setSelectedIdeaStatus(status)
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
            mySpendBand={mySpendBand}
            overrideStatus={selectedIdeaStatus}
            onBack={() => setCircleView("ai-ranking")}
            onProceed={() => {
              // Activate circle directly into Circle Pay
              activateCircle(pendingCircle.id)
              setPendingCircleId(null)
              setSelectedActivityId(null)
              setCustomActivity(undefined)
              setPendingIdeas([])
              openCircle(pendingCircle.id)
            }}
          />
        )}
        {resolvedView === "detail" && circle.status === "active" && (
          <CirclePayView
            key={`detail-pay-${resetKey}`}
            circle={circle}
            mySpendBand={circle.mySpendBand ?? mySpendBand}
            onBack={() => setCircleView("list")}
            onSettle={() => setCircleView("settle")}
            onAddExpense={(expense, deduct) => addCircleExpense(circle.id, expense, deduct)}
          />
        )}
        {resolvedView === "detail" && circle.status !== "active" && (
          <CircleDetail
            key={`detail-${resetKey}`}
            circle={circle}
            mySpendBand={circle.mySpendBand ?? mySpendBand}
            onBack={() => setCircleView("list")}
            onSettle={() => setCircleView("settle")}
            onReconcile={() => setCircleView("reconcile")}
            onAddExpense={(expense, deduct) => addCircleExpense(circle.id, expense, deduct)}
          />
        )}
        {resolvedView === "settle" && (
          <CircleSettle
            key={`settle-${resetKey}`}
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

function CircleCreate({ onBack, onDone }: { onBack: () => void; onDone: (name: string, selected: string[]) => void }) {
  const { scene, clearScene } = useDemoContext()
  const isDemo = scene === "create:demo"
  useEffect(() => { if (isDemo) clearScene() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [plan, setPlan] = useState(() => isDemo ? "Dinner + Activity @ Bugis" : "")
  const [date, setDate] = useState("")
  const [area, setArea] = useState("")
  const [created, setCreated] = useState(false)
  const allFriends = [
    { id: "bryan",   name: "Bryan",   color: "var(--nets-navy)"  },
    { id: "krishna", name: "Krishna", color: "var(--nets-blue)"  },
    { id: "sherwin", name: "Sherwin", color: "var(--nets-green)" },
    { id: "elaine",  name: "Elaine",  color: "var(--nets-red)"   },
    { id: "farah",   name: "Farah",   color: "var(--nets-navy)"  },
  ]
  const [selected, setSelected] = useState<string[]>(["bryan", "krishna", "sherwin"])

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function handleCreate() {
    if (!plan.trim() || selected.length === 0) return
    setCreated(true)
  }

  const selectedFriends = allFriends.filter((f) => selected.includes(f.id))

  // Auto-advance the "Circle created!" confirmation when in demo mode
  useEffect(() => {
    if (!created || !isDemo) return
    const t = setTimeout(() => onDone(plan.trim(), selected), 1200)
    return () => clearTimeout(t)
  }, [created]) // eslint-disable-line react-hooks/exhaustive-deps

  if (created) {
    return (
      <motion.div
        key="created"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -40, opacity: 0 }}
        className="flex h-full flex-col items-center justify-center bg-nets-page px-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-red shadow-lg shadow-nets-red/25"
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-5 text-2xl font-extrabold text-nets-navy"
        >
          Circle created!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-1 text-sm text-muted-foreground"
        >
          {plan.trim()}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-6 w-full rounded-3xl bg-white p-5 shadow-sm"
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">Everyone&apos;s in</p>
          <div className="flex items-center justify-center gap-3">
            {/* You */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ backgroundColor: "var(--nets-red)" }}>T</span>
              <span className="text-[10px] font-semibold text-nets-navy">You</span>
            </div>
            {selectedFriends.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1.5">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.6 + selectedFriends.indexOf(f) * 0.1 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{ backgroundColor: f.color }}
                >
                  {f.name[0]}
                </motion.span>
                <span className="text-[10px] font-semibold text-nets-navy">{f.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 w-full"
        >
          <button
            onClick={() => onDone(plan.trim(), selected)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25"
          >
            Let&apos;s get planning <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>
      </motion.div>
    )
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
        <Header title="Create a Circle" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2 space-y-6">
        {/* Primary question */}
        <div>
          <label className="text-sm font-bold text-nets-navy">What are you planning?</label>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="e.g. Dinner + Activity @ Bugis"
            rows={2}
            className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-nets-navy outline-none focus:border-nets-red resize-none"
          />
        </div>

        {/* Optional details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-nets-navy">Date (optional)</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="e.g. Tonight"
              className="mt-1.5 w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm text-nets-navy outline-none focus:border-nets-red"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-nets-navy">Area (optional)</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Bugis"
              className="mt-1.5 w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm text-nets-navy outline-none focus:border-nets-red"
            />
          </div>
        </div>

        {/* Invite friends */}
        <div>
          <label className="text-sm font-bold text-nets-navy">Who&apos;s coming?</label>
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
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={handleCreate}
          disabled={!plan.trim() || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40"
        >
          Create Circle <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── SpendBandView ────────────────────────────────────────────────────────────
// V2 concept doc §1.3: private spend band (min–max) per member.
// NETS does NOT inspect salary, bank balance, credit score, or spending history.
// Nobody else sees this value — it's used only to compute the group-level outcome.

function SpendBandView({
  circle, initialAmount, onBack, onDone,
}: {
  circle: Circle
  initialAmount: { min: number; max: number }
  onBack: () => void
  onDone: (band: { min: number; max: number }) => void
}) {
  const sliderMin = 20
  const sliderMax = 200
  const step = 10
  const [amount, setAmount] = useState(initialAmount.max)
  const band = { min: Math.max(sliderMin, amount - 10), max: amount }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="bg-nets-page">
        <StatusBar />
        <Header title="Find your comfort zone" onBack={onBack} subtitle="Private · Only you see this" />
        <JourneySteps active={1} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {/* Privacy declaration */}
        <div className="flex items-center gap-2 rounded-2xl bg-nets-navy/5 border border-nets-navy/10 px-4 py-3 mb-6">
          <Lock className="h-4 w-4 text-nets-navy shrink-0" />
          <div>
            <p className="text-xs font-bold text-nets-navy">Private to you</p>
            <p className="text-[11px] text-muted-foreground">No one sees your spend band</p>
          </div>
        </div>

        {/* Amount display */}
        <div className="rounded-2xl bg-nets-navy px-5 py-6 mb-5 text-center text-white">
          <p className="text-[11px] font-semibold text-white/50 mb-1">I&apos;m comfortable spending up to</p>
          <p className="text-5xl font-extrabold tracking-tight">S${amount}</p>
          <p className="text-xs text-white/50 mt-1">per person</p>

          {/* Slider */}
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={step}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-5 w-full accent-white"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>S${sliderMin}</span>
            <span>S${sliderMax}</span>
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
              const active = amount >= e.threshold && amount < e.threshold + 40
              return (
                <button
                  key={e.emoji}
                  onClick={() => setAmount(e.threshold + 10 <= sliderMax ? e.threshold + 10 : sliderMax)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all ${active ? "bg-white/25 scale-125" : "bg-white/10 opacity-50"}`}
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
              onClick={() => setAmount((a) => Math.max(sliderMin, a - step))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-xs text-white/40">fine tune ± $10</span>
            <button
              onClick={() => setAmount((a) => Math.min(sliderMax, a + step))}
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
            "Any automated financial scoring or credit rating",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 shadow-sm">
              <X className="h-3.5 w-3.5 text-nets-red shrink-0" />
              <p className="text-xs text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground/70 px-4 leading-relaxed">
          NETS asks "What are you comfortable spending?" — not "What can you afford?"
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-8 pt-3">
        <button
          onClick={() => onDone(band)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-4 text-base font-bold text-white"
        >
          Continue <ArrowRight className="h-5 w-5" />
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
  circle, activity, mySpendBand, overrideStatus, onBack, onProceed,
}: {
  circle: Circle
  activity?: Activity
  mySpendBand: { min: number; max: number }
  overrideStatus?: CircleCheckOutcome
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

  // Use override status from Circle Engine Results (single source of truth).
  // Fallback to circle.checkOutcome, then compute from spend band.
  const outcome: CircleCheckOutcome = overrideStatus ??
    circle.checkOutcome ??
    computeCircleCheck(spendBand, mySpendBand.max)
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
            <span className="text-sm text-white/80">Your Spend Band</span>
            <span className="text-base font-extrabold text-white">S${mySpendBand.min}–S${mySpendBand.max}</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm text-white/80">Activity band</span>
            <span className="text-base font-extrabold text-white">S${spendBand.min}–S${spendBand.max}</span>
          </div>
          <div className={`mt-3 rounded-xl px-3 py-2 ${mySpendBand.max >= spendBand.min ? "bg-nets-green/20" : "bg-nets-red/20"}`}>
            <p className="text-xs font-semibold text-white leading-relaxed">
              {mySpendBand.max >= spendBand.max
                ? "✓ You're comfortably within range"
                : mySpendBand.max >= spendBand.min
                ? "~ You're within range, though near the lower end"
                : "! This plan is above your stated spend band"}
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

// ─── Circle Pay ───────────────────────────────────────────────────────────────

type CpMenuCategory = { name: string; items: CpMenuItem[] }
type CpMenuItem = { id: string; name: string; price: number; shareable?: boolean }
type CpCartEntry = { id: string; name: string; price: number }
type CpSharedEntry = { id: string; name: string; totalPrice: number; membersJoined: number; invited: boolean }
type CpPhase =
  | "overview" | "stop1-menu"
  | "stop1-time-to-pay" | "stop1-qr" | "stop1-confirm" | "stop1-success" | "stop1-matched"
  | "stop1-mismatch" | "stop1-mismatch-resolve"
  | "stop1-done" | "unplanned-payment"
  | "stop2-activity" | "stop2-qr" | "stop2-confirm" | "stop2-success"
  | "outing-complete"

const SEOUL_TABLE_MENU: CpMenuCategory[] = [
  { name: "MAINS", items: [
    { id: "m1", name: "Beef Bulgogi", price: 18 },
    { id: "m2", name: "Korean BBQ Set", price: 22 },
    { id: "m3", name: "Kimchi Fried Rice", price: 15 },
  ]},
  { name: "SIDES", items: [
    { id: "s1", name: "Truffle Fries", price: 16, shareable: true },
    { id: "s2", name: "Tteokbokki", price: 12, shareable: true },
  ]},
  { name: "DRINKS", items: [
    { id: "d1", name: "Iced Tea", price: 4 },
    { id: "d2", name: "Soft Drink", price: 3 },
  ]},
  { name: "DESSERT", items: [
    { id: "ds1", name: "Bingsu", price: 8 },
  ]},
]

function genTxnRef(): string {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `NETS-SG-${seg()}-${seg()}`
}

// Mock orders for Bryan / Krishna / Sherwin used in group-total display
const MOCK_OTHER_ORDERS = [
  { memberId: "bryan",   label: "Korean BBQ Set",               amount: 22 },
  { memberId: "krishna", label: "Kimchi Fried Rice + Soft Drink", amount: 18 },
  { memberId: "sherwin", label: "Beef Bulgogi + Tteokbokki",      amount: 30 },
]
const MOCK_OTHER_TOTAL = MOCK_OTHER_ORDERS.reduce((s, o) => s + o.amount, 0)  // 70

function CirclePayView({
  circle, mySpendBand, onBack, onSettle, onAddExpense,
}: {
  circle: Circle
  mySpendBand: { min: number; max: number }
  onBack: () => void
  onSettle: () => void
  onAddExpense: (expense: Omit<CircleExpense, "id">, deduct: boolean) => void
}) {
  const { user } = useCircleData()
  const { scene, clearScene } = useDemoContext()

  // Parse demo scene for initial state (scene is consumed once at mount via key remount)
  const demoPayScene = scene?.startsWith("pay:") ? scene.replace("pay:", "") : null

  const [phase, setPhase] = useState<CpPhase>(() => {
    if (!demoPayScene) return "overview"
    if (demoPayScene === "stop1-mismatch") return "stop1-matched"
    if (demoPayScene === "manual-expense") return "overview"
    return demoPayScene as CpPhase
  })
  const [cart, setCart] = useState<CpCartEntry[]>([])
  const [sharedDishes, setSharedDishes] = useState<CpSharedEntry[]>([])
  const [shareModalItem, setShareModalItem] = useState<CpMenuItem | null>(null)
  const [lockedDinnerAmt, setLockedDinnerAmt] = useState(0)
  const [dinnerTxnRef, setDinnerTxnRef] = useState("")
  const [arcadeTxnRef, setArcadeTxnRef] = useState("")
  const [mismatchMode, setMismatchMode] = useState(() => demoPayScene === "stop1-mismatch")
  const [mismatchResolved, setMismatchResolved] = useState(false)

  // Clear the scene once consumed at mount
  useEffect(() => {
    if (demoPayScene) clearScene()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const DINNER_EST = 22
  const ARCADE_COST = 18
  const MISMATCH_EXTRA = 8  // Q&A scenario: group total is $8 more than locked

  const cartTotal = cart.reduce((s, i) => s + i.price, 0)
  const sharedTotal = sharedDishes.filter(d => d.invited && d.membersJoined > 1)
    .reduce((s, d) => s + d.totalPrice / d.membersJoined, 0)
  const dinnerActual = cartTotal + sharedTotal
  const dinnerDisplay = dinnerActual > 0 ? dinnerActual : DINNER_EST
  const outingTotal = dinnerDisplay + ARCADE_COST
  const groupDinnerTotal = lockedDinnerAmt + MOCK_OTHER_TOTAL

  const spendStatus = outingTotal > mySpendBand.max ? "over"
    : outingTotal >= mySpendBand.max * 0.9 ? "close"
    : "ok"
  const spendColor = spendStatus === "over" ? "text-nets-red" : spendStatus === "close" ? "text-amber-500" : "text-nets-green"
  const spendBgColor = spendStatus === "over" ? "bg-nets-red/10 border border-nets-red/20" : spendStatus === "close" ? "bg-amber-50 border border-amber-200" : "bg-nets-green/10 border border-nets-green/20"
  const spendMsg = spendStatus === "over" ? `Above your Spend Band (S$${mySpendBand.max})` : spendStatus === "close" ? "Getting close to your limit" : "Within your Spend Band ✓"

  function addItem(item: CpMenuItem) {
    if (item.shareable) { setShareModalItem(item); return }
    setCart(prev => [...prev, { id: item.id, name: item.name, price: item.price }])
  }
  function removeItem(id: string) { setCart(prev => prev.filter(i => i.id !== id)) }
  function addDirectly(item: CpMenuItem) {
    setCart(prev => [...prev, { id: item.id, name: item.name, price: item.price }])
    setShareModalItem(null)
  }
  function startShare(item: CpMenuItem) {
    setSharedDishes(prev => [...prev, { id: item.id, name: item.name, totalPrice: item.price, membersJoined: 1, invited: true }])
    setShareModalItem(null)
  }
  function removeSharedDish(id: string) { setSharedDishes(prev => prev.filter(d => d.id !== id)) }
  function simulateAllAccept(id: string) {
    setSharedDishes(prev => prev.map(d => d.id === id ? { ...d, membersJoined: 4 } : d))
  }
  function lockOrder() {
    setLockedDinnerAmt(parseFloat((cartTotal + sharedTotal).toFixed(2)))
    setPhase("stop1-time-to-pay")
  }
  function confirmDinnerPay() {
    const ref = genTxnRef()
    setDinnerTxnRef(ref)
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense({ title: "Seoul Table — Korean BBQ Dinner", merchant: "Seoul Table", category: "Food", amount: lockedDinnerAmt, paidById: "thanis", time: now }, true)
    setPhase("stop1-success")
  }
  function confirmArcadePay() {
    const ref = genTxnRef()
    setArcadeTxnRef(ref)
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense({ title: "Arcade Zone @ Bugis+ — Arcade Package", merchant: "Arcade Zone @ Bugis+", category: "Entertainment", amount: ARCADE_COST, paidById: "thanis", time: now }, true)
    setPhase("stop2-success")
  }

  // Auto-transitions after payment success
  useEffect(() => {
    if (phase === "stop1-success") {
      const t = setTimeout(() => setPhase("stop1-matched"), 1800)
      return () => clearTimeout(t)
    }
    if (phase === "stop2-success") {
      const t = setTimeout(() => setPhase("outing-complete"), 1500)
      return () => clearTimeout(t)
    }
  }, [phase])

  // ─── Shared sub-components ─────────────────────────────────────────────────

  function SpendTracker() {
    return (
      <div className={`rounded-2xl p-3 ${spendBgColor}`}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Outing Spend Check · Private</p>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Dinner{dinnerActual > 0 ? " (actual)" : " (est.)"}</span>
          <span className="font-semibold text-nets-navy">S${fmt(dinnerDisplay)}</span>
        </div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">Arcade (planned)</span>
          <span className="font-semibold text-nets-navy">S${fmt(ARCADE_COST)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-black/10 pt-2">
          <span className="text-sm font-bold text-nets-navy">Expected total</span>
          <div className="text-right">
            <p className={`text-base font-extrabold ${spendColor}`}>S${fmt(outingTotal)}</p>
            <p className={`text-[10px] font-semibold ${spendColor}`}>{spendMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  function ProtoQr() {
    return (
      <div className="relative mx-auto flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border-4 border-nets-navy bg-white shadow-xl">
        <QrCode className="h-44 w-44 text-nets-navy" strokeWidth={0.65} />
        <div className="absolute inset-x-0 bottom-0 bg-nets-red py-1 text-center">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-white">Prototype · Not for live payment</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} className="flex h-full flex-col relative">

      {/* ── OVERVIEW ──────────────────────────────────────────────────────────── */}
      {phase === "overview" && (
        <>
          <div style={{ backgroundColor: circle.cover }} className="text-white">
            <StatusBar dark />
            <div className="flex items-center justify-between px-5 pb-2 pt-1">
              <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="flex items-center gap-1.5 rounded-full bg-nets-green px-3 py-1 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live now
              </span>
            </div>
            <div className="px-5 pb-5 pt-1">
              <h1 className="text-2xl font-extrabold">{circle.name}</h1>
              <p className="text-sm text-white/70 mt-0.5">{circle.date} · {circle.members.length} members</p>
            </div>
          </div>

          <div className="-mt-3 flex-1 overflow-y-auto rounded-t-3xl bg-nets-page px-5 pb-32 pt-5">
            {/* Member row */}
            <div className="mb-5 flex gap-3">
              {circle.members.map(m => (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm" style={{ backgroundColor: m.color }}>{m.initial}</span>
                  <span className="text-[10px] text-muted-foreground">{m.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>

            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Agreed Plan</p>

            {/* NOW — Dinner */}
            <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
              className="mb-3 rounded-3xl bg-nets-navy p-4 text-white">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-nets-green px-2.5 py-0.5 text-[10px] font-bold">NOW</span>
                <span className="text-xs text-white/60">6:30 PM</span>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <UtensilsCrossed className="h-4 w-4 text-white/70" />
                    <p className="text-lg font-extrabold">Korean BBQ</p>
                  </div>
                  <p className="text-sm text-white/70">Seoul Table · Bugis+</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">S$22–28</p>
                  <p className="text-[10px] text-white/60">est/person</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Store className="h-3 w-3 text-nets-green" />
                <span className="text-[10px] text-nets-green font-semibold">Merchant Menu available</span>
              </div>
            </motion.div>

            {/* NEXT — Arcade */}
            <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="mb-5 rounded-3xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-nets-navy/10 px-2.5 py-0.5 text-[10px] font-bold text-nets-navy">NEXT</span>
                <span className="text-xs text-muted-foreground">8:00 PM</span>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-extrabold text-nets-navy">Arcade</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Arcade Zone @ Bugis+</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-nets-navy">S$18</p>
                  <p className="text-[10px] text-muted-foreground">per person</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Check className="h-3 w-3 text-nets-green" />
                <span className="text-[10px] text-muted-foreground font-medium">Core plan · Included</span>
              </div>
            </motion.div>

            {/* Expected total */}
            <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="rounded-2xl bg-nets-green/10 border border-nets-green/20 p-4">
              <p className="text-xs text-muted-foreground mb-0.5">Expected outing total</p>
              <p className="text-2xl font-extrabold text-nets-navy">S$40–46 <span className="text-sm font-normal text-muted-foreground">/ person</span></p>
              <p className="mt-1 text-xs font-semibold text-nets-green">✓ Within your Spend Band (S${mySpendBand.min}–S${mySpendBand.max})</p>
            </motion.div>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop1-menu")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              <UtensilsCrossed className="h-5 w-5" /> Start — Korean BBQ
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: MENU ──────────────────────────────────────────────────────── */}
      {phase === "stop1-menu" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("overview")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-nets-green px-2 py-0.5 text-[10px] font-bold">NOW</span>
                  <span className="text-xs text-white/70">6:30 PM · Seoul Table</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/50">NEXT</span>
                  <span className="text-xs text-white/40">8:00 PM · Arcade</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-white/50">Outing est.</p>
                <p className={`text-sm font-bold ${spendStatus === "over" ? "text-nets-red" : spendStatus === "close" ? "text-amber-400" : "text-nets-green"}`}>
                  S${fmt(outingTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-52 pt-4">
            {/* Merchant badge */}
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nets-navy text-sm font-extrabold text-white">ST</span>
              <div>
                <p className="font-bold text-nets-navy">Seoul Table</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="rounded-full bg-nets-green/15 px-2 py-0.5 text-[10px] font-bold text-nets-green">Merchant Menu ✓</span>
                  <span className="text-[10px] text-muted-foreground">Bugis+, #04-12</span>
                </div>
              </div>
            </div>

            {/* Menu categories */}
            {SEOUL_TABLE_MENU.map(cat => (
              <div key={cat.name} className="mb-4">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{cat.name}</p>
                <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
                  {cat.items.map((item, idx) => {
                    const inCart = cart.some(c => c.id === item.id)
                    const inShared = sharedDishes.some(d => d.id === item.id)
                    const added = inCart || inShared
                    return (
                      <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-border/50" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-nets-navy">{item.name}</p>
                          {item.shareable && <p className="text-[10px] text-nets-blue">Share with Circle?</p>}
                        </div>
                        <span className="shrink-0 text-sm font-bold text-nets-navy">S${fmt(item.price)}</span>
                        {added ? (
                          <button onClick={() => inShared ? removeSharedDish(item.id) : removeItem(item.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nets-red text-white shadow-sm active:opacity-70">
                            <Minus className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => addItem(item)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nets-navy text-white shadow-sm active:opacity-70">
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Shared dishes */}
            {sharedDishes.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Shared Dishes</p>
                {sharedDishes.map(d => (
                  <div key={d.id} className="mb-2 rounded-2xl bg-nets-blue/10 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-nets-navy">{d.name}</p>
                      <p className="text-sm font-bold text-nets-navy">S${fmt(d.totalPrice / Math.max(d.membersJoined, 1))}<span className="text-[10px] font-normal text-muted-foreground">/person</span></p>
                    </div>
                    {d.membersJoined <= 1 ? (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Waiting for others…</p>
                        <button onClick={() => simulateAllAccept(d.id)}
                          className="rounded-full bg-nets-blue/20 px-2.5 py-1 text-[10px] font-bold text-nets-blue active:opacity-70">
                          Demo: all join
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-nets-green">✓ All {d.membersJoined} members joining · S${fmt(d.totalPrice)} total</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Cart summary */}
            {cart.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">My Order</p>
                <div className="rounded-2xl bg-card p-3 shadow-sm">
                  {cart.map(i => (
                    <div key={i.id} className="flex justify-between py-1 text-sm">
                      <span className="text-nets-navy">{i.name}</span>
                      <span className="font-semibold text-nets-navy">S${fmt(i.price)}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-border/50 pt-2 text-sm font-bold">
                    <span className="text-nets-navy">Subtotal</span>
                    <span className="text-nets-navy">S${fmt(cartTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-border/30 bg-nets-page px-5 pb-6 pt-3">
            <div className="mb-3">
              <SpendTracker />
            </div>
            <button onClick={lockOrder}
              disabled={cart.length === 0 && sharedDishes.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-navy py-3.5 text-base font-bold text-white shadow-lg active:opacity-80 disabled:opacity-40">
              <Lock className="h-4 w-4" /> Lock Order
            </button>
          </div>

          {/* Share dish modal */}
          <AnimatePresence>
            {shareModalItem && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-end bg-black/40">
                <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
                  className="w-full rounded-t-3xl bg-white p-6">
                  <p className="text-lg font-extrabold text-nets-navy">{shareModalItem.name} · S${fmt(shareModalItem.price)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add just for yourself, or invite the group to share the cost.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => addDirectly(shareModalItem)}
                      className="rounded-2xl border border-border bg-card py-3 text-sm font-bold text-nets-navy active:opacity-70">
                      Just for me
                    </button>
                    <button onClick={() => startShare(shareModalItem)}
                      className="rounded-2xl bg-nets-navy py-3 text-sm font-bold text-white active:opacity-80">
                      Share with Circle
                    </button>
                  </div>
                  <button onClick={() => setShareModalItem(null)}
                    className="mt-3 w-full py-2 text-sm text-muted-foreground active:opacity-70">Cancel</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── STOP 1: TIME TO PAY ──────────────────────────────────────────────── */}
      {phase === "stop1-time-to-pay" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-menu")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <p className="font-bold">Time to Pay</p>
                <p className="text-xs text-white/60">Seoul Table · 6:30 PM</p>
              </div>
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 16 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nets-green">
                <Lock className="h-4 w-4 text-white" />
              </motion.span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-4">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Locked Circle Cart</p>

            {/* Group breakdown */}
            <div className="mb-4 overflow-hidden rounded-3xl bg-nets-navy text-white">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-sm text-white/70">Group total</p>
                <p className="text-2xl font-extrabold">S${fmt(groupDinnerTotal)}</p>
              </div>
              {circle.members.map((m, idx) => {
                const isMe = m.id === "thanis"
                const mockOrder = MOCK_OTHER_ORDERS.find(o => o.memberId === m.id)
                const memberAmt = isMe ? lockedDinnerAmt : (mockOrder?.amount ?? 0)
                return (
                  <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 ${idx < circle.members.length - 1 ? "border-b border-white/10" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.initial}</span>
                      <div>
                        <p className="text-sm font-semibold">{isMe ? "You" : m.name.split(" ")[0]}</p>
                        <p className="text-[10px] text-white/50">{isMe ? cart.map(i => i.name).join(", ") || "—" : (mockOrder?.label ?? "")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">S${fmt(memberAmt)}</p>
                      {isMe && <p className="text-[10px] text-nets-green">Your locked order</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Outing summary */}
            <div className="mb-5 rounded-2xl bg-nets-green/10 border border-nets-green/20 p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Your dinner</span>
                <span className="font-semibold text-nets-navy">S${fmt(lockedDinnerAmt)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Arcade (next)</span>
                <span className="font-semibold text-nets-navy">S${fmt(ARCADE_COST)}</span>
              </div>
              <div className="flex justify-between border-t border-black/10 pt-2 text-base font-extrabold text-nets-navy">
                <span>Your outing total</span>
                <span>S${fmt(lockedDinnerAmt + ARCADE_COST)}</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-nets-green">✓ Within your Spend Band (S${mySpendBand.min}–S${mySpendBand.max})</p>
            </div>

            {/* Q&A mismatch trigger — subtle, for presenters */}
            {!mismatchMode && (
              <button onClick={() => setMismatchMode(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-600 active:opacity-70">
                <AlertTriangle className="h-3 w-3" /> Q&A: Simulate payment mismatch (+S${MISMATCH_EXTRA})
              </button>
            )}
            {mismatchMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                Mismatch mode on — payment will show +S${MISMATCH_EXTRA} above locked cart.
                <button onClick={() => setMismatchMode(false)} className="ml-2 font-bold underline">Cancel</button>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop1-qr")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-red py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              <QrCode className="h-5 w-5" /> Pay with NETS
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: SCAN NETS QR ─────────────────────────────────────────────── */}
      {phase === "stop1-qr" && (
        <>
          <div className="bg-white">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-time-to-pay")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <div>
                <p className="font-bold text-nets-navy">Scan NETS QR</p>
                <p className="text-xs text-muted-foreground">Seoul Table · Bugis+</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-4">
            <div className="mb-6 flex flex-col items-center gap-4">
              <ProtoQr />
              <div className="text-center">
                <p className="text-sm font-semibold text-nets-navy">Seoul Table</p>
                <p className="text-xs text-muted-foreground">Bugis+, #04-12, 201 Victoria St</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-border bg-nets-navy/5 p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment amount</span>
                <span className="text-xl font-extrabold text-nets-navy">S${fmt(lockedDinnerAmt)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-semibold text-nets-navy">NETS Prepaid</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-semibold text-nets-green">S${fmt(user.balance)}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop1-confirm")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-red py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Pay S${fmt(lockedDinnerAmt)}
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: CONFIRM PAYMENT ──────────────────────────────────────────── */}
      {phase === "stop1-confirm" && (
        <>
          <div className="bg-white">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-qr")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <p className="font-bold text-nets-navy">Confirm Payment</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-nets-red/10">
                <CreditCard className="h-8 w-8 text-nets-red" />
              </div>
              <p className="text-3xl font-extrabold text-nets-navy">S${fmt(lockedDinnerAmt)}</p>
              <p className="mt-1 text-sm text-muted-foreground">to Seoul Table</p>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border border-border">
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Merchant</span>
                <span className="text-sm font-semibold text-nets-navy">Seoul Table</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-bold text-nets-navy">S${fmt(lockedDinnerAmt)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Payment method</span>
                <span className="text-sm font-semibold text-nets-navy">NETS Prepaid</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">From account</span>
                <span className="text-sm font-semibold text-nets-navy">DBS •••• 8102</span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              This is a prototype simulation. No real payment will be processed.
            </p>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={confirmDinnerPay}
              className="w-full rounded-full bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Confirm
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: PAYMENT SUCCESS ───────────────────────────────────────────── */}
      {phase === "stop1-success" && (
        <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-nets-green shadow-xl">
            <Check className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-nets-navy">Payment Successful ✓</h2>
          <p className="mt-2 text-sm text-muted-foreground">S${fmt(lockedDinnerAmt)} · Seoul Table</p>
          <div className="mt-4 rounded-2xl bg-nets-navy/5 px-4 py-3 text-left w-full max-w-xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Simulated NETS Payment Event</p>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Merchant</span>
              <span className="font-semibold text-nets-navy">Seoul Table</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-nets-navy">S${fmt(lockedDinnerAmt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ref</span>
              <span className="font-mono text-xs text-nets-navy">{dinnerTxnRef}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Detecting payment match…</p>
        </div>
      )}

      {/* ── STOP 1: PAYMENT MATCHED ───────────────────────────────────────────── */}
      {phase === "stop1-matched" && !mismatchMode && (
        <>
          <div className="bg-nets-green text-white">
            <StatusBar dark />
            <div className="px-5 pb-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white/70">Payment Detected</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-5">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="mb-4 rounded-3xl bg-white p-5 shadow-sm border border-border">
              <div className="mb-4 flex justify-between text-sm">
                <span className="text-muted-foreground">NETS Payment</span>
                <span className="text-lg font-extrabold text-nets-navy">S${fmt(groupDinnerTotal)}</span>
              </div>
              <div className="mb-4 flex justify-between text-sm">
                <span className="text-muted-foreground">Locked Circle Cart</span>
                <span className="text-lg font-extrabold text-nets-navy">S${fmt(groupDinnerTotal)}</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-nets-green py-3">
                <Check className="h-5 w-5 text-white" />
                <span className="text-base font-extrabold text-white">MATCHED ✓</span>
              </div>
            </motion.div>

            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
              className="mb-4 rounded-2xl bg-nets-green/10 border border-nets-green/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-nets-green" />
                <p className="text-sm font-bold text-nets-navy">Added to {circle.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">Your dinner payment has been recorded in the Circle ledger. No manual entry needed.</p>
            </motion.div>

            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
              className="rounded-2xl bg-card p-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Transaction Reference</p>
              <p className="font-mono text-xs text-nets-navy">{dinnerTxnRef}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Prototype simulation only. No real payment has been processed.</p>
            </motion.div>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop1-done")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Next stop — Arcade <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: PAYMENT MATCHED (mismatch mode) ───────────────────────────── */}
      {phase === "stop1-matched" && mismatchMode && !mismatchResolved && (
        <>
          <div className="bg-amber-500 text-white">
            <StatusBar dark />
            <div className="px-5 pb-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white/80">Something Changed</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-5">
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="mb-4 rounded-3xl bg-white p-5 shadow-sm border border-amber-200">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-bold text-nets-navy">Your final payment is S${MISMATCH_EXTRA} higher than the locked order.</p>
              </div>
              <div className="mb-3 flex justify-between text-sm border-b border-border pb-3">
                <span className="text-muted-foreground">Locked Circle Cart</span>
                <span className="font-bold text-nets-navy">S${fmt(groupDinnerTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">NETS Payment</span>
                <div className="text-right">
                  <span className="font-bold text-amber-600">S${fmt(groupDinnerTotal + MISMATCH_EXTRA)}</span>
                  <p className="text-[10px] text-amber-500">+S${MISMATCH_EXTRA} difference</p>
                </div>
              </div>
            </motion.div>

            <p className="mb-3 text-sm text-muted-foreground">How would you like to handle this?</p>
            <div className="space-y-3">
              <button onClick={() => setPhase("stop1-mismatch-resolve")}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-sm border border-border active:opacity-70">
                <Receipt className="h-5 w-5 text-nets-navy shrink-0" />
                <div className="text-left">
                  <p className="font-bold text-nets-navy text-sm">Update Changed Item</p>
                  <p className="text-xs text-muted-foreground">Add or adjust items to account for the difference</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              </button>
              <button onClick={() => setPhase("stop1-mismatch")}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-sm border border-border active:opacity-70">
                <ScanLine className="h-5 w-5 text-nets-navy shrink-0" />
                <div className="text-left">
                  <p className="font-bold text-nets-navy text-sm">Scan Receipt</p>
                  <p className="text-xs text-muted-foreground">Optional: scan paper receipt to verify</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── STOP 1: MISMATCH — SCAN RECEIPT (Q&A) ────────────────────────────── */}
      {phase === "stop1-mismatch" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-matched")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="font-bold">Scan Receipt</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-8">
            <div className="mb-6 flex flex-col items-center text-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-navy/10">
                <ScanLine className="h-10 w-10 text-nets-navy" />
              </div>
              <p className="font-bold text-nets-navy">Point camera at the restaurant receipt</p>
              <p className="text-sm text-muted-foreground">NETS Circle will read the total and confirm what changed.</p>
            </div>

            <div className="mb-4 rounded-2xl border-2 border-dashed border-nets-navy/30 bg-nets-navy/5 p-8 text-center">
              <p className="text-sm text-muted-foreground">Camera preview appears here</p>
              <p className="text-xs text-muted-foreground mt-1">(Prototype — OCR simulated)</p>
            </div>

            <button onClick={() => { setMismatchResolved(true); setPhase("stop1-matched") }}
              className="w-full rounded-full bg-nets-navy py-3.5 text-sm font-bold text-white active:opacity-80">
              Demo: Simulate successful scan
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: MISMATCH — UPDATE CHANGED ITEM (Q&A) ─────────────────────── */}
      {phase === "stop1-mismatch-resolve" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-matched")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="font-bold">Update Changed Item</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-4">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Your Locked Order</p>
            <div className="mb-4 rounded-2xl bg-card p-3 shadow-sm">
              {cart.map(i => (
                <div key={i.id} className="flex justify-between py-1 text-sm">
                  <span className="text-nets-navy">{i.name}</span>
                  <span className="font-semibold">S${fmt(i.price)}</span>
                </div>
              ))}
              {sharedDishes.filter(d => d.membersJoined > 1).map(d => (
                <div key={d.id} className="flex justify-between py-1 text-sm">
                  <span className="text-nets-navy">{d.name} (÷{d.membersJoined})</span>
                  <span className="font-semibold">S${fmt(d.totalPrice / d.membersJoined)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-border/50 pt-1.5 text-sm font-bold text-nets-navy">
                <span>Your subtotal</span>
                <span>S${fmt(lockedDinnerAmt)}</span>
              </div>
            </div>

            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">What Changed? (+S${MISMATCH_EXTRA})</p>
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 mb-1">Suggested: Shared Bingsu</p>
              <p className="text-xs text-amber-700 mb-3">Sherwin ordered an extra Bingsu (S$8) after locking. Split among all 4 members = S$2/person.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-800">Add to your share</span>
                <span className="text-sm font-bold text-amber-800">+S$2.00</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => { setLockedDinnerAmt(prev => prev + MISMATCH_EXTRA / circle.members.length); setMismatchResolved(true); setPhase("stop1-matched") }}
              className="w-full rounded-full bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Confirm Changes — S${fmt(lockedDinnerAmt + MISMATCH_EXTRA / circle.members.length)} total
            </button>
          </div>
        </>
      )}

      {/* ── STOP 1: DONE ─────────────────────────────────────────────────────── */}
      {phase === "stop1-done" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <span className="text-sm font-bold">Dinner · Done</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 16 }}
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-nets-green shadow-lg">
                <Check className="h-10 w-10 text-white" />
              </motion.span>
              <h2 className="text-2xl font-extrabold text-nets-navy">Dinner paid ✓</h2>
              <p className="mt-1 text-sm text-muted-foreground">S${fmt(lockedDinnerAmt)} · Seoul Table</p>
            </div>

            {/* Next stop preview */}
            <div className="mb-5 rounded-3xl bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-nets-navy/10 px-2.5 py-0.5 text-[10px] font-bold text-nets-navy">NEXT</span>
                <span className="text-xs text-muted-foreground">8:00 PM · ~30 min away</span>
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-nets-navy" />
                  <div>
                    <p className="font-extrabold text-nets-navy">Arcade Zone @ Bugis+</p>
                    <p className="text-xs text-muted-foreground">Level 3, Bugis+</p>
                  </div>
                </div>
                <p className="text-base font-extrabold text-nets-navy">S${fmt(ARCADE_COST)}</p>
              </div>
              <div className="rounded-xl bg-nets-navy/5 p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground flex items-center gap-1"><Check className="h-2.5 w-2.5 text-nets-green" /> Dinner paid</span>
                  <span className="font-semibold text-nets-navy">S${fmt(lockedDinnerAmt)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Arcade (next)</span>
                  <span className="font-semibold text-nets-navy">S${fmt(ARCADE_COST)}</span>
                </div>
                <div className="flex justify-between border-t border-black/10 pt-1.5 text-sm font-bold text-nets-navy">
                  <span>Outing total</span>
                  <span>S${fmt(lockedDinnerAmt + ARCADE_COST)}</span>
                </div>
                <p className="mt-1 text-[10px] font-semibold text-nets-green">✓ Within your Spend Band</p>
              </div>
            </div>

            {/* Demo: unplanned payment trigger */}
            <button onClick={() => setPhase("unplanned-payment")}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-600 active:opacity-70">
              <Bell className="h-3 w-3" /> Q&A: Simulate unplanned NETS payment
            </button>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop2-activity")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Continue to Arcade <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {/* ── UNPLANNED PAYMENT (Q&A demo) ─────────────────────────────────────── */}
      {phase === "unplanned-payment" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-done")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-white/70" />
                <p className="font-bold">Payment Detected</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-5">
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="mb-4 rounded-3xl bg-white p-5 shadow-sm border border-border">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Payment detected during {circle.name}</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-nets-red text-white font-extrabold">K</span>
                <div className="flex-1">
                  <p className="font-bold text-nets-navy">Kopitiam @ Bugis</p>
                  <p className="text-xs text-muted-foreground">Today, between dinner and arcade</p>
                </div>
                <p className="text-xl font-extrabold text-nets-navy">S$8.50</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Add this payment to your Circle?</p>
              <div className="space-y-2">
                <button onClick={() => setPhase("stop1-done")}
                  className="flex w-full items-center justify-between rounded-xl bg-nets-navy/5 border border-nets-navy/10 px-4 py-3 active:opacity-70">
                  <div className="text-left">
                    <p className="text-sm font-bold text-nets-navy">Personal</p>
                    <p className="text-xs text-muted-foreground">Just for you, not shared with group</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
                <button onClick={() => setPhase("stop1-done")}
                  className="flex w-full items-center justify-between rounded-xl bg-nets-blue/10 border border-nets-blue/20 px-4 py-3 active:opacity-70">
                  <div className="text-left">
                    <p className="text-sm font-bold text-nets-navy">Shared</p>
                    <p className="text-xs text-muted-foreground">Split with selected members</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
                <button onClick={() => setPhase("stop1-done")}
                  className="flex w-full items-center justify-between rounded-xl bg-card border border-border px-4 py-3 active:opacity-70">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-muted-foreground">Ignore</p>
                    <p className="text-xs text-muted-foreground">Don't add to this Circle</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            </motion.div>
            <p className="text-center text-xs text-muted-foreground px-4">
              NETS Circle only surfaces payments from active NETS transactions. Nothing is added without your confirmation.
            </p>
          </div>
        </>
      )}

      {/* ── STOP 2: ACTIVITY ─────────────────────────────────────────────────── */}
      {phase === "stop2-activity" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop1-done")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:opacity-70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-nets-green px-2 py-0.5 text-[10px] font-bold">NOW</span>
                  <span className="text-xs text-white/70">8:00 PM · Arcade</span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">Stop 2 of 2</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-5">
            <div className="mb-5 rounded-3xl bg-nets-navy p-5 text-white">
              <div className="flex items-center gap-2 mb-0.5">
                <Gamepad2 className="h-5 w-5 text-white/70" />
                <p className="text-xl font-extrabold">Arcade Zone @ Bugis+</p>
              </div>
              <p className="text-sm text-white/60 mb-3">Bugis+, Level 3, 201 Victoria St</p>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Arcade Package</p>
                    <p className="text-xs text-white/60">~45 min · per person</p>
                  </div>
                  <p className="text-xl font-extrabold">S${fmt(ARCADE_COST)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-nets-green" />
                <span className="text-xs text-nets-green font-semibold">Core plan · Agreed by all {circle.members.length} members</span>
              </div>
            </div>

            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Your Outing Total</p>
            <div className="mb-5 rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground flex items-center gap-1.5"><Check className="h-3 w-3 text-nets-green" /> Dinner (paid)</span>
                <span className="font-semibold text-nets-navy">S${fmt(lockedDinnerAmt)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Arcade (now)</span>
                <span className="font-semibold text-nets-navy">S${fmt(ARCADE_COST)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold text-nets-navy">
                <span>Total</span>
                <span>S${fmt(lockedDinnerAmt + ARCADE_COST)}</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-nets-green">✓ Within your Spend Band (S${mySpendBand.min}–S${mySpendBand.max})</p>
            </div>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop2-confirm")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-red py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              <QrCode className="h-5 w-5" /> Pay S${fmt(ARCADE_COST)} with NETS
            </button>
          </div>
        </>
      )}

      {/* ── STOP 2: QR ───────────────────────────────────────────────────────── */}
      {phase === "stop2-qr" && (
        <>
          <div className="bg-white">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop2-activity")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <div>
                <p className="font-bold text-nets-navy">Scan NETS QR</p>
                <p className="text-xs text-muted-foreground">Arcade Zone @ Bugis+</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-4">
            <div className="mb-6 flex flex-col items-center gap-4">
              <ProtoQr />
              <div className="text-center">
                <p className="text-sm font-semibold text-nets-navy">Arcade Zone @ Bugis+</p>
                <p className="text-xs text-muted-foreground">Bugis+, Level 3</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-border bg-nets-navy/5 p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment amount</span>
                <span className="text-xl font-extrabold text-nets-navy">S${fmt(ARCADE_COST)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-semibold text-nets-navy">NETS Prepaid</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-semibold text-nets-green">S${fmt(Math.max(0, user.balance - lockedDinnerAmt))}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={() => setPhase("stop2-confirm")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-red py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Pay S${fmt(ARCADE_COST)}
            </button>
          </div>
        </>
      )}

      {/* ── STOP 2: CONFIRM ──────────────────────────────────────────────────── */}
      {phase === "stop2-confirm" && (
        <>
          <div className="bg-white">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setPhase("stop2-qr")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <p className="font-bold text-nets-navy">Confirm Payment</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-nets-red/10">
                <Gamepad2 className="h-8 w-8 text-nets-red" />
              </div>
              <p className="text-3xl font-extrabold text-nets-navy">S${fmt(ARCADE_COST)}</p>
              <p className="mt-1 text-sm text-muted-foreground">to Arcade Zone @ Bugis+</p>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border border-border">
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Merchant</span>
                <span className="text-sm font-semibold text-nets-navy">Arcade Zone @ Bugis+</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-bold text-nets-navy">S${fmt(ARCADE_COST)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Payment method</span>
                <span className="text-sm font-semibold text-nets-navy">NETS Prepaid</span>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">Prototype simulation — no real payment will be processed.</p>
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <button onClick={confirmArcadePay}
              className="w-full rounded-full bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Confirm
            </button>
          </div>
        </>
      )}

      {/* ── STOP 2: SUCCESS ──────────────────────────────────────────────────── */}
      {phase === "stop2-success" && (
        <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-nets-green shadow-xl">
            <Check className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-nets-navy">Payment Successful ✓</h2>
          <p className="mt-2 text-sm text-muted-foreground">S${fmt(ARCADE_COST)} · Arcade Zone @ Bugis+</p>
          <div className="mt-4 rounded-2xl bg-nets-navy/5 px-4 py-3 text-left w-full max-w-xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Simulated NETS Payment Event</p>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Merchant</span>
              <span className="font-semibold text-nets-navy">Arcade Zone @ Bugis+</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-nets-navy">S${fmt(ARCADE_COST)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ref</span>
              <span className="font-mono text-xs text-nets-navy">{arcadeTxnRef}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── OUTING COMPLETE ───────────────────────────────────────────────────── */}
      {phase === "outing-complete" && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="px-5 pb-4 pt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white/60">Outing complete</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-nets-page px-5 pb-32 pt-8">
            <div className="mb-8 flex flex-col items-center text-center">
              <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-nets-navy shadow-xl">
                <TrendingUp className="h-12 w-12 text-white" />
              </motion.div>
              <h2 className="text-2xl font-extrabold text-nets-navy">Amazing night out!</h2>
              <p className="mt-1 text-sm text-muted-foreground">You tracked your whole outing in Circle Pay.</p>
            </div>

            <div className="mb-4 rounded-3xl bg-nets-navy p-5 text-white">
              <p className="text-xs text-white/60 mb-1">Total spent tonight</p>
              <p className="text-3xl font-extrabold">S${fmt(lockedDinnerAmt + ARCADE_COST)}</p>
              <p className="text-sm text-white/60 mt-0.5">/ person · {circle.members.length} members</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Seoul Table — Dinner</span>
                  <span className="font-semibold">S${fmt(lockedDinnerAmt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Arcade Zone — Arcade</span>
                  <span className="font-semibold">S${fmt(ARCADE_COST)}</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-nets-green/20 px-3 py-2">
                <p className="text-xs font-semibold text-nets-green">✓ Within your Spend Band (S${mySpendBand.min}–S${mySpendBand.max})</p>
              </div>
            </div>

            {/* TXN summary */}
            <div className="mb-5 rounded-2xl bg-card p-4 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground mb-3">Simulated NETS Payment Events</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dinner · Seoul Table</span>
                  <span className="font-mono text-nets-navy">{dinnerTxnRef}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Arcade · Arcade Zone</span>
                  <span className="font-mono text-nets-navy">{arcadeTxnRef}</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Prototype demonstration only. In real implementation, equivalent confirmation data would come from NETS' payment system.</p>
            </div>

            <p className="mb-4 text-center text-xs text-muted-foreground">Everyone paid their own share via NETS. No debts to chase.</p>
          </div>

          <div className="absolute bottom-6 left-5 right-5 flex flex-col gap-2">
            <button onClick={onSettle}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nets-red py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Close Circle <ArrowRight className="h-5 w-5" />
            </button>
            <button onClick={onBack}
              className="w-full rounded-full border border-nets-navy/20 bg-transparent py-2.5 text-sm font-semibold text-nets-navy/70 active:opacity-70">
              Back to Circles
            </button>
          </div>
        </>
      )}

    </motion.div>
  )
}

// ─── Circle Detail (non-active circles) ──────────────────────────────────────

function CircleDetail({
  circle, mySpendBand, onBack, onSettle, onReconcile, onAddExpense,
}: {
  circle: Circle
  mySpendBand: { min: number; max: number }
  onBack: () => void
  onSettle: () => void
  onReconcile: () => void
  onAddExpense: (expense: Omit<CircleExpense, "id">, deductFromWallet: boolean) => void
}) {
  const { user, nextRoundRequests, applyNextRound } = useCircleData()
  const { scene, clearScene } = useDemoContext()
  const total = circleTotal(circle)
  const share = perHead(circle)
  const mySpend = circle.expenses
    .filter((e) => e.paidById === "thanis")
    .reduce((sum, e) => sum + e.amount, 0)

  // ── ONE WEEK LATER overlay (Saturday Brunch demo) ──
  // Demo scene "brunch:one-week-later" resets the overlay so it shows again
  const [oneWeekDismissed, setOneWeekDismissed] = useState(false)
  useEffect(() => {
    if (scene === "brunch:one-week-later" && circle.id === "c-brunch") {
      setOneWeekDismissed(false)
      clearScene()
    }
  }, [scene, circle.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const showOneWeekLater = circle.id === "c-brunch" && !oneWeekDismissed

  // ── Next Round state for this circle ──
  // Accepted NR requests where both parties are in this circle
  const circleMemberIds = new Set(circle.members.map((m) => m.id))
  const activeNrRequests = nextRoundRequests.filter(
    (r) => (r.status === "accepted" || r.status === "partial") &&
      circleMemberIds.has(r.fromId) && circleMemberIds.has(r.toId)
  )
  // Thanis is the creditor (toId = "thanis") for the demo
  const myNrCredits = activeNrRequests.filter((r) => r.toId === "thanis")
  const myNrDebts   = activeNrRequests.filter((r) => r.fromId === "thanis")
  const totalNrCredit = myNrCredits.reduce((s, r) => s + r.remaining, 0)
  const totalNrDebt   = myNrDebts.reduce((s, r) => s + r.remaining, 0)

  // ── Brunch payment demo (c-brunch only) ──
  type BrunchPhase = null | "share-confirm" | "pay-qr" | "nr-applied"
  const [brunchPhase, setBrunchPhase] = useState<BrunchPhase>(null)
  const [viewAsKrishna, setViewAsKrishna] = useState(false)
  const BRUNCH_SHARE = circle.estimatedCostPerPerson  // S$40
  const brunchMyPay = Math.max(0, BRUNCH_SHARE - totalNrCredit)
  const brunchKrishnaPay = BRUNCH_SHARE + totalNrCredit  // Krishna covers extra

  function applyBrunchNr() {
    myNrCredits.forEach((r) => applyNextRound(r.id, Math.min(r.remaining, totalNrCredit)))
    setBrunchPhase("nr-applied")
  }

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
        paidById: "thanis",
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
  const [manualPaidBy, setManualPaidBy] = useState("thanis")
  const [manualSplit, setManualSplit] = useState<string[]>(circle.members.map((m) => m.id))

  const EXPENSE_CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Accommodation", "Others"]

  function handleManualAddExpense() {
    if (!manualTitle.trim() || !manualAmount || parseFloat(manualAmount) <= 0) return
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
    onAddExpense(
      { title: manualTitle, merchant: manualTitle, category: manualCategory, amount: parseFloat(manualAmount), paidById: manualPaidBy, participants: manualSplit, time: now },
      true  // always deduct from NETS Prepaid for manual entries too
    )
    setManualEntryOpen(false)
    setManualTitle("")
    setManualAmount("")
    setManualCategory("Food")
  }

  // Circle Order Preview
  const [orderPreview, setOrderPreview] = useState<{ name: string; price: number; assignedTo: string }[]>([])
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")

  function addPreviewItem() {
    if (!newItemName.trim() || !newItemPrice) return
    setOrderPreview((prev) => [...prev, { name: newItemName, price: parseFloat(newItemPrice), assignedTo: "thanis" }])
    setNewItemName("")
    setNewItemPrice("")
  }

  const previewTotal = orderPreview.reduce((s, i) => s + i.price, 0)
  const previewCommitmentGuidance = privateCommitmentGuidance(previewTotal, mySpendBand.max)

  // ── Brunch payment demo screens (overlays on top of CircleDetail) ──
  if (brunchPhase === "share-confirm" || brunchPhase === "pay-qr" || brunchPhase === "nr-applied") {
    return (
      <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex h-full flex-col relative bg-nets-page">
        <div className="bg-nets-page">
          <StatusBar />
          <div className="flex items-center gap-3 px-5 pb-3 pt-1">
            <button onClick={() => setBrunchPhase(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
              <ChevronLeft className="h-5 w-5 text-nets-navy" />
            </button>
            <p className="font-bold text-nets-navy">
              {brunchPhase === "nr-applied" ? "Next Round Applied ✓" : "Saturday Brunch · Payment"}
            </p>
          </div>
        </div>

        {brunchPhase === "share-confirm" && (
          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-4">
            <p className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Your Private Share</p>

            {!viewAsKrishna ? (
              <>
                <div className="mb-4 overflow-hidden rounded-3xl bg-white border border-border shadow-sm">
                  <div className="flex justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Your share (base)</span>
                    <span className="text-sm font-semibold text-nets-navy">S${fmt(BRUNCH_SHARE)}</span>
                  </div>
                  {myNrCredits.map((r) => (
                    <div key={r.id} className="flex justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
                      <span className="text-sm text-amber-700 flex items-center gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                        Next Round covered by {r.fromId === "krishna" ? "Krishna" : r.fromId}
                      </span>
                      <span className="text-sm font-bold text-amber-600">−S${fmt(r.remaining)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3 bg-nets-green/5">
                    <span className="text-base font-bold text-nets-navy">You pay</span>
                    <span className="text-xl font-extrabold text-nets-navy">S${fmt(brunchMyPay)}</span>
                  </div>
                </div>
                <div className="mb-5 rounded-xl border border-nets-green/30 bg-nets-green/10 px-4 py-3">
                  <p className="text-xs font-semibold text-nets-green">S${fmt(totalNrCredit)} of your share is covered by your Next Round with Krishna.</p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-center">
                  <span className="text-[10px] font-bold text-amber-700">Viewing as Krishna</span>
                </div>
                <div className="mb-4 overflow-hidden rounded-3xl bg-white border border-border shadow-sm">
                  <div className="flex justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Krishna's share (base)</span>
                    <span className="text-sm font-semibold text-nets-navy">S${fmt(BRUNCH_SHARE)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
                    <span className="text-sm text-amber-700 flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" />
                      Next Round coverage for Thanis
                    </span>
                    <span className="text-sm font-bold text-amber-600">+S${fmt(totalNrCredit)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-amber-50/50">
                    <span className="text-base font-bold text-nets-navy">Krishna pays</span>
                    <span className="text-xl font-extrabold text-nets-navy">S${fmt(brunchKrishnaPay)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs text-amber-700">Krishna committed to covering S${fmt(totalNrCredit)} of Thanis' share — this is reflected in their private view only.</p>
                </div>
              </>
            )}

            <button onClick={() => setViewAsKrishna((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground active:opacity-70">
              <Smartphone className="h-3 w-3" /> Switch view: {viewAsKrishna ? "Back to Thanis" : "View as Krishna"}
            </button>
          </div>
        )}

        {brunchPhase === "pay-qr" && (
          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-4">
            <div className="mb-5 flex flex-col items-center text-center">
              <p className="mb-1 text-3xl font-extrabold text-nets-navy">S${fmt(brunchMyPay)}</p>
              <p className="text-sm text-muted-foreground">Symmetry Café · Your share after Next Round</p>
            </div>
            <div className="mb-5 flex justify-center">
              <PayNowQr name="Symmetry Café" />
            </div>
            <div className="mb-4 rounded-2xl bg-nets-navy/5 p-4 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-3">How to pay</p>
              {["Open your banking app", "Scan or upload this PayNow QR", `Pay S$${fmt(brunchMyPay)}`].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nets-navy text-xs font-bold text-white">{i + 1}</span>
                  <p className="text-sm text-nets-navy">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {brunchPhase === "nr-applied" && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-amber-400 shadow-xl">
              <Check className="h-12 w-12 text-white" />
            </motion.div>
            <h2 className="text-2xl font-extrabold text-nets-navy">NEXT ROUND COMPLETED ✓</h2>
            <p className="mt-3 text-sm text-muted-foreground px-4">
              Krishna's S${fmt(totalNrCredit)} Next Round commitment has been fully applied. The balance is cleared.
            </p>
            <div className="mt-5 w-full max-w-xs rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Your base share</span>
                <span className="font-semibold text-nets-navy">S${fmt(BRUNCH_SHARE)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Next Round applied</span>
                <span className="font-bold text-amber-600">−S${fmt(totalNrCredit)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                <span className="text-muted-foreground">You paid</span>
                <span className="font-bold text-nets-green">S${fmt(brunchMyPay)}</span>
              </div>
            </div>
            <button onClick={() => setBrunchPhase(null)}
              className="mt-5 w-full max-w-xs rounded-2xl bg-nets-navy py-3.5 text-sm font-bold text-white active:opacity-80">
              Back to Saturday Brunch
            </button>
          </div>
        )}

        {(brunchPhase === "share-confirm" || brunchPhase === "pay-qr") && !viewAsKrishna && (
          <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card px-5 pb-8 pt-3 space-y-2">
            {brunchPhase === "share-confirm" && (
              <button onClick={() => setBrunchPhase("pay-qr")}
                className="w-full rounded-2xl bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
                Proceed to Pay S${fmt(brunchMyPay)}
              </button>
            )}
            {brunchPhase === "pay-qr" && (
              <button onClick={applyBrunchNr}
                className="w-full rounded-2xl bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
                Payment Sent — Apply Next Round
              </button>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex h-full flex-col"
    >
      {/* ONE WEEK LATER overlay */}
      <AnimatePresence>
        {showOneWeekLater && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-nets-navy px-8 text-center">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-white/40 mb-3">Prototype · Demo Transition</p>
              <h1 className="text-4xl font-extrabold text-white mb-2">ONE WEEK</h1>
              <h1 className="text-4xl font-extrabold text-white mb-6">LATER…</h1>
              <p className="text-base text-white/70 mb-2">Saturday Brunch is coming up.</p>
              <p className="text-sm text-white/50">Your Next Round with Krishna carries forward.</p>
            </motion.div>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              onClick={() => setOneWeekDismissed(true)}
              className="mt-10 rounded-full bg-white px-8 py-3.5 text-base font-bold text-nets-navy shadow-xl active:opacity-80">
              Open Saturday Brunch →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Next Round Panel — planning circles with active NR requests */}
        {circle.status === "planning" && (myNrCredits.length > 0 || myNrDebts.length > 0) && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Your Next Round · Private</p>
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
              {myNrCredits.map((r) => (
                <div key={r.id} className="border-b border-amber-100 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="h-3.5 w-3.5 rotate-180 text-amber-600" />
                    <p className="text-xs font-bold text-amber-700">
                      {r.fromId === "krishna" ? "Krishna" : r.fromId} has your next S${fmt(r.remaining)} covered
                    </p>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Expected outing</span>
                      <span className="font-semibold text-nets-navy">S${fmt(circle.estimatedCostPerPerson)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-700 flex items-center gap-1"><ArrowRight className="h-3 w-3 rotate-180" /> Next Round</span>
                      <span className="font-bold text-amber-600">−S${fmt(r.remaining)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-amber-100 pt-1">
                      <span className="font-bold text-nets-navy">Expected out-of-pocket</span>
                      <span className="font-extrabold text-nets-navy">~S${fmt(circle.estimatedCostPerPerson - r.remaining)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {myNrDebts.map((r) => (
                <div key={r.id} className="border-b border-amber-100 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-xs font-bold text-amber-700">
                      You'll cover S${fmt(r.remaining)} of {r.toId === "thanis" ? "Thanis'" : r.toId + "'s"} share
                    </p>
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-muted-foreground">Your share (base)</span>
                    <span className="font-semibold text-nets-navy">S${fmt(circle.estimatedCostPerPerson)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-700">+ Next Round coverage</span>
                    <span className="font-bold text-amber-600">+S${fmt(r.remaining)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-amber-100 pt-1 mt-1">
                    <span className="font-bold text-nets-navy">Expected out-of-pocket</span>
                    <span className="font-extrabold text-nets-navy">~S${fmt(circle.estimatedCostPerPerson + r.remaining)}</span>
                  </div>
                </div>
              ))}
              {/* Demo: payment simulation for c-brunch */}
              {circle.id === "c-brunch" && (
                <button onClick={() => setBrunchPhase("share-confirm")}
                  className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-amber-700 active:opacity-70">
                  Demo: Simulate payment with Next Round →
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Circle Order Preview */}
        {circle.status === "active" && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }} className="mb-4">
            <div className="mt-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-nets-navy" />
                <p className="text-xs font-bold text-nets-navy">Circle Order Preview</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Build your intended order before you order. This gives you private spend-band guidance before the bill arrives.
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
        )}
        {circle.status === "settled" ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-green/10 border border-nets-green/30 py-4 text-base font-bold text-nets-green">
            <Check className="h-5 w-5" /> Circle settled — no chasing needed
          </div>
        ) : (
          <button onClick={onSettle} disabled={circle.expenses.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/25 disabled:opacity-40">
            <Zap className="h-5 w-5" />
            {circle.expenses.length === 0 ? "Waiting for expenses…" : `Circle Close · $${fmt(total)}`}
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

                    <div className="mb-4 rounded-2xl bg-white/10 px-4 py-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">NETS Prepaid balance</span>
                        <span className="font-extrabold text-white">S${fmt(user.balance)}</span>
                      </div>
                      {scanAmount && parseFloat(scanAmount) > 0 && (
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-white/60">After this payment</span>
                          <span className={`font-extrabold ${user.balance - parseFloat(scanAmount) >= 0 ? "text-nets-green" : "text-nets-red"}`}>
                            S${fmt(Math.max(0, user.balance - parseFloat(scanAmount || "0")))}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-white/40 shrink-0" />
                        <p className="text-[10px] text-white/40">Deducted from your personal NETS Prepaid</p>
                      </div>
                    </div>

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
  const total = circleTotal(circle)
  const [step, setStep] = useState<Step>("idle")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [netsForm, setNetsForm] = useState<NetsFormData | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const surplusPerPerson = 0
  const mySettlement = settlements.find((s) => s.fromId === "thanis")

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
      const myRecord = (createData.settlements as SettlementRecord[]).find((s) => s.fromMemberId === "thanis")
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

        {surplusPerPerson > 0 && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}
            className="mt-3 flex items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 p-4">
            <Wallet className="h-5 w-5 text-nets-green shrink-0" />
            <div>
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
                  className={`flex items-center gap-3 rounded-3xl p-4 shadow-sm ${s.fromId === "thanis" ? "bg-nets-red/5 border border-nets-red/20" : "bg-card"}`}>
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

// ─── Circle Close ─────────────────────────────────────────────────────────────

type CloseBalance = {
  id: string
  fromId: string
  fromName: string
  fromInitial: string
  fromColor: string
  toId: string
  toName: string
  amount: number
  status: "pending" | "waiting-confirm" | "settled" | "outstanding" | "nr-waiting" | "nr-accepted"
}

function computeCloseBalances(circle: Circle): CloseBalance[] {
  const memberMap = new Map(circle.members.map(m => [m.id, m]))
  const memberBalances = computeBalancesFromExpenses(circle)

  return memberBalances.map((mb, idx) => {
    const fromMember = memberMap.get(mb.fromId)
    const toMember = memberMap.get(mb.toId)
    return {
      id: `balance-${idx}`,
      fromId: mb.fromId,
      fromName: fromMember?.name ?? mb.fromId,
      fromInitial: fromMember?.initial ?? "?",
      fromColor: fromMember?.color ?? "var(--nets-navy)",
      toId: mb.toId,
      toName: toMember?.name ?? mb.toId,
      amount: mb.amount,
      status: "pending" as const
    }
  })
}

// PayNow QR — a static placeholder representing Thanis' saved receiving QR.
// This is a real-looking QR image placeholder using the QrCode icon.
// Circle does NOT send money; the user scans this with their banking app.
function PayNowQr({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border-4 border-nets-navy bg-white shadow-xl">
        <QrCode className="h-44 w-44 text-nets-navy" strokeWidth={0.65} />
        <div className="absolute inset-x-0 bottom-0 bg-nets-navy py-1 text-center">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-white">PayNow · {name}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Saved PayNow receiving QR</p>
    </div>
  )
}

type CloseScreen =
  | "home"
  | "settle-qr"        // sender sees PayNow QR for a specific balance
  | "settle-waiting"   // sender tapped "Payment Sent" — waiting for recipient
  | "settle-done"      // recipient confirmed receipt
  | "settle-rejected"  // recipient said Not Yet
  | "nr-request"       // creditor (Thanis) proposes NR — sends to debtor
  | "nr-waiting"       // NR sent, waiting for debtor to respond
  | "nr-recipient"     // demo: debtor's (Krishna) view — accept or settle now
  | "nr-confirmed"     // NR accepted — "Krishna has your next S$11 covered"
  // Q&A only — future bank integration demo (NOT part of MVP)
  | "future-settle"    // outstanding balance + "Settle" CTA with FUTURE badge
  | "future-auth"      // mock bank authorisation screen
  | "future-done"      // auto-settled — no sender/recipient confirmation needed

function OneWeekLaterButton() {
  const { activateScene } = useDemoContext()
  const { openCircle } = useNav()
  return (
    <button
      onClick={() => {
        activateScene("brunch:one-week-later")
        openCircle("c-brunch")
      }}
      className="mt-5 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-white shadow-lg active:opacity-80"
    >
      One Week Later… <ArrowRight className="h-4 w-4" />
    </button>
  )
}

function downloadPayNowQr(name: string, amount: number) {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 600
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "#001f3f"
  ctx.font = "bold 24px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("PayNow QR", canvas.width / 2, 50)

  ctx.fillStyle = "#cccccc"
  ctx.fillRect(100, 90, 312, 312)

  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillStyle = "#001f3f"
        ctx.fillRect(100 + i * 19.5, 90 + j * 19.5, 19.5, 19.5)
      }
    }
  }

  ctx.fillStyle = "#001f3f"
  ctx.font = "14px sans-serif"
  ctx.fillText(`To: ${name}`, canvas.width / 2, 450)
  ctx.fillText(`Amount: S$${amount.toFixed(2)}`, canvas.width / 2, 480)
  ctx.font = "12px sans-serif"
  ctx.fillStyle = "#666666"
  ctx.fillText("Scan with your banking app", canvas.width / 2, 530)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `paynow-qr-${name.replace(/\s+/g, "-")}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

function CircleSettle({ circle, onBack, onDone }: { circle: Circle; onBack: () => void; onDone: () => void }) {
  const { createNextRoundRequest, acceptNextRound, declineNextRound } = useCircleData()
  const { scene, clearScene } = useDemoContext()

  // Parse demo scene: "close:<screen>[:<nrId>]" or "close:<screen>-recipient[:<nrId>]"
  const demoCloseScene = scene?.startsWith("close:") ? scene.replace("close:", "") : null
  const demoScreenRaw = demoCloseScene?.split(":")[0] ?? null
  const demoNrId = demoCloseScene?.split(":")[1] ?? null
  const demoIsRecipient = demoScreenRaw?.endsWith("-recipient") ?? false
  const demoScreen = demoScreenRaw?.replace(/-recipient$/, "") as CloseScreen | null

  const computedBalances = computeCloseBalances(circle)
  const [balances, setBalances] = useState<CloseBalance[]>(computedBalances)
  const [screen, setScreen] = useState<CloseScreen>(() => demoScreen ?? "home")
  const [activeBalanceId, setActiveBalanceId] = useState<string | null>(() =>
    demoScreen && demoScreen !== "home" ? computedBalances[0]?.id ?? null : null
  )
  const [recipientView, setRecipientView] = useState(() => demoIsRecipient)
  const [activeNrId, setActiveNrId] = useState<string | null>(() => demoNrId)

  // Clear scene once consumed
  useEffect(() => {
    if (demoCloseScene) clearScene()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const active = balances.find((b) => b.id === activeBalanceId) ?? null
  const allResolved = balances
    .filter((b) => b.fromId === "thanis" || b.toId === "thanis")
    .every((b) => b.status === "settled" || b.status === "nr-accepted")

  function openSettleQr(b: CloseBalance) {
    setActiveBalanceId(b.id)
    setRecipientView(false)
    setScreen("settle-qr")
  }

  function senderSentPayment() {
    setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "waiting-confirm" } : b))
    setScreen("settle-waiting")
  }

  function recipientConfirm() {
    setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "settled" } : b))
    setScreen("settle-done")
  }

  function recipientReject() {
    setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "outstanding" } : b))
    setScreen("settle-rejected")
  }

  function openNrRequest(b: CloseBalance) {
    setActiveBalanceId(b.id)
    setScreen("nr-request")
  }

  function sendNrRequest() {
    if (!active) return
    const id = createNextRoundRequest({
      fromId: active.fromId,
      toId: active.toId,
      amount: active.amount,
      remaining: active.amount,
      originCircleId: circle.id,
      status: "pending",
    })
    setActiveNrId(id)
    setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "nr-waiting" } : b))
    setScreen("nr-waiting")
  }

  function nrAccept() {
    if (activeNrId) acceptNextRound(activeNrId)
    setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "nr-accepted" } : b))
    setScreen("nr-confirmed")
  }

  function nrDeclineToSettle() {
    if (activeNrId) declineNextRound(activeNrId)
    setActiveNrId(null)
    setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "pending" } : b))
    if (active) openSettleQr({ ...active, status: "pending" })
  }

  function openFutureSettle(b: CloseBalance) {
    setActiveBalanceId(b.id)
    setScreen("future-settle")
  }

  const waitingCount = balances.filter((b) => b.status === "waiting-confirm").length

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
      className="relative flex h-full flex-col bg-nets-page">

      {/* ── HOME ── */}
      {screen === "home" && (
        <>
          <div className="bg-nets-page">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={onBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <div>
                <p className="font-extrabold text-nets-navy">Circle Complete</p>
                <p className="text-xs text-muted-foreground">{circle.name}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-2">
            <p className="mb-4 text-sm text-muted-foreground">Circle worked out what's left.</p>

            {/* Balance list */}
            <div className="space-y-3">
              {balances.map((b, i) => {
                const isSettled = b.status === "settled"
                const isNrAccepted = b.status === "nr-accepted"
                const isNrWaiting = b.status === "nr-waiting"
                const isWaiting = b.status === "waiting-confirm"
                const isOutstanding = b.status === "outstanding"
                return (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={`rounded-3xl p-4 shadow-sm ${isSettled ? "bg-nets-green/10 border border-nets-green/20" : isNrAccepted ? "bg-amber-50 border border-amber-200" : isNrWaiting ? "bg-amber-50/60 border border-amber-100" : isWaiting ? "bg-blue-50 border border-blue-200" : isOutstanding ? "bg-red-50 border border-red-200" : "bg-card"}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ backgroundColor: b.fromColor }}>{b.fromInitial}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-nets-navy">
                          {b.fromName} owes {b.toName === "Thanis" ? "you" : b.toName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isSettled ? "Settled ✓" : isNrAccepted ? "Next Round confirmed ✓" : isNrWaiting ? "Next Round — waiting for response" : isWaiting ? "Waiting for confirmation" : isOutstanding ? "Not yet received" : b.amount <= NEXT_ROUND_THRESHOLD ? "Pending · Next Round eligible" : "Pending"}
                        </p>
                      </div>
                      <span className={`text-base font-extrabold ${isSettled ? "text-nets-green" : isNrAccepted ? "text-amber-600" : "text-nets-navy"}`}>
                        S${fmt(b.amount)}
                      </span>
                    </div>

                    {/* Actions — only for balances where Thanis is the payer */}
                    {b.fromId === "thanis" && !isSettled && !isNrAccepted && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => openSettleQr(b)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-nets-navy py-2.5 text-sm font-bold text-white active:opacity-80">
                          <QrCode className="h-4 w-4" /> Settle Now
                        </button>
                      </div>
                    )}

                    {/* Show "Awaiting payment" when Thanis is the creditor */}
                    {b.toId === "thanis" && !isSettled && !isNrAccepted && !isWaiting && (
                      <div className="mt-3 flex gap-2">
                        {b.amount <= NEXT_ROUND_THRESHOLD && (
                          <button onClick={() => openNrRequest(b)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-700 active:opacity-80">
                            <ArrowRight className="h-4 w-4" /> Next Round
                          </button>
                        )}
                        <span className="flex flex-1 items-center justify-center text-sm font-semibold text-muted-foreground py-2.5">
                          Awaiting payment
                        </span>
                      </div>
                    )}

                    {/* Q&A only: future settlement demo — subtle, outside default path */}
                    {b.fromId === "thanis" && (b.status === "pending" || b.status === "outstanding") && (
                      <button onClick={() => openFutureSettle(b)}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 py-1 text-[10px] font-semibold text-muted-foreground/50 active:opacity-70">
                        <Info className="h-2.5 w-2.5" /> Q&A: Future seamless settlement demo
                      </button>
                    )}

                    {/* Demo: simulate creditor response for NR-waiting */}
                    {b.fromId === "thanis" && isNrWaiting && (
                      <button onClick={() => { setActiveBalanceId(b.id); setScreen("nr-recipient") }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-600 active:opacity-70">
                        <Smartphone className="h-3 w-3" /> Demo: View as {b.toName} (respond)
                      </button>
                    )}

                    {/* Recipient demo trigger for PayNow-waiting balances */}
                    {b.fromId === "thanis" && isWaiting && (
                      <button onClick={() => { setActiveBalanceId(b.id); setRecipientView(true); setScreen("settle-waiting") }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white py-2 text-xs font-semibold text-blue-600 active:opacity-70">
                        <Smartphone className="h-3 w-3" /> Demo: View as {b.toName} (confirm)
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Settle Now always reachable note */}
            {waitingCount > 0 && (
              <p className="mt-4 text-center text-xs text-muted-foreground px-2">
                Settle Now is still available for all pending balances.
              </p>
            )}
          </div>

          {allResolved && (
            <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card px-5 pb-8 pt-3">
              <button onClick={onDone}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-green py-4 text-base font-bold text-white shadow-lg active:opacity-80">
                <Check className="h-5 w-5" /> Circle Closed
              </button>
            </div>
          )}
        </>
      )}

      {/* ── SETTLE: PAY NOW QR ── */}
      {screen === "settle-qr" && active && (
        <>
          <div className="bg-white">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setScreen("home")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <div>
                <p className="font-bold text-nets-navy">Pay {active.toName}</p>
                <p className="text-xs text-muted-foreground">{active.fromName} → {active.toName}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-4">
            <div className="mb-5 flex flex-col items-center text-center">
              <p className="mb-1 text-3xl font-extrabold text-nets-navy">S${fmt(active.amount)}</p>
              <p className="text-sm text-muted-foreground">to {active.toName}</p>
            </div>

            <div className="mb-5 flex flex-col items-center gap-4">
              <PayNowQr name={active.toName} />
              <button onClick={() => downloadPayNowQr(active.toName, active.amount)}
                className="flex items-center gap-2 rounded-xl border border-nets-navy/20 bg-nets-navy/5 px-4 py-2 text-sm font-semibold text-nets-navy active:opacity-70">
                <Download className="h-4 w-4" /> Download QR
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-nets-navy/5 p-4 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-3">How to pay</p>
              {[
                "Open your banking app",
                `Scan or upload this PayNow QR`,
                `Pay S$${fmt(active.amount)}`,
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nets-navy text-xs font-bold text-white">{i + 1}</span>
                  <p className="text-sm text-nets-navy">{step}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs text-amber-700">Circle facilitates the split — the actual transfer happens in your banking app. Circle cannot verify the payment automatically.</p>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 border-t border-border bg-white px-5 pb-8 pt-3">
            <button onClick={senderSentPayment}
              className="w-full rounded-2xl bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Payment Sent
            </button>
          </div>
        </>
      )}

      {/* ── SETTLE: WAITING FOR RECIPIENT ── */}
      {screen === "settle-waiting" && active && !recipientView && (
        <>
          <div className="bg-nets-page">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setScreen("home")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <p className="font-bold text-nets-navy">Waiting for {active.toName}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-10 w-10 text-blue-500" />
              </div>
              <h2 className="text-xl font-extrabold text-nets-navy">Waiting for {active.toName} to confirm</h2>
              <p className="mt-2 text-sm text-muted-foreground">You said you sent S${fmt(active.amount)} via PayNow.</p>
              <p className="mt-1 text-sm text-muted-foreground">{active.toName} will confirm when it arrives.</p>
            </div>

            <div className="rounded-2xl bg-card p-4 shadow-sm mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">From</span>
                <span className="font-semibold text-nets-navy">{active.fromName}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">To</span>
                <span className="font-semibold text-nets-navy">{active.toName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-nets-navy">S${fmt(active.amount)}</span>
              </div>
            </div>

            <button onClick={() => setScreen("settle-qr")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-nets-navy/20 bg-card py-3 text-sm font-semibold text-nets-navy shadow-sm active:opacity-70">
              <QrCode className="h-4 w-4" /> Show QR again
            </button>

            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-blue-700 mb-2">Demo: Simulate recipient side</p>
              <button onClick={() => setRecipientView(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white active:opacity-80">
                <Smartphone className="h-3.5 w-3.5" /> Switch to Thanis' view
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SETTLE: RECIPIENT VIEW ── */}
      {screen === "settle-waiting" && active && recipientView && (
        <>
          <div className="bg-nets-navy text-white">
            <StatusBar dark />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">Thanis' view</span>
              </div>
              <button onClick={() => setRecipientView(false)} className="ml-auto text-xs text-white/60 underline">Back to sender</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6">
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="rounded-3xl bg-card p-5 shadow-sm mb-4">
              <div className="mb-1 flex items-center gap-2">
                <Bell className="h-4 w-4 text-nets-navy" />
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Payment claim</p>
              </div>
              <p className="mt-2 text-base font-bold text-nets-navy">
                {active.fromName} says they sent you S${fmt(active.amount)}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Have you received this in your banking app?</p>
            </motion.div>

            <div className="space-y-3">
              <button onClick={recipientConfirm}
                className="flex w-full items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 px-4 py-4 active:opacity-70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nets-green text-white">
                  <Check className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-nets-navy">Received ✓</p>
                  <p className="text-xs text-muted-foreground">I got S${fmt(active.amount)} in my banking app</p>
                </div>
              </button>

              <button onClick={recipientReject}
                className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border px-4 py-4 active:opacity-70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nets-red/10">
                  <X className="h-5 w-5 text-nets-red" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-nets-navy">Not Yet</p>
                  <p className="text-xs text-muted-foreground">Haven't received it — balance stays open</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SETTLE: DONE (recipient confirmed) ── */}
      {screen === "settle-done" && active && (
        <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-nets-green shadow-xl">
            <Check className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-nets-navy">SETTLED ✓</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {active.toName} confirmed receipt of S${fmt(active.amount)} from {active.fromName}.
          </p>
          <div className="mt-4 w-full max-w-xs rounded-2xl bg-nets-green/10 border border-nets-green/20 p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">From</span>
              <span className="font-semibold text-nets-navy">{active.fromName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-nets-green">S${fmt(active.amount)}</span>
            </div>
          </div>
          <button onClick={() => { setScreen("home"); setActiveBalanceId(null) }}
            className="mt-6 w-full max-w-xs rounded-2xl bg-nets-navy py-3.5 text-sm font-bold text-white active:opacity-80">
            Back to Circle Close
          </button>
        </div>
      )}

      {/* ── SETTLE: REJECTED (not yet) ── */}
      {screen === "settle-rejected" && active && (
        <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-nets-red/10">
            <X className="h-10 w-10 text-nets-red" />
          </div>
          <h2 className="text-xl font-extrabold text-nets-navy">Not confirmed yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {active.toName} hasn't received the transfer. The balance remains open.
          </p>
          <p className="mt-3 text-xs text-muted-foreground px-4">
            Check your banking app that the payment went through, then try again.
          </p>
          <div className="mt-5 w-full max-w-xs space-y-2">
            <button onClick={() => { setActiveBalanceId(active.id); setRecipientView(false); setScreen("settle-qr") }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-3.5 text-sm font-bold text-white active:opacity-80">
              <QrCode className="h-4 w-4" /> Try Again — Settle Now
            </button>
            <button onClick={() => { setScreen("home"); setActiveBalanceId(null) }}
              className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground active:opacity-70">
              Back to Circle Close
            </button>
          </div>
        </div>
      )}

      {/* ── NEXT ROUND: REQUEST ── creditor (Thanis) proposes to debtor */}
      {screen === "nr-request" && active && (
        <>
          <div className="bg-nets-page">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setScreen("home")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <p className="font-bold text-nets-navy">Next Round</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <ArrowRight className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-extrabold text-nets-navy">Propose Next Round to {active.fromName}?</h2>
              <p className="mt-2 text-sm text-muted-foreground px-4">
                Instead of transferring S${fmt(active.amount)} now, {active.fromName} will cover S${fmt(active.amount)} of your share on a future Circle outing.
              </p>
              <p className="mt-2 text-xs font-semibold text-amber-600">Nothing is transferred today.</p>
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-border">
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Who covers</span>
                <span className="text-sm font-semibold text-nets-navy">{active.fromName}</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Covers for</span>
                <span className="text-sm font-semibold text-nets-navy">You (Thanis)</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-bold text-amber-600">S${fmt(active.amount)}</span>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-700 mb-1">How it works</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                When you and {active.fromName} are on a future Circle together, S${fmt(active.amount)} will be deducted from your share — and added to {active.fromName}'s. No chasing, no awkwardness.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Settle Now is always available — even after sending this request, until {active.fromName} accepts.</p>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card px-5 pb-8 pt-3 space-y-2">
            <button onClick={sendNrRequest}
              className="w-full rounded-2xl bg-amber-500 py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Send Next Round Request
            </button>
            <button onClick={() => openSettleQr(active)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-nets-navy/20 bg-card py-3.5 text-sm font-bold text-nets-navy active:opacity-70">
              <QrCode className="h-4 w-4" /> Settle Now instead
            </button>
          </div>
        </>
      )}

      {/* ── NEXT ROUND: WAITING ── request sent, waiting for debtor */}
      {screen === "nr-waiting" && active && (
        <>
          <div className="bg-nets-page">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setScreen("home")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <p className="font-bold text-nets-navy">Waiting for {active.fromName}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
              <h2 className="text-xl font-extrabold text-nets-navy">Next Round request sent</h2>
              <p className="mt-2 text-sm text-muted-foreground px-2">
                {active.fromName} needs to accept before this is confirmed. Only then will it apply on your next shared Circle.
              </p>
            </div>

            <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Request to</span>
                <span className="font-semibold text-nets-navy">{active.fromName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-amber-600">S${fmt(active.amount)}</span>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">You can still cancel and Settle Now any time before {active.fromName} accepts.</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-700 mb-2">Demo: Simulate {active.fromName}'s response</p>
              <button onClick={() => setScreen("nr-recipient")}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-white active:opacity-80">
                <Smartphone className="h-3.5 w-3.5" /> Switch to {active.fromName}'s view
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card px-5 pb-8 pt-3">
            <button onClick={() => { if (active) openSettleQr(active) }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-nets-navy/20 bg-card py-3.5 text-sm font-bold text-nets-navy active:opacity-70">
              <QrCode className="h-4 w-4" /> Cancel & Settle Now instead
            </button>
          </div>
        </>
      )}

      {/* ── NEXT ROUND: RECIPIENT VIEW ── demo: Krishna decides */}
      {screen === "nr-recipient" && active && (
        <>
          <div className="bg-amber-500 text-white">
            <StatusBar dark />
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{active.fromName}'s view</span>
              </div>
              <button onClick={() => setScreen("nr-waiting")} className="text-xs text-white/70 underline">Back to sender</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6">
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="mb-5 rounded-3xl bg-card p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <Bell className="h-4 w-4 text-nets-navy" />
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Next Round request</p>
              </div>
              <p className="mt-3 text-base font-bold text-nets-navy">
                Thanis wants to carry S${fmt(active.amount)} into your Next Round.
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                On a future Circle together, you'll cover S${fmt(active.amount)} of Thanis' share. Nothing is transferred today.
              </p>
              <div className="mt-3 rounded-xl bg-nets-navy/5 p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">You'll cover</span>
                  <span className="font-bold text-nets-navy">S${fmt(active.amount)} of Thanis' share</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">On which Circle?</span>
                  <span className="font-semibold text-muted-foreground">Any future shared Circle</span>
                </div>
              </div>
            </motion.div>

            <div className="space-y-3">
              <button onClick={nrAccept}
                className="flex w-full items-center gap-3 rounded-2xl bg-nets-green/10 border border-nets-green/30 px-4 py-4 active:opacity-70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nets-green text-white">
                  <Check className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-nets-navy">Accept</p>
                  <p className="text-xs text-muted-foreground">I'll cover S${fmt(active.amount)} of Thanis' share next time</p>
                </div>
              </button>

              <button onClick={nrDeclineToSettle}
                className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border px-4 py-4 active:opacity-70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nets-navy/10">
                  <QrCode className="h-5 w-5 text-nets-navy" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-nets-navy">Settle Now Instead</p>
                  <p className="text-xs text-muted-foreground">Prefer to transfer S${fmt(active.amount)} via PayNow now</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── FUTURE SETTLEMENT: OUTSTANDING ── Q&A only */}
      {screen === "future-settle" && active && (
        <>
          <div className="bg-nets-page">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setScreen("home")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <div className="flex items-center gap-2">
                <p className="font-bold text-nets-navy">Outstanding Balance</p>
                <span className="rounded-full bg-nets-blue/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-nets-blue">Future</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6">
            <div className="mb-3 rounded-xl border border-nets-blue/20 bg-nets-blue/5 px-4 py-3">
              <p className="text-xs font-bold text-nets-blue mb-1">Q&A Demo Only — Not available in MVP</p>
              <p className="text-xs text-nets-blue/80">This demonstrates a proposed future experience where a participating financial institution integration returns payment confirmation automatically, allowing Circle to close the balance immediately.</p>
            </div>

            <div className="mb-5 overflow-hidden rounded-3xl bg-nets-navy text-white">
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-xs text-white/60 mb-1">Outstanding balance</p>
                <p className="text-3xl font-extrabold">S${fmt(active.amount)}</p>
                <p className="text-sm text-white/70 mt-0.5">to {active.toName}</p>
              </div>
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-white/60">From</span>
                <span className="font-semibold">{active.fromName}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card px-4 py-3 mb-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Requires participating financial institution integration. In real implementation, the exact confirmation data and timing must be validated with the participating bank.
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card px-5 pb-8 pt-3 space-y-2">
            <button onClick={() => setScreen("future-auth")}
              className="w-full rounded-2xl bg-nets-navy py-4 text-base font-bold text-white shadow-lg active:opacity-80">
              Settle S${fmt(active.amount)}
            </button>
            <button onClick={() => setScreen("home")}
              className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground active:opacity-70">
              Back — use MVP PayNow flow instead
            </button>
          </div>
        </>
      )}

      {/* ── FUTURE SETTLEMENT: BANK AUTH ── Q&A only */}
      {screen === "future-auth" && active && (
        <>
          <div className="bg-white border-b border-border">
            <StatusBar />
            <div className="flex items-center gap-3 px-5 pb-3 pt-1">
              <button onClick={() => setScreen("future-settle")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 active:opacity-70">
                <ChevronLeft className="h-5 w-5 text-nets-navy" />
              </button>
              <div>
                <p className="font-bold text-nets-navy">Authorise Payment</p>
                <p className="text-[10px] text-muted-foreground">FUTURE · Participating institution handoff</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-5 pb-32 pt-8">
            {/* Mock bank UI shell */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-nets-navy/10">
                <Wallet className="h-8 w-8 text-nets-navy" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Participating Bank — prototype authorisation</p>
              <p className="text-sm font-bold text-nets-navy">Pay {active.toName}</p>
              <p className="mt-2 text-4xl font-extrabold text-nets-navy">S${fmt(active.amount)}</p>
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-border">
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm font-semibold text-nets-navy">{active.toName}</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-bold text-nets-navy">S${fmt(active.amount)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Reference</span>
                <span className="text-sm font-semibold text-nets-navy">NETS Circle · {circle.name}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">From account</span>
                <span className="text-sm font-semibold text-nets-navy">DBS •••• 4421</span>
              </div>
            </div>

            <div className="rounded-xl border border-nets-blue/20 bg-nets-blue/5 px-4 py-3 mb-4">
              <p className="text-[10px] font-bold text-nets-blue mb-0.5">Prototype simulation</p>
              <p className="text-xs text-nets-blue/80">In the real future flow, the bank would return a payment confirmation event to NETS Circle, automatically closing the balance — no sender confirmation tap needed.</p>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card px-5 pb-8 pt-3">
            <button onClick={() => {
              setBalances((prev) => prev.map((b) => b.id === activeBalanceId ? { ...b, status: "settled" } : b))
              setScreen("future-done")
            }}
              className="w-full rounded-2xl bg-nets-navy py-5 text-xl font-extrabold text-white shadow-lg active:opacity-80">
              Approve
            </button>
          </div>
        </>
      )}

      {/* ── FUTURE SETTLEMENT: DONE ── Q&A only */}
      {screen === "future-done" && active && (
        <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-nets-green shadow-xl">
            <Check className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-nets-navy">Payment Successful</h2>
          <p className="mt-2 text-sm text-muted-foreground">S${fmt(active.amount)} to {active.toName}</p>

          <div className="mt-5 w-full max-w-xs overflow-hidden rounded-2xl border border-nets-green/20 bg-nets-green/10">
            <div className="flex items-center justify-center gap-2 py-4">
              <Check className="h-5 w-5 text-nets-green" />
              <span className="text-base font-extrabold text-nets-green">SETTLED ✓</span>
            </div>
            <div className="border-t border-nets-green/20 px-4 py-3">
              <p className="text-xs text-muted-foreground text-center">Balance confirmed via participating institution integration. Circle closed automatically — no recipient tap needed.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-nets-blue/20 bg-nets-blue/5 px-4 py-2.5 w-full max-w-xs">
            <p className="text-[10px] font-bold text-nets-blue">Future · Q&A demo only</p>
            <p className="text-[10px] text-nets-blue/80 mt-0.5">This automatic confirmation requires a participating financial institution integration that does not exist in the current MVP.</p>
          </div>

          <button onClick={() => { setScreen("home"); setActiveBalanceId(null) }}
            className="mt-5 w-full max-w-xs rounded-2xl bg-nets-navy py-3.5 text-sm font-bold text-white active:opacity-80">
            Back to Circle Close
          </button>
        </div>
      )}

      {/* ── NEXT ROUND: CONFIRMED ── */}
      {screen === "nr-confirmed" && active && (
        <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-amber-400 shadow-xl">
            <ArrowRight className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-nets-navy">NEXT ROUND CONFIRMED ✓</h2>
          <p className="mt-3 text-base font-bold text-amber-600">"{active.fromName} has your next S${fmt(active.amount)} covered."</p>
          <p className="mt-2 text-sm text-muted-foreground px-4">
            When you and {active.fromName} are on a future Circle together, S${fmt(active.amount)} will be applied to your share automatically.
          </p>
          <div className="mt-5 w-full max-w-xs rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">From</span>
              <span className="font-semibold text-nets-navy">{active.fromName}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">For</span>
              <span className="font-semibold text-nets-navy">You (Thanis)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount committed</span>
              <span className="font-bold text-amber-600">S${fmt(active.amount)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Open Saturday Brunch to see it applied to your next outing.</p>
          <OneWeekLaterButton />
          <button onClick={() => { setScreen("home"); setActiveBalanceId(null) }}
            className="mt-3 w-full max-w-xs rounded-2xl border border-nets-navy/20 bg-transparent py-3 text-sm font-semibold text-nets-navy/70 active:opacity-70">
            Back to Circle Close
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ─── Helpers for the idea flow ────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Food: "🍽️",
  Activity: "🎯",
  Entertainment: "🎭",
  Shopping: "🛍️",
  Transport: "🚗",
  Sports: "⚽",
  Outdoors: "🌿",
  "Food & Drinks": "🍽️",
}

function ideaToActivity(idea: CircleIdea): Activity {
  return {
    id: idea.id,
    name: idea.title,
    emoji: "✨",
    category: "Group outing",
    costMin: idea.estimatedMin,
    costMax: idea.estimatedMax,
    crossBorder: false,
    spendBand: {
      min: idea.estimatedMin,
      max: idea.estimatedMax,
      source: "nets-insights",
      lastUpdated: "Just now",
      confidenceLevel: idea.reviewScore >= 4.2 ? "high" : "moderate",
    },
    netsMerchantScore: idea.netsMerchantScore,
    merchantCount: Math.max(1, Math.round(idea.reviewCount / 120)),
    confidence: Math.round((idea.reviewScore / 5) * 100),
    tags: [],
    description: idea.description ?? idea.title,
  }
}

const MOCK_ENRICHMENT: Record<string, Omit<CircleIdea, "id" | "submittedById" | "votes">> = {
  "korean bbq": {
    title: "Korean BBQ + Arcade @ Bugis",
    description: "Seoul Table · Arcade Zone @ Bugis+",
    estimatedMin: 44, estimatedMax: 48,
    reviewScore: 4.4, reviewCount: 1580,
    isCircleReady: true, circleReadyDiscount: 10, netsMerchantScore: 90,
    circleScore: 87, spendFitPct: 78, groupPrefPct: 95, practicalFitPct: 88,
    preseededStatus: "circle-ready",
    itinerary: {
      ideaId: "idea-thanis",
      title: "Bugis Night Out",
      stops: [
        {
          id: "s1", order: 1, type: "dining",
          merchantName: "Seoul Table",
          address: "Bugis+, #04-12, 201 Victoria St",
          estimatedCost: { min: 22, max: 28 },
          duration: "~1.5 hrs", time: "6:30 PM",
          isCircleReady: true,
        },
        {
          id: "s2", order: 2, type: "activity",
          merchantName: "Arcade Zone @ Bugis+",
          address: "Bugis+, Level 3, 201 Victoria St",
          estimatedCost: { min: 18, max: 18 },
          duration: "~45 min", time: "8:00 PM",
          isCircleReady: true,
        },
      ],
      totalEstimated: { min: 40, max: 46 },
    },
  },
  "hot pot": {
    title: "Hot Pot + Movie @ Bugis",
    description: "Haidilao Hot Pot · Cathay Cineplexes, Bugis+",
    estimatedMin: 46, estimatedMax: 50,
    reviewScore: 4.3, reviewCount: 2103,
    isCircleReady: true, circleReadyDiscount: 8, netsMerchantScore: 88,
    circleScore: 81, spendFitPct: 92, groupPrefPct: 78, practicalFitPct: 80,
    preseededStatus: "circle-ready",
    itinerary: {
      ideaId: "idea-bryan",
      title: "Hot Pot Night",
      stops: [
        {
          id: "s1", order: 1, type: "dining",
          merchantName: "Haidilao Hot Pot",
          address: "Bugis+, #04-08, 201 Victoria St",
          estimatedCost: { min: 32, max: 36 },
          duration: "~1.5 hrs", time: "6:30 PM",
          isCircleReady: true,
        },
        {
          id: "s2", order: 2, type: "activity",
          merchantName: "Cathay Cineplexes",
          address: "Bugis+, #06-01, 201 Victoria St",
          estimatedCost: { min: 14, max: 14 },
          duration: "~2 hrs", time: "8:30 PM",
          isCircleReady: false,
        },
      ],
      totalEstimated: { min: 46, max: 50 },
    },
  },
  japanese: {
    title: "Japanese Dinner + Karaoke @ Bugis",
    description: "Sushi Tei · Party World KTV, Bugis Junction",
    estimatedMin: 49, estimatedMax: 54,
    reviewScore: 4.2, reviewCount: 890,
    isCircleReady: false, netsMerchantScore: 82,
    circleScore: 72, spendFitPct: 68, groupPrefPct: 85, practicalFitPct: 65,
    preseededStatus: "adjust-plan",
    groupOffer: {
      id: "offer-j1",
      merchantName: "Sushi Tei × Party World KTV",
      offerTitle: "Circle-Ready Set Menu",
      description: "Pre-booked group set dinner at Sushi Tei + 1-hour KTV room at Party World. Includes the full dinner and karaoke — nothing removed from the plan.",
      originalMin: 49, originalMax: 54,
      offerMin: 45, offerMax: 48,
      minPeople: 4,
      validDuring: "Tonight, from 6:30 PM",
      revisedItinerary: {
        ideaId: "idea-krishna",
        title: "Japanese Night Out (with Circle-Ready Offer)",
        stops: [
          {
            id: "s1", order: 1, type: "dining",
            merchantName: "Sushi Tei",
            address: "Bugis Junction, #02-03, 200 Victoria St",
            estimatedCost: { min: 26, max: 28 },
            duration: "~1.5 hrs", time: "6:30 PM",
            isCircleReady: true,
          },
          {
            id: "s2", order: 2, type: "activity",
            merchantName: "Party World KTV",
            address: "Bugis Junction, B1-03, 200 Victoria St",
            estimatedCost: { min: 19, max: 20 },
            duration: "~1 hr", time: "8:15 PM",
            isCircleReady: true,
          },
        ],
        totalEstimated: { min: 45, max: 48 },
      },
    } satisfies GroupOffer,
  },
  western: {
    title: "Western Dinner + Escape Room @ Bugis",
    description: "Astons Specialities · Lost SG, Bugis+",
    estimatedMin: 58, estimatedMax: 64,
    reviewScore: 4.1, reviewCount: 650,
    isCircleReady: false, netsMerchantScore: 75,
    circleScore: 55, spendFitPct: 42, groupPrefPct: 60, practicalFitPct: 72,
    preseededStatus: "not-aligned",
  },
}

function fuzzyEnrich(title: string): Omit<CircleIdea, "id" | "submittedById" | "votes"> {
  const t = title.toLowerCase()
  const key = Object.keys(MOCK_ENRICHMENT).find((k) => t.includes(k))
  if (key) return MOCK_ENRICHMENT[key]
  return {
    title, description: title,
    estimatedMin: 30, estimatedMax: 50,
    reviewScore: 3.9, reviewCount: 80,
    isCircleReady: false, netsMerchantScore: 75,
    circleScore: 60, spendFitPct: 70, groupPrefPct: 60, practicalFitPct: 55,
  }
}

// Mock members contribute ideas [1,2,3] — index 0 ("Korean BBQ + Arcade") is reserved for the user suggestion
const MOCK_MEMBER_IDEA_TITLES = [
  "Korean BBQ + Arcade @ Bugis",
  "Hot Pot + Movie @ Bugis",
  "Japanese Dinner + Karaoke @ Bugis",
  "Western Dinner + Escape Room @ Bugis",
]

function buildMockMemberIdeas(members: Circle["members"]): CircleIdea[] {
  return members
    .filter((m) => m.id !== "thanis")
    .map((m, i) => ({
      id: `idea-${m.id}`,
      submittedById: m.id,
      votes: [],
      // Start from index 1 — index 0 is reserved for the user's suggestion
      ...fuzzyEnrich(MOCK_MEMBER_IDEA_TITLES[(i + 1) % MOCK_MEMBER_IDEA_TITLES.length]),
    }))
}

function computeIdeaScore(
  idea: CircleIdea,
  memberSpendBands: Array<{ min: number; max: number }>
): { aiScore: number; budgetFitPct: number; popularityScore: number; qualityScore: number } {
  // Spend fit: member's band overlaps with the idea's cost range
  const inFit = memberSpendBands.filter(
    (b) => b.max >= idea.estimatedMin * 0.9 && b.min <= idea.estimatedMax * 1.1
  ).length
  const budgetFitPct = memberSpendBands.length > 0
    ? Math.round((inFit / memberSpendBands.length) * 100) : 60

  const avgVote = idea.votes.length > 0
    ? idea.votes.reduce((s, v) => s + v.score, 0) / idea.votes.length : 2
  const popularityScore = Math.round(((avgVote - 1) / 2) * 100)
  const qualityScore = Math.round(((idea.reviewScore - 1) / 4) * 100)
  const netsBonus = idea.isCircleReady ? 12 : 0

  const aiScore = Math.min(99, Math.round(
    budgetFitPct * 0.35 +
    popularityScore * 0.30 +
    qualityScore * 0.20 +
    idea.netsMerchantScore * 0.15 +
    netsBonus
  ))

  return { aiScore, budgetFitPct, popularityScore, qualityScore }
}

// ─── IdeaSubmissionView ───────────────────────────────────────────────────────

function IdeaSubmissionView({
  circle,
  onBack,
  onDone,
}: {
  circle: Circle
  onBack: () => void
  onDone: (ideas: CircleIdea[]) => void
}) {
  const { enabled: demoEnabled } = useDemoContext()
  const [myTitle, setMyTitle] = useState(() => demoEnabled ? MOCK_MEMBER_IDEA_TITLES[0] : "")
  const [submitted, setSubmitted] = useState(false)
  const [arrivedCount, setArrivedCount] = useState(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const mockMemberIdeas = useMemo(() => buildMockMemberIdeas(circle.members), [circle.members])
  const allArrived = arrivedCount >= mockMemberIdeas.length

  useEffect(() => {
    if (!submitted) return
    timersRef.current = mockMemberIdeas.map((_, i) =>
      setTimeout(() => setArrivedCount(i + 1), 400 + i * 400)
    )
    return () => { timersRef.current.forEach(clearTimeout) }
  }, [submitted, mockMemberIdeas])

  // Auto-advance when all members have submitted — no tap needed
  useEffect(() => {
    if (!allArrived) return
    const t = setTimeout(() => handleProceed(), 700)
    return () => clearTimeout(t)
  }, [allArrived]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    if (!myTitle.trim()) return
    setSubmitted(true)
  }

  function handleProceed() {
    const myIdea: CircleIdea = {
      id: "idea-thanis",
      submittedById: "thanis",
      votes: [],
      ...fuzzyEnrich(myTitle),
      title: myTitle.trim(),
    }
    onDone([myIdea, ...mockMemberIdeas.slice(0, arrivedCount)])
  }

  const otherMembers = circle.members.filter((m) => m.id !== "thanis")

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
      className="flex h-full flex-col bg-nets-page">
      <StatusBar />
      <Header title="Everyone brings one idea" onBack={onBack} subtitle="Add one plan you'd genuinely be happy to do." />
      <JourneySteps active={1} />

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-3 space-y-4">
        {/* Planning context pill */}
        <div className="flex items-center gap-2 rounded-2xl bg-nets-navy/5 border border-nets-navy/10 px-4 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-nets-navy" />
          <p className="text-xs font-bold text-nets-navy">{circle.name}</p>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-nets-blue/10 border border-nets-blue/20 px-4 py-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-nets-blue" />
          <p className="text-xs text-nets-blue leading-relaxed">
            Your idea is <strong>private</strong> until everyone submits. No anchoring bias — everyone thinks independently.
          </p>
        </div>

        {!submitted ? (
          <>
            <div className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
              <p className="text-sm font-bold text-nets-navy">What&apos;s your complete plan?</p>
              <p className="text-xs text-muted-foreground -mt-2">Include dinner and activity — e.g. &ldquo;Korean BBQ + Arcade @ Bugis&rdquo;</p>

              <input
                value={myTitle}
                onChange={(e) => setMyTitle(e.target.value)}
                placeholder="e.g. Korean BBQ + Arcade @ Bugis"
                className="w-full rounded-2xl border border-border bg-nets-page px-4 py-3 text-sm font-semibold text-nets-navy placeholder:text-muted-foreground/60 focus:border-nets-red focus:outline-none"
                maxLength={80}
              />

              <button
                onClick={() => setMyTitle(MOCK_MEMBER_IDEA_TITLES[0])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-nets-navy/20 bg-nets-navy/5 py-2.5 text-xs font-bold text-nets-navy active:opacity-70"
              >
                <Sparkles className="h-3.5 w-3.5" /> Suggest one for me
              </button>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Waiting for ideas from</p>
              <div className="space-y-2.5">
                {otherMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                      style={{ backgroundColor: m.color }}>
                      {m.initial}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-nets-navy">{m.name}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Thinking…</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-3xl bg-nets-navy p-5 text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wide">Your idea</span>
                <span className="flex items-center gap-1 rounded-full bg-nets-green/20 px-2 py-0.5 text-xs font-bold text-nets-green">
                  <Check className="h-3 w-3" /> Submitted
                </span>
              </div>
              <p className="text-lg font-extrabold">{myTitle}</p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Ideas coming in… ({arrivedCount}/{mockMemberIdeas.length})
              </p>
              <div className="space-y-2.5">
                {mockMemberIdeas.map((idea, i) => {
                  const member = circle.members.find((m) => m.id === idea.submittedById)
                  const arrived = i < arrivedCount
                  return (
                    <motion.div key={idea.id}
                      initial={arrived ? { opacity: 0, y: 8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                        style={{ backgroundColor: member?.color ?? "var(--nets-navy)" }}>
                        {member?.initial ?? "?"}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-nets-navy">{member?.name}</span>
                      {arrived ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          <Check className="h-3 w-3" /> In
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Thinking…</span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-white/90 px-5 pb-8 pt-3 backdrop-blur-sm border-t border-border">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!myTitle.trim()}
            className="w-full rounded-2xl bg-nets-red py-4 text-sm font-extrabold text-white disabled:opacity-40 active:opacity-80">
            Submit My Idea
          </button>
        ) : (
          <button
            onClick={handleProceed}
            disabled={!allArrived}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-navy py-4 text-sm font-extrabold text-white disabled:opacity-40 active:opacity-80">
            {allArrived ? (
              <><ArrowRight className="h-4 w-4" /> All {mockMemberIdeas.length + 1} ideas in — Continue</>
            ) : (
              <><Zap className="h-4 w-4 animate-pulse" /> Waiting for others…</>
            )}
          </button>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">Ideas are revealed to everyone only after all members submit</p>
      </div>
    </motion.div>
  )
}

// ─── IdeaVotingView (Ranking interface) ──────────────────────────────────────

function IdeaVotingView({
  ideas,
  myMemberId,
  onBack,
  onDone,
}: {
  ideas: CircleIdea[]
  myMemberId: string
  onBack: () => void
  onDone: (rankedIdeas: CircleIdea[]) => void
}) {
  // rankings: array of ideaIds in the user's preferred order (index 0 = top pick)
  const [rankings, setRankings] = useState<string[]>([])

  const allRanked = rankings.length === ideas.length

  function tap(ideaId: string) {
    setRankings((r) => {
      if (r.includes(ideaId)) return r.filter((x) => x !== ideaId)
      return [...r, ideaId]
    })
  }

  function moveUp(ideaId: string) {
    setRankings((r) => {
      const i = r.indexOf(ideaId)
      if (i <= 0) return r
      const next = [...r]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  function moveDown(ideaId: string) {
    setRankings((r) => {
      const i = r.indexOf(ideaId)
      if (i < 0 || i >= r.length - 1) return r
      const next = [...r]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
  }

  function handleSubmit() {
    const MEMBER_VOTE_POOLS: IdeaVoteScore[][] = [
      [3, 3, 2, 1], // sim-1: loves first idea
      [2, 3, 3, 2], // sim-2: mixed
      [3, 2, 1, 3], // sim-3: mixed
    ]
    const ranked = ideas.map((idea, ideaIdx) => ({
      ...idea,
      votes: [
        // User's rank: first pick → score 3, last → score 1
        {
          memberId: myMemberId,
          score: Math.max(1, 3 - Math.floor((rankings.indexOf(idea.id) / Math.max(1, ideas.length - 1)) * 2)) as IdeaVoteScore,
        },
        ...MEMBER_VOTE_POOLS.map((pool, pi) => ({
          memberId: `sim-${pi + 1}`,
          score: (pool[ideaIdx % pool.length] ?? 2) as IdeaVoteScore,
        })),
      ],
    }))
    onDone(ranked)
  }

  // Unranked ideas (not yet tapped), in original order
  const unranked = ideas.filter((idea) => !rankings.includes(idea.id))

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
      className="flex h-full flex-col bg-nets-page">
      <StatusBar />
      <Header title="Rank the plans" onBack={onBack} subtitle="Tap to rank from favourite to least favourite" />
      <JourneySteps active={1} />

      {/* Quick-rank shortcut: places all ideas in index order in one tap */}
      {rankings.length === 0 && (
        <div className="px-5 pb-2">
          <button
            onClick={() => setRankings(ideas.map((i) => i.id))}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-nets-navy/20 bg-nets-navy/5 py-2.5 text-xs font-bold text-nets-navy active:opacity-70"
          >
            <Sparkles className="h-3.5 w-3.5" /> Quick-rank by Circle Engine preview
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-3 space-y-4">
        {/* Ranked so far */}
        {rankings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your ranking</p>
            {rankings.map((ideaId, rank) => {
              const idea = ideas.find((x) => x.id === ideaId)
              if (!idea) return null
              const isMyIdea = idea.submittedById === myMemberId
              const rankColors = ["bg-nets-red text-white", "bg-nets-navy text-white", "bg-nets-blue text-white", "bg-muted text-nets-navy"]
              return (
                <motion.div
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-sm"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${rankColors[rank] ?? "bg-muted text-nets-navy"}`}>
                    #{rank + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-nets-navy">{idea.title}</p>
                    <p className="text-xs text-muted-foreground">${idea.estimatedMin}–${idea.estimatedMax} /person</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMyIdea && (
                      <span className="mr-1 rounded-full bg-nets-red/10 px-2 py-0.5 text-[10px] font-bold text-nets-red">You</span>
                    )}
                    <button onClick={() => moveUp(ideaId)} disabled={rank === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-nets-page text-nets-navy disabled:opacity-30 active:opacity-70">
                      <ChevronLeft className="h-4 w-4 -rotate-90" />
                    </button>
                    <button onClick={() => moveDown(ideaId)} disabled={rank === rankings.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-nets-page text-nets-navy disabled:opacity-30 active:opacity-70">
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </button>
                    <button onClick={() => tap(ideaId)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-nets-page text-nets-navy active:opacity-70">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Unranked ideas — tap to add */}
        {unranked.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {rankings.length === 0 ? "Tap to rank each plan" : "Still to rank"}
            </p>
            {unranked.map((idea) => {
              const isMyIdea = idea.submittedById === myMemberId
              return (
                <motion.button
                  key={idea.id}
                  layout
                  onClick={() => tap(idea.id)}
                  className="flex w-full items-center gap-3 rounded-3xl bg-white p-3.5 shadow-sm text-left active:opacity-80"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-border text-sm font-extrabold text-muted-foreground">
                    ?
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-nets-navy">{idea.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>${idea.estimatedMin}–${idea.estimatedMax}/person</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {idea.reviewScore.toFixed(1)}
                      </span>
                      {idea.isCircleReady && (
                        <span className="rounded-full bg-nets-green/10 px-1.5 py-0.5 text-[10px] font-bold text-nets-green">Circle-Ready</span>
                      )}
                    </div>
                  </div>
                  {isMyIdea && (
                    <span className="shrink-0 rounded-full bg-nets-red/10 px-2 py-0.5 text-[10px] font-bold text-nets-red">You</span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}

        {allRanked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-2xl bg-nets-green/10 border border-nets-green/20 px-4 py-3"
          >
            <Check className="h-4 w-4 text-nets-green shrink-0" />
            <p className="text-xs font-bold text-nets-green">All {ideas.length} plans ranked — ready to see results!</p>
          </motion.div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-white/90 px-5 pb-8 pt-3 backdrop-blur-sm border-t border-border">
        <button onClick={handleSubmit} disabled={!allRanked}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-sm font-extrabold text-white disabled:opacity-40 active:opacity-80">
          <Sparkles className="h-4 w-4" />
          {allRanked ? "See Circle Engine Results" : `Rank all plans (${ideas.length - rankings.length} left)`}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Circle Engine combines your ranking with spend fit and group signals</p>
      </div>
    </motion.div>
  )
}

// ─── computePlanStatus — single source of truth for Circle Engine status ─────
// This function drives Circle Engine Results AND CircleCheckView.
// Pre-seeded status is authoritative for the original idea.
// When an offer is applied, pass the offer's prices as `overrideMax`.

function computePlanStatus(
  idea: CircleIdea,
  memberSpendBands: Array<{ min: number; max: number }>,
  overrideMax?: number
): CircleCheckOutcome {
  // If caller passes an explicit max (e.g. after applying an offer), use that
  if (overrideMax !== undefined) {
    const minMax = memberSpendBands.length > 0
      ? Math.min(...memberSpendBands.map((b) => b.max)) : 50
    return overrideMax <= minMax ? "circle-ready" : "not-aligned"
  }
  // Use pre-seeded status for demo ideas (original prices only)
  if (idea.preseededStatus) return idea.preseededStatus
  const minMaxBand = memberSpendBands.length > 0
    ? Math.min(...memberSpendBands.map((b) => b.max)) : 50
  if (idea.estimatedMax <= minMaxBand) return "circle-ready"
  if (idea.estimatedMax * 0.88 <= minMaxBand) return "adjust-plan"
  return "not-aligned"
}

// Gate: returns true only if applying this offer genuinely brings the complete plan
// within EVERY participating member's maximum Spend Band.
// Offers that don't pass this check are NEVER shown to the user.
function checkOfferFits(
  offer: GroupOffer,
  memberSpendBands: Array<{ min: number; max: number }>
): boolean {
  return memberSpendBands.every((b) => offer.offerMax <= b.max)
}

// ─── Circle Engine Results ────────────────────────────────────────────────────

function AIRankingView({
  ideas,
  mySpendBand,
  circle,
  onBack,
  onSelect,
}: {
  ideas: CircleIdea[]
  mySpendBand: { min: number; max: number }
  circle: Circle
  onBack: () => void
  onSelect: (idea: CircleIdea, status: CircleCheckOutcome) => void
}) {
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Tracks which ideas have had their group offer accepted (ideaId → true)
  const [acceptedOffers, setAcceptedOffers] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(t)
  }, [])

  const memberSpendBands = useMemo(
    () => Array.from({ length: circle.members.length }, (_, i) => ({
      min: Math.round(mySpendBand.min * (0.85 + i * 0.07)),
      max: Math.round(mySpendBand.max * (0.85 + i * 0.07)),
    })),
    [circle.members.length, mySpendBand]
  )

  const results = useMemo(() => {
    return [...ideas]
      .map((idea) => {
        const offerAccepted = !!acceptedOffers[idea.id]
        const offer = idea.groupOffer
        // Only consider offer if it has been accepted AND it mathematically fits all members
        const validOffer = offerAccepted && offer && checkOfferFits(offer, memberSpendBands)
          ? offer : null

        // Use offer prices if accepted; otherwise original prices
        const effectiveIdea: CircleIdea = validOffer
          ? { ...idea, estimatedMin: validOffer.offerMin, estimatedMax: validOffer.offerMax,
              itinerary: validOffer.revisedItinerary, isCircleReady: true }
          : idea

        const computed = computeIdeaScore(effectiveIdea, memberSpendBands)
        // Status: re-compute using offer max when accepted, otherwise use original logic
        const status = validOffer
          ? computePlanStatus(effectiveIdea, memberSpendBands, validOffer.offerMax)
          : computePlanStatus(idea, memberSpendBands)

        // Spend fit recalculates based on effective prices
        const spendFit = validOffer
          ? Math.round((memberSpendBands.filter(b => validOffer.offerMax <= b.max).length / memberSpendBands.length) * 100)
          : (idea.spendFitPct ?? computed.budgetFitPct)

        return {
          idea: effectiveIdea,
          originalIdea: idea,
          circleScore: idea.circleScore ?? computed.aiScore,
          spendFit,
          groupRanking: idea.groupPrefPct ?? computed.popularityScore,
          practicalFit: validOffer ? 92 : (idea.practicalFitPct ?? 70),
          status,
          validOffer,
          // Show offer UI only if offer exists AND passes the fit gate AND hasn't been accepted yet
          pendingOffer: !offerAccepted && offer && checkOfferFits(offer, memberSpendBands)
            ? offer : null,
        }
      })
      .sort((a, b) => b.circleScore - a.circleScore)
  }, [ideas, memberSpendBands, acceptedOffers])

  const LOADING_STEPS = [
    "Checking Spend Fit for all members…",
    "Reading your group rankings…",
    "Checking area and timing fit…",
    "Finalising Circle Engine results…",
  ]

  const statusConfig = (status: CircleCheckOutcome) => {
    if (status === "circle-ready") return {
      label: "Circle Ready",
      badgeBg: "bg-nets-green/15 text-nets-green",
      border: "ring-2 ring-nets-green",
      dot: "bg-nets-green",
    }
    if (status === "adjust-plan") return {
      label: "Adjust Plan",
      badgeBg: "bg-amber-100 text-amber-700",
      border: "ring-1 ring-amber-300",
      dot: "bg-amber-400",
    }
    return {
      label: "Not Aligned Yet",
      badgeBg: "bg-gray-100 text-gray-500",
      border: "ring-1 ring-gray-200",
      dot: "bg-gray-400",
    }
  }

  const FactorBar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        <span className="text-[11px] font-bold text-nets-navy">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-nets-page">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )

  const ItineraryTimeline = ({ itinerary }: { itinerary: NonNullable<CircleIdea["itinerary"]> }) => (
    <div className="mt-3 rounded-2xl bg-nets-navy p-4 text-white space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wide text-white/70">Agreed Itinerary</p>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80">
          S${itinerary.totalEstimated.min}–S${itinerary.totalEstimated.max}/person
        </span>
      </div>
      <div className="space-y-3">
        {itinerary.stops.map((stop, i) => (
          <div key={stop.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                stop.type === "dining" ? "bg-nets-red text-white" : "bg-nets-blue text-white"
              }`}>
                {stop.type === "dining" ? "🍽" : "🎮"}
              </span>
              {i < itinerary.stops.length - 1 && (
                <div className="my-0.5 h-4 w-0.5 bg-white/20" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                {stop.time && (
                  <span className="text-xs font-extrabold text-white">{stop.time}</span>
                )}
                <span className="text-xs font-bold text-white/90">{stop.merchantName}</span>
              </div>
              {stop.address && (
                <p className="text-[11px] text-white/50 mt-0.5">{stop.address}</p>
              )}
              <div className="mt-1 flex items-center gap-2">
                {stop.duration && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{stop.duration}</span>
                )}
                <span className="text-[11px] text-white/60">
                  S${stop.estimatedCost.min}–S${stop.estimatedCost.max}/person
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
      className="flex h-full flex-col bg-nets-page">
      <StatusBar />
      <Header title="Circle Engine Results" onBack={onBack} subtitle="Based on spend fit, your rankings &amp; practical fit" />
      <JourneySteps active={1} />

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="h-16 w-16 rounded-full border-4 border-nets-red/20 border-t-nets-red"
          />
          <div className="text-center space-y-1">
            <p className="text-base font-extrabold text-nets-navy">Circle Engine is evaluating your plans…</p>
            <p className="text-xs text-muted-foreground">Checking spend fit, group rankings &amp; practical fit</p>
          </div>
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-sm space-y-2.5">
            {LOADING_STEPS.map((s, i) => (
              <motion.div key={s} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.4 }}
                className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.4 }}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-nets-green text-white">
                  <Check className="h-2.5 w-2.5" />
                </motion.span>
                {s}
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5 pb-36 pt-3 space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-nets-green inline-block" /> Circle Ready</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Adjust Plan</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400 inline-block" /> Not Aligned Yet</span>
            </div>

            {results.map(({ idea, originalIdea, circleScore: _score, spendFit, groupRanking, practicalFit, status, validOffer, pendingOffer }, rank) => {
              const cfg = statusConfig(status)
              const isTop = rank === 0
              const isExp = expandedId === idea.id
              const canChoose = status === "circle-ready"
              // Circle Ready plans in this result set (for "switch plan" fallback)
              const circleReadyAlts = results.filter((r) => r.status === "circle-ready" && r.idea.id !== idea.id)

              return (
                <motion.div
                  key={originalIdea.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rank * 0.08 }}
                  className={`overflow-hidden rounded-3xl bg-white shadow-sm ${isTop ? cfg.border : "ring-1 ring-border"}`}
                >
                  {/* Top banner for #1 result */}
                  {isTop && (
                    <div className="flex items-center gap-2 bg-nets-red px-4 py-2">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white">Circle Engine Recommends</span>
                    </div>
                  )}
                  {/* Offer-applied banner */}
                  {validOffer && !isTop && (
                    <div className="flex items-center gap-2 bg-nets-green px-4 py-2">
                      <Check className="h-3.5 w-3.5 text-white" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white">Offer Applied — Now Circle Ready</span>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                        isTop ? "bg-nets-red text-white" : "bg-nets-page text-nets-navy"
                      }`}>#{rank + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold leading-snug text-nets-navy text-sm">{idea.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {validOffer
                            ? <><span className="line-through text-muted-foreground/50 mr-1">S${originalIdea.estimatedMin}–S${originalIdea.estimatedMax}</span>S${idea.estimatedMin}–S${idea.estimatedMax} per person</>
                            : <>S${idea.estimatedMin}–S${idea.estimatedMax} per person</>
                          }
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1.5 ${cfg.badgeBg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Three factor bars */}
                    <div className="space-y-2 pt-1">
                      <FactorBar
                        label="Spend Fit"
                        pct={spendFit}
                        color={spendFit >= 80 ? "bg-nets-green" : spendFit >= 55 ? "bg-amber-400" : "bg-nets-red"}
                      />
                      <FactorBar
                        label="Group Ranking"
                        pct={groupRanking}
                        color={groupRanking >= 75 ? "bg-nets-blue" : "bg-nets-navy/50"}
                      />
                      <FactorBar
                        label="Practical Fit"
                        pct={practicalFit}
                        color={practicalFit >= 70 ? "bg-nets-green" : "bg-amber-400"}
                      />
                    </div>

                    {/* Expand trigger */}
                    {((status === "circle-ready" && idea.itinerary) || status === "adjust-plan" || status === "not-aligned") && (
                      <button
                        onClick={() => setExpandedId(isExp ? null : originalIdea.id)}
                        className="flex w-full items-center justify-between rounded-xl bg-nets-page px-3 py-2 text-xs font-semibold text-nets-navy"
                      >
                        <span>
                          {status === "circle-ready" ? "View agreed itinerary" :
                           status === "adjust-plan" ? "A Circle-Ready offer is available" :
                           "Why this doesn't fit"}
                        </span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isExp ? "rotate-90" : ""}`} />
                      </button>
                    )}

                    <AnimatePresence>
                      {isExp && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {/* Circle Ready: show agreed itinerary */}
                          {status === "circle-ready" && idea.itinerary && (
                            <ItineraryTimeline itinerary={idea.itinerary} />
                          )}

                          {/* Adjust Plan: show Circle-Ready offer (only if it passes checkOfferFits) */}
                          {status === "adjust-plan" && pendingOffer && (
                            <div className="mt-2 space-y-3">
                              {/* Offer card */}
                              <div className="rounded-2xl border-2 border-nets-green/30 bg-nets-green/5 p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Check className="h-4 w-4 text-nets-green" />
                                    <span className="text-xs font-extrabold text-nets-green uppercase tracking-wide">Circle-Ready Offer</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-nets-green bg-nets-green/10 rounded-full px-2 py-0.5">
                                    {pendingOffer.minPeople}+ people
                                  </span>
                                </div>
                                <p className="text-sm font-extrabold text-nets-navy">{pendingOffer.offerTitle}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{pendingOffer.description}</p>
                                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                                  <div>
                                    <p className="text-[11px] text-muted-foreground">Original</p>
                                    <p className="text-sm font-bold text-nets-navy line-through text-muted-foreground/60">
                                      S${pendingOffer.originalMin}–S${pendingOffer.originalMax}/person
                                    </p>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-nets-green mx-2" />
                                  <div className="text-right">
                                    <p className="text-[11px] text-nets-green font-bold">With offer</p>
                                    <p className="text-sm font-extrabold text-nets-green">
                                      S${pendingOffer.offerMin}–S${pendingOffer.offerMax}/person
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Valid: {pendingOffer.validDuring} · {pendingOffer.merchantName}
                                </p>
                                <p className="text-[11px] text-nets-green/80 italic">
                                  This offer brings the <strong>full plan</strong> — dinner and karaoke — within the Circle. Nothing is removed.
                                </p>
                              </div>
                              {/* Privacy note */}
                              <div className="flex items-start gap-2 rounded-xl bg-nets-blue/5 border border-nets-blue/10 px-3 py-2.5">
                                <ShieldCheck className="h-4 w-4 text-nets-blue shrink-0 mt-0.5" />
                                <p className="text-[11px] text-nets-blue leading-relaxed">Nobody can see whose Spend Band was outside range — this is a group signal only.</p>
                              </div>
                              {/* Accept offer CTA */}
                              <button
                                onClick={() => {
                                  setAcceptedOffers((prev) => ({ ...prev, [originalIdea.id]: true }))
                                  setExpandedId(null)
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-green py-3.5 text-sm font-extrabold text-white shadow-sm shadow-nets-green/20 active:opacity-80"
                              >
                                <Check className="h-4 w-4" />
                                Use this offer
                              </button>
                            </div>
                          )}

                          {/* Adjust Plan: no valid offer available — show why */}
                          {status === "adjust-plan" && !pendingOffer && (
                            <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                              <p className="text-xs font-bold text-amber-800">What needs adjusting</p>
                              <p className="text-xs text-amber-700 leading-relaxed">
                                The estimated cost of S${originalIdea.estimatedMax}/person is slightly above the comfortable range for some members. No merchant offer is currently available that resolves this. Consider choosing a different plan.
                              </p>
                              <p className="text-[11px] text-amber-600/80 italic">Nobody can see whose Spend Band was affected.</p>
                            </div>
                          )}

                          {/* Not Aligned Yet: explain + switch plan options */}
                          {status === "not-aligned" && (
                            <div className="mt-2 space-y-3">
                              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                                <p className="text-xs font-bold text-gray-700">Why this doesn&apos;t fit</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                  At S${originalIdea.estimatedMin}–S${originalIdea.estimatedMax} per person, this plan falls outside the group&apos;s comfortable spend range. No adjustment currently available can close that gap.
                                </p>
                                <p className="text-[11px] text-gray-400 italic">Nobody can see whose Spend Band was affected.</p>
                              </div>
                              {circleReadyAlts.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-nets-navy">Try another plan</p>
                                  {circleReadyAlts.map((alt) => (
                                    <button
                                      key={alt.idea.id}
                                      onClick={() => onSelect(alt.idea, alt.status)}
                                      className="flex w-full items-center gap-3 rounded-2xl bg-nets-green/5 border border-nets-green/20 p-3 text-left active:opacity-80"
                                    >
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nets-green/20 text-[10px] font-extrabold text-nets-green">✓</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-extrabold text-nets-navy truncate">{alt.idea.title}</p>
                                        <p className="text-[11px] text-nets-green font-semibold">S${alt.idea.estimatedMin}–S${alt.idea.estimatedMax}/person · Circle Ready</p>
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-nets-green shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* CTA: only for Circle Ready plans */}
                    {canChoose && (
                      <button
                        onClick={() => onSelect(idea, status)}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white shadow-sm active:opacity-80 ${
                          isTop ? "bg-nets-red shadow-nets-red/20" : "bg-nets-green shadow-nets-green/20"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Choose this plan
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </motion.div>
  )
}
