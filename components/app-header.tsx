"use client"

import { Bell, User } from "lucide-react"
import { NetsLogo } from "./nets-logo"
import { useNav } from "./nav-context"

export function AppHeader({ unread = true }: { unread?: boolean }) {
  const { go } = useNav()
  return (
    <header className="flex items-center justify-between px-4 pb-2 pt-2">
      <NetsLogo />
      <div className="flex items-center gap-3">
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-nets-navy" strokeWidth={1.8} />
          {unread && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-nets-red ring-2 ring-white" />
          )}
        </button>
        <button
          onClick={() => go("profile")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-nets-navy"
          aria-label="Profile"
        >
          <User className="h-5 w-5 text-white" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
