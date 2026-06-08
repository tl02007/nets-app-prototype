"use client"

import { motion } from "motion/react"
import {
  QrCode,
  Plus,
  ArrowLeftRight,
  ReceiptText,
  Eye,
  EyeOff,
  ChevronRight,
  Users,
  MoreHorizontal,
  Settings,
  Bus,
} from "lucide-react"
import { useState } from "react"
import { AppHeader } from "../app-header"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import { transactions, promos, user, circles, circleTotal } from "@/lib/nets-data"

const fmt = (n: number) =>
  n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function HomeScreen() {
  const { go, openCircle } = useNav()
  const [hidden, setHidden] = useState(false)
  const [promoIndex, setPromoIndex] = useState(0)
  const activeCircle = circles.find((c) => c.status === "active")

  const bannerSlides = [
    {
      bg: "linear-gradient(135deg, #f0f8ff 0%, #e8f4fd 100%)",
      badge: "NO TOP-UP FEES",
      badgeColor: "#E8192C",
      title: "with NETS payment",
      sub: "Add your DBS, OCBC, POSB and UOB ATM or debit cards on NETS App to enjoy top-up fee waivers",
      cta: "Find out more",
    },
    {
      bg: "linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)",
      badge: "NETS+ Gold",
      badgeColor: "#d4a017",
      title: "Earn 2x points this month",
      sub: "Pay with NETS at over 130,000 acceptance points and earn double loyalty points",
      cta: "Learn more",
    },
    {
      bg: "linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)",
      badge: "NEW",
      badgeColor: "#2e7d32",
      title: "Prepaid Card Scan & Pay",
      sub: "Use your NETS Prepaid Card for tap & scan payments everywhere",
      cta: "Try now",
    },
  ]

  const flashPayActions = [
    { label: "Top-up", icon: Plus, action: () => go("home") },
    { label: "History", icon: ReceiptText, action: () => go("history") },
    { label: "Auto Top-up", icon: ArrowLeftRight, action: () => go("home") },
    { label: "More", icon: MoreHorizontal, action: () => go("home") },
  ]

  const prepaidActions = [
    { label: "Scan & Pay", icon: QrCode, action: () => go("pay") },
    { label: "Card Settings", icon: Settings, action: () => go("profile") },
  ]

  return (
    <div className="flex h-full flex-col bg-[#f2f2f7]">
      {/* Header — white background like real NETS app */}
      <div className="bg-white">
        <StatusBar />
        <AppHeader />
      </div>

      <div className="flex-1 overflow-y-auto pb-28">

        {/* Promo Banner Carousel */}
        <div className="bg-white px-4 pb-4">
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ background: bannerSlides[promoIndex].bg, minHeight: 120 }}
          >
            <div className="p-4 pr-28">
              <span
                className="inline-block rounded px-2 py-0.5 text-xs font-extrabold text-white"
                style={{ backgroundColor: bannerSlides[promoIndex].badgeColor }}
              >
                {bannerSlides[promoIndex].badge}
              </span>
              <p className="mt-1 text-sm font-extrabold text-nets-navy leading-tight">
                {bannerSlides[promoIndex].title}
              </p>
              <p className="mt-1 text-[11px] text-nets-navy/70 leading-snug">
                {bannerSlides[promoIndex].sub}
              </p>
              <button className="mt-2 rounded bg-nets-navy px-3 py-1 text-[11px] font-bold text-white">
                {bannerSlides[promoIndex].cta}
              </button>
            </div>
          </div>
          {/* Dots */}
          <div className="mt-2 flex justify-center gap-1.5">
            {bannerSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setPromoIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === promoIndex ? "w-4 bg-nets-navy" : "w-1.5 bg-nets-navy/25"}`}
              />
            ))}
          </div>
        </div>

        {/* NETS Wallet Card */}
        <div className="mx-4 mt-3">
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative overflow-hidden rounded-2xl bg-nets-navy p-5 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/70 tracking-wide">NETS Wallet</span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">{user.tier}</span>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-sm text-white/70">SGD</span>
              <span className="text-3xl font-extrabold tracking-tight">
                {hidden ? "••••••" : fmt(user.balance)}
              </span>
              <button onClick={() => setHidden((h) => !h)} className="mb-1 text-white/60" aria-label="Toggle balance">
                {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
              <span className="text-xs text-white/60">{user.bank}</span>
              <button className="flex items-center gap-1 text-xs font-bold text-white">
                Top up <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* NETS FlashPay | Motoring | AutoPass Card section */}
        <div className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-[13px] font-extrabold text-nets-navy">
              NETS FlashPay | Motoring | AutoPass Card
            </h2>
            <button className="flex h-6 w-6 items-center justify-center rounded-full border border-nets-navy/30">
              <span className="text-[10px] font-bold text-nets-navy">i</span>
            </button>
          </div>
          {/* Blue carousel card */}
          <div className="mx-4 mb-3 rounded-xl bg-nets-navy p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Bus className="h-7 w-7 text-white" />
              </div>
              <p className="text-xs text-white/80 leading-snug">
                For travel on public buses and trains, and payment at over 130,000 NETS acceptance points
              </p>
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {[0,1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full ${i === 0 ? "w-4 bg-white" : "w-1.5 bg-white/30"}`} />
              ))}
            </div>
          </div>
          {/* Quick actions */}
          <div className="grid grid-cols-4 border-t border-gray-100 px-2 pb-3 pt-2">
            {flashPayActions.map((a) => {
              const Icon = a.icon
              return (
                <button key={a.label} onClick={a.action} className="flex flex-col items-center gap-1.5 py-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nets-navy/5">
                    <Icon className="h-5 w-5 text-nets-navy" />
                  </span>
                  <span className="text-[11px] text-nets-navy/80 font-medium">{a.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* NETS Prepaid Card Scan & Pay */}
        <div className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="bg-nets-navy px-4 py-2">
            <p className="text-center text-[13px] font-bold text-white">NETS Prepaid Card Scan &amp; Pay</p>
          </div>
          <div className="flex items-center px-4 py-4 gap-4">
            {/* Illustration placeholder */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-nets-red/10">
              <QrCode className="h-10 w-10 text-nets-red" />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              {prepaidActions.map((a) => {
                const Icon = a.icon
                return (
                  <button
                    key={a.label}
                    onClick={a.action}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-nets-navy/5">
                      <Icon className="h-5 w-5 text-nets-navy" />
                    </span>
                    <span className="text-[11px] text-nets-navy/80 font-medium">{a.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Active Circle */}
        {activeCircle && (
          <motion.button
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openCircle(activeCircle.id)}
            className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-2xl bg-nets-red p-4 text-left text-white shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Users className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                Live now
              </span>
              <p className="mt-1 truncate text-sm font-bold">{activeCircle.name}</p>
              <p className="text-xs text-white/80">
                ${fmt(circleTotal(activeCircle))} tracked · {activeCircle.members.length} friends
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/70" />
          </motion.button>
        )}

        {/* vCashCard section */}
        <div className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-[13px] font-extrabold text-nets-navy">NETS vCashCard</h2>
          </div>
          <div className="px-4 pb-3">
            <p className="text-xs text-nets-navy/60">View and download your transaction details anytime, anywhere.</p>
          </div>
          <div className="mx-4 mb-4 flex items-center justify-between rounded-xl bg-nets-navy p-4 text-white">
            <p className="text-sm font-semibold leading-snug max-w-[60%]">Stay on top of your transactions</p>
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-nets-navy">
              Get Started
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
