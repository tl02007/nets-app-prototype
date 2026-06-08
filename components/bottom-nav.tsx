"use client"

import { Home, QrCode, ReceiptText, Users, User } from "lucide-react"
import { useNav, type Screen } from "./nav-context"

const tabs: { key: Screen; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "history", label: "History", icon: ReceiptText },
  { key: "pay", label: "Pay", icon: QrCode },
  { key: "circle", label: "Circle", icon: Users },
  { key: "profile", label: "Me", icon: User },
]

export function BottomNav() {
  const { screen, go } = useNav()

  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white">
      <div className="grid grid-cols-5 pb-6 pt-1">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = screen === t.key
          const isPay = t.key === "pay"

          if (isPay) {
            return (
              <button
                key={t.key}
                onClick={() => go(t.key)}
                className="flex flex-col items-center gap-1"
                aria-label="Scan & Pay"
              >
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-nets-red text-white shadow-lg shadow-nets-red/40 ring-4 ring-white">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className={`text-[10px] font-semibold ${active ? "text-nets-red" : "text-gray-500"}`}>
                  {t.label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={t.key}
              onClick={() => go(t.key)}
              className="flex flex-col items-center gap-1 py-2"
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-nets-red" : "text-gray-400"}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className={`text-[10px] font-semibold ${active ? "text-nets-red" : "text-gray-400"}`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
