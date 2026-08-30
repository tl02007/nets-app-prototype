"use client"

import { motion } from "motion/react"
import { useMemo, useState } from "react"
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react"
import { StatusBar } from "../status-bar"
import { useCircleData } from "../circle-data-context"

const fmt = (n: number) =>
  n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Filter = "all" | "out" | "in"

export function HistoryScreen() {
  const [filter, setFilter] = useState<Filter>("all")
  const { transactions } = useCircleData()

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.type === filter)),
    [filter, transactions],
  )

  const spent = transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0)
  const received = transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0)
  const budget = 1500
  const pct = Math.min(100, (spent / budget) * 100)

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "out", label: "Money out" },
    { key: "in", label: "Money in" },
  ]

  return (
    <div className="flex h-full flex-col bg-nets-page">
      <div className="bg-nets-page">
        <StatusBar />
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <h1 className="text-xl font-extrabold text-nets-navy">History</h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm">
            <Search className="h-4.5 w-4.5 text-nets-navy" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Spending summary */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-3xl bg-nets-navy p-5 text-white shadow-lg shadow-nets-navy/20"
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-white/60">Spent in {new Date().toLocaleString("en-SG", { month: "long" })}</p>
              <p className="text-2xl font-extrabold">${fmt(spent)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Received</p>
              <p className="text-base font-bold text-nets-green">+${fmt(received)}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-nets-red"
            />
          </div>
          <p className="mt-2 text-xs text-white/60">
            ${fmt(spent)} of ${fmt(budget)} monthly budget
          </p>
        </motion.div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                filter === f.key
                  ? "bg-nets-navy text-white"
                  : "bg-card text-muted-foreground shadow-sm"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-3 rounded-3xl bg-card p-2 shadow-sm">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-2xl px-2 py-3"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-nets-navy">{t.merchant}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="rounded-full bg-nets-navy/5 px-2 py-0.5 text-[10px] font-semibold text-nets-navy/70">
                    {t.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {t.type === "in" ? (
                  <ArrowDownLeft className="h-3.5 w-3.5 text-nets-green" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span
                  className={`text-sm font-bold ${t.type === "in" ? "text-nets-green" : "text-nets-navy"}`}
                >
                  {t.type === "in" ? "+" : "-"}${fmt(t.amount)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
