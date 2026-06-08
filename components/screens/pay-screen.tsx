"use client"

import { motion } from "motion/react"
import { useState } from "react"
import { ScanLine, QrCode, Zap, ImageIcon } from "lucide-react"
import { StatusBar } from "../status-bar"
import { user } from "@/lib/nets-data"

function FakeQr() {
  // deterministic pseudo-random grid so it reads as a QR code
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const x = i % 21
    const y = Math.floor(i / 21)
    const finder =
      (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
    const on = finder ? true : (x * 13 + y * 7 + ((x * y) % 5)) % 3 === 0
    return on
  })
  return (
    <div className="grid grid-cols-21 gap-px" style={{ gridTemplateColumns: "repeat(21, 1fr)" }}>
      {cells.map((on, i) => (
        <div
          key={i}
          className="aspect-square"
          style={{ backgroundColor: on ? "var(--nets-navy)" : "transparent" }}
        />
      ))}
    </div>
  )
}

export function PayScreen() {
  const [mode, setMode] = useState<"scan" | "show">("scan")

  return (
    <div className="flex h-full flex-col bg-nets-navy text-white">
      <StatusBar dark />
      <div className="px-5 pb-2 pt-1">
        <h1 className="text-xl font-extrabold">Scan &amp; Pay</h1>
        <p className="text-sm text-white/60">Pay at 130,000+ NETS acceptance points</p>
      </div>

      {/* toggle */}
      <div className="mx-5 mt-2 flex rounded-full bg-white/10 p-1">
        {(["scan", "show"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
              mode === m ? "bg-white text-nets-navy" : "text-white/70"
            }`}
          >
            {m === "scan" ? "Scan to Pay" : "Show My QR"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-28">
        {mode === "scan" ? (
          <motion.div
            key="scan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative h-64 w-64 rounded-3xl border border-white/15 bg-black/20">
              {/* corner frames */}
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
        ) : (
          <motion.div
            key="show"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xs rounded-3xl bg-white p-6 text-nets-navy shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nets-navy text-base font-bold text-white">
                A
              </span>
              <div>
                <p className="text-sm font-bold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.handle}</p>
              </div>
              <Zap className="ml-auto h-5 w-5 text-nets-red" />
            </div>
            <div className="mt-5 rounded-2xl border border-border p-4">
              <FakeQr />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
              <QrCode className="h-4 w-4 text-nets-blue" />
              PayNow &amp; NETS QR linked
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Show this code to receive payment
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
