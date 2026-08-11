"use client"

import { motion, AnimatePresence } from "motion/react"
import { useState } from "react"
import { ScanLine, ImageIcon, ChevronRight, Minus, Plus } from "lucide-react"
import { StatusBar } from "../status-bar"
import { useCircleData } from "../circle-data-context"
import { NetsQrPayment } from "../nets-qr-payment"

type ShowStep = "amount" | "qr" | "done"

export function PayScreen() {
  const { user } = useCircleData()
  const [mode, setMode] = useState<"scan" | "show">("scan")

  // "Show My QR" sub-flow
  const [showStep, setShowStep] = useState<ShowStep>("amount")
  const [amount, setAmount] = useState(5.00)

  const handleModeChange = (m: "scan" | "show") => {
    setMode(m)
    setShowStep("amount") // reset sub-flow on tab switch
    setAmount(5.00)
  }

  return (
    <div className="flex h-full flex-col bg-nets-navy text-white">
      <StatusBar dark />
      <div className="px-5 pb-2 pt-1">
        <h1 className="text-xl font-extrabold">Scan &amp; Pay</h1>
        <p className="text-sm text-white/60">Pay at 130,000+ NETS acceptance points</p>
      </div>

      {/* Tab toggle */}
      <div className="mx-5 mt-2 flex rounded-full bg-white/10 p-1">
        {(["scan", "show"] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
              mode === m ? "bg-white text-nets-navy" : "text-white/70"
            }`}
          >
            {m === "scan" ? "Scan to Pay" : "Show My QR"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-28">
        <AnimatePresence mode="wait">

          {/* ── Scan to Pay ─────────────────────────────────────── */}
          {mode === "scan" && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="relative h-64 w-64 rounded-3xl border border-white/15 bg-black/20">
                {/* Corner frames */}
                {[
                  "left-3 top-3 border-l-4 border-t-4 rounded-tl-xl",
                  "right-3 top-3 border-r-4 border-t-4 rounded-tr-xl",
                  "left-3 bottom-3 border-l-4 border-b-4 rounded-bl-xl",
                  "right-3 bottom-3 border-r-4 border-b-4 rounded-br-xl",
                ].map((c, i) => (
                  <span key={i} className={`absolute h-10 w-10 border-nets-red ${c}`} />
                ))}
                <motion.div
                  initial={{ top: "12%" }}
                  animate={{ top: ["12%", "82%", "12%"] }}
                  transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="absolute inset-x-6 h-0.5 rounded-full bg-nets-red shadow-[0_0_12px_2px_var(--nets-red)]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="h-12 w-12 text-white/20" />
                </div>
              </div>
              <p className="mt-6 text-center text-sm text-white/70">
                Align the QR code within the frame
              </p>
              <button className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
                <ImageIcon className="h-4 w-4" /> Upload from gallery
              </button>
            </motion.div>
          )}

          {/* ── Show My QR — amount entry ──────────────────────── */}
          {mode === "show" && showStep === "amount" && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs"
            >
              {/* User card */}
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-nets-red text-base font-bold">
                  {user.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-xs text-white/60">{user.handle}</p>
                </div>
              </div>

              {/* Amount picker */}
              <p className="mb-2 text-center text-xs text-white/60 font-semibold uppercase tracking-wide">
                How much to collect?
              </p>
              <div className="flex items-center justify-center gap-4 rounded-2xl bg-white/10 p-4">
                <button
                  onClick={() => setAmount((a) => Math.max(0.01, parseFloat((a - 1).toFixed(2))))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="min-w-[80px] text-center text-3xl font-extrabold tabular-nums">
                  ${amount.toFixed(2)}
                </span>
                <button
                  onClick={() => setAmount((a) => parseFloat((a + 1).toFixed(2)))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => setShowStep("qr")}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-nets-navy shadow-lg active:opacity-80"
              >
                Generate NETS QR
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-xs text-white/50">
                PayNow &amp; NETS QR · instant collection
              </p>
            </motion.div>
          )}

          {/* ── Show My QR — NETS QR code ─────────────────────── */}
          {mode === "show" && (showStep === "qr" || showStep === "done") && (
            <motion.div
              key="qr-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full max-w-xs"
            >
              {/* NetsQrPayment overlays within this container */}
              <div className="relative h-[460px] w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
                <NetsQrPayment
                  amount={amount}
                  label={`Collecting $${amount.toFixed(2)} from sender`}
                  onSuccess={() => setShowStep("done")}
                  onCancel={() => setShowStep("amount")}
                />
              </div>

              {showStep === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm font-bold text-white">Payment received!</p>
                  <button
                    onClick={() => { setShowStep("amount"); setAmount(5.00) }}
                    className="mt-2 text-xs text-white/60 underline"
                  >
                    Collect another amount
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
