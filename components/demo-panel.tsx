"use client"

import { motion, AnimatePresence } from "motion/react"
import { X, RotateCcw, Play } from "lucide-react"
import { useDemoContext } from "@/lib/demo-context"
import { useNav } from "./nav-context"
import { useCircleData } from "./circle-data-context"
import type { CircleCheckOutcome } from "@/lib/nets-data"

type Scenario = {
  id: number
  title: string
  desc: string
  action: () => void
}

type Group = {
  label: string
  color: string
  scenarios: Scenario[]
}

export function DemoPanel() {
  const { panelOpen, closePanel, activateScene, clearScene } = useDemoContext()
  const { go, openCircle, setCircleView } = useNav()
  const { resetData, createNextRoundRequest, acceptNextRound } = useCircleData()

  // ── helpers ──────────────────────────────────────────────────────────────

  function goCheck(outcome: CircleCheckOutcome) {
    activateScene(`check:${outcome}`)
    setCircleView("check")
    go("circle")
    closePanel()
  }

  function goPay(scene: string) {
    activateScene(`pay:${scene}`)
    openCircle("c1")
    closePanel()
  }

  function goClose(scene: string, nrId?: string) {
    activateScene(`close:${scene}${nrId ? `:${nrId}` : ""}`)
    setCircleView("settle")
    openCircle("c1")
    closePanel()
  }

  function handleStartMainDemo() {
    resetData()
    activateScene("create:demo")
    setCircleView("create")
    go("circle")
    closePanel()
  }

  function handleReset() {
    resetData()
    clearScene()
    go("circle")
    setCircleView("list")
    closePanel()
  }

  // ── 22 scenarios ─────────────────────────────────────────────────────────

  const groups: Group[] = [
    {
      label: "Circle Check",
      color: "bg-nets-blue",
      scenarios: [
        {
          id: 1,
          title: "Circle Ready",
          desc: "Group aligned — confidence high, everyone within spend band",
          action: () => goCheck("circle-ready"),
        },
        {
          id: 2,
          title: "Adjust Plan",
          desc: "Partial alignment — NETS suggests cost-saving alternatives",
          action: () => goCheck("adjust-plan"),
        },
        {
          id: 3,
          title: "Not Aligned Yet",
          desc: "Group not ready — significant spend band mismatch",
          action: () => goCheck("not-aligned"),
        },
        {
          id: 4,
          title: "Circle-Ready Offer Rescue",
          desc: "Borderline group saved by a Circle-Ready merchant offer",
          action: () => goCheck("circle-ready"),
        },
        {
          id: 5,
          title: "Revised Group Plan",
          desc: "Itinerary recalculated after one member's preference change",
          action: () => goCheck("adjust-plan"),
        },
        {
          id: 6,
          title: "Core-Stop Participation Warning",
          desc: "Member dropping a must-attend stop triggers realignment",
          action: () => goCheck("not-aligned"),
        },
      ],
    },
    {
      label: "Circle Pay — Menu & Order",
      color: "bg-nets-navy",
      scenarios: [
        {
          id: 7,
          title: "Merchant Digital Menu Available",
          desc: "NETS fetches the merchant menu in-app; tap to browse & order",
          action: () => goPay("stop1-menu"),
        },
        {
          id: 8,
          title: "Merchant Menu Unavailable",
          desc: "Digital menu unavailable; fall back to manual or camera scan",
          action: () => goPay("stop1-menu-unavailable"),
        },
        {
          id: 9,
          title: "Scan Physical Menu Fallback",
          desc: "Camera scan mode activated for a physical printed menu",
          action: () => goPay("stop1-scan"),
        },
        {
          id: 10,
          title: "Locked Order Matches NETS Payment",
          desc: "QR scanned; payment amount matches locked order exactly",
          action: () => goPay("stop1-matched"),
        },
        {
          id: 11,
          title: "Payment Mismatch",
          desc: "NETS payment differs from locked order — Q&A: show mismatch UI",
          action: () => goPay("stop1-mismatch"),
        },
        {
          id: 12,
          title: "Unplanned NETS Payment",
          desc: "A NETS QR payment occurs that isn't in the Circle plan",
          action: () => goPay("unplanned-payment"),
        },
        {
          id: 13,
          title: "Non-NETS Manual Expense",
          desc: "Add a cash or card expense manually to the Circle ledger",
          action: () => goPay("manual-expense"),
        },
      ],
    },
    {
      label: "Circle Close — PayNow Settle",
      color: "bg-[#7c3aed]",
      scenarios: [
        {
          id: 14,
          title: "Settle Now via PayNow QR",
          desc: "Creditor shows PayNow QR; debtor scans to pay",
          action: () => goClose("settle-qr"),
        },
        {
          id: 15,
          title: "Sender Says 'Payment Sent'",
          desc: "Debtor taps 'Payment Sent'; balance moves to waiting state",
          action: () => goClose("settle-waiting"),
        },
        {
          id: 16,
          title: "Recipient Confirms 'Received'",
          desc: "Creditor sees waiting state and confirms receipt",
          action: () => goClose("settle-waiting-recipient"),
        },
        {
          id: 17,
          title: "Recipient Says 'Not Yet'",
          desc: "Creditor taps Not Yet — balance stays open",
          action: () => goClose("settle-rejected"),
        },
      ],
    },
    {
      label: "Circle Close — Next Round",
      color: "bg-nets-green",
      scenarios: [
        {
          id: 18,
          title: "Next Round Eligible",
          desc: "Balance ≤ S$20 — Next Round button appears alongside Settle Now",
          action: () => goClose("home"),
        },
        {
          id: 19,
          title: "Next Round Rejected",
          desc: "Debtor sees the NR offer and chooses to settle now instead",
          action: () => {
            const nrId = createNextRoundRequest({
              fromId: "krishna", toId: "thanis", amount: 11, remaining: 11,
              status: "pending", originCircleId: "c1",
            })
            goClose("nr-recipient", nrId)
          },
        },
        {
          id: 20,
          title: "Next Round Accepted",
          desc: "Debtor accepts — Krishna owes Thanis the next round",
          action: () => {
            const nrId = createNextRoundRequest({
              fromId: "krishna", toId: "thanis", amount: 11, remaining: 11,
              status: "accepted", originCircleId: "c1",
            })
            acceptNextRound(nrId)
            goClose("nr-confirmed", nrId)
          },
        },
        {
          id: 21,
          title: "One Week Later — Next Round Applied",
          desc: "Saturday Brunch opens; NR credit reduces Krishna's share by S$11",
          action: () => {
            // Seed an accepted NR request for the brunch demo
            const nrId = createNextRoundRequest({
              fromId: "krishna", toId: "thanis", amount: 11, remaining: 11,
              status: "accepted", originCircleId: "c1",
            })
            acceptNextRound(nrId)
            activateScene("brunch:one-week-later")
            openCircle("c-brunch")
            closePanel()
          },
        },
      ],
    },
    {
      label: "Circle Close — Future (Q&A only)",
      color: "bg-nets-red",
      scenarios: [
        {
          id: 22,
          title: "Future: Tap Settle → Approve → Done",
          desc: "Bank-linked auto-settlement — FUTURE badge, not in current MVP",
          action: () => goClose("future-settle"),
        },
      ],
    },
  ]

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="demo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[90] bg-black/50"
            onClick={closePanel}
          />

          {/* Panel drawer */}
          <motion.div
            key="demo-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="absolute bottom-0 left-0 right-0 z-[95] flex flex-col rounded-t-3xl bg-white shadow-2xl"
            style={{ maxHeight: "88dvh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 pb-3 pt-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-nets-red">Demo Mode</p>
                <h2 className="text-base font-black text-nets-navy">Q&amp;A Scenario Panel</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Reset */}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-full bg-nets-navy px-3 py-1.5 text-xs font-bold text-white active:opacity-75"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Demo
                </button>
                <button
                  onClick={closePanel}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:opacity-70"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Main Demo CTA ── */}
            <div className="border-b border-gray-100 px-4 py-3">
              <button
                onClick={handleStartMainDemo}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-nets-red py-3.5 text-sm font-black text-white shadow-md active:opacity-80"
              >
                <Play className="h-4 w-4 fill-white" />
                Start Main Demo
              </button>
              <p className="mt-1.5 text-center text-[10px] text-gray-400">
                Resets all data · Pre-fills Create Circle · 2-min run-through
              </p>
            </div>

            {/* Scrollable scenario list */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {groups.map((group) => (
                <div key={group.label} className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${group.color}`}>
                      {group.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.scenarios.map((s) => (
                      <button
                        key={s.id}
                        onClick={s.action}
                        className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-left active:bg-gray-100"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nets-navy/10 text-[10px] font-black text-nets-navy">
                          {s.id}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-tight text-nets-navy">{s.title}</p>
                          <p className="mt-0.5 text-xs leading-snug text-gray-500">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <p className="pb-4 text-center text-[10px] text-gray-300">
                NETS Circle Prototype · Demo Controls · Not for distribution
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
