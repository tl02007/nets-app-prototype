"use client"

import { motion } from "motion/react"
import {
  CreditCard,
  ShieldCheck,
  Settings,
  MapPin,
  Info,
  Lock,
  ChevronRight,
  X,
  User,
} from "lucide-react"
import { StatusBar } from "../status-bar"
import { useNav } from "../nav-context"
import { useCircleData } from "../circle-data-context"

export function ProfileScreen() {
  const { go } = useNav()
  const { user } = useCircleData()

  const rows = [
    { icon: CreditCard, label: "Payment Methods", color: "#1a3a6b" },
    { icon: ShieldCheck, label: "Security", color: "#E8192C" },
    { icon: Settings, label: "Permissions", color: "#4a90d9" },
    { icon: MapPin, label: "Help Centre", color: "#1a3a6b" },
    { icon: Info, label: "About NETS App", color: "#1a3a6b" },
  ]

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-white">
        <StatusBar />
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <button
            onClick={() => go("home")}
            className="flex h-9 w-9 items-center justify-center"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-nets-navy" strokeWidth={2} />
          </button>
          <button className="text-sm font-bold text-nets-blue">Sign out</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Identity */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <User className="h-9 w-9 text-nets-navy" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-nets-navy/70">{user.email}</p>
            <button className="mt-0.5 text-sm font-bold text-nets-blue">Edit profile</button>
          </div>
        </div>

        <div className="h-2 bg-[#f2f2f7]" />

        {/* Settings rows */}
        <div className="px-4 py-2">
          {rows.map((r, i) => {
            const Icon = r.icon
            return (
              <motion.button
                key={r.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center gap-4 rounded-2xl bg-white px-2 py-4 text-left shadow-sm mb-2"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${r.color}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: r.color }} strokeWidth={1.8} />
                </span>
                <span className="flex-1 text-[15px] font-medium text-nets-navy">{r.label}</span>
              </motion.button>
            )
          })}

          {/* Kill switch — red outline */}
          <button className="flex w-full items-center gap-4 rounded-2xl bg-white px-2 py-4 text-left shadow-sm mb-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nets-red/10">
              <Lock className="h-5 w-5 text-nets-red" strokeWidth={1.8} />
            </span>
            <span className="flex-1 text-[15px] font-medium text-nets-navy">Activate Kill Switch</span>
          </button>
        </div>

        <div className="h-2 bg-[#f2f2f7]" />

        <button className="mt-6 w-full text-center text-sm font-bold text-nets-blue py-2">
          Delete Account
        </button>
      </div>
    </div>
  )
}
