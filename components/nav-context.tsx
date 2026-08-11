"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Screen =
  | "splash"
  | "home"
  | "pay"
  | "history"
  | "circle"
  | "profile"

type NavContextType = {
  screen: Screen
  go: (s: Screen) => void
  // Circle sub-navigation
  circleView: CircleView
  setCircleView: (v: CircleView) => void
  activeCircleId: string | null
  openCircle: (id: string) => void
}

// V2 concept doc flow:
//   list → create → commitment (private dollar amount) → experience (spend bands)
//       → check (Circle Ready / Adjust Plan / Not Aligned) → wallet-setup → detail
//       → settle / reconcile
// "comfort" and "confidence" are kept as aliases so any external references still compile.
export type CircleView =
  | "list"
  | "create"
  | "commitment"   // V2: private dollar-amount commitment (replaces "comfort" tier)
  | "comfort"      // legacy alias — redirects to "commitment" in CircleScreen
  | "experience"
  | "check"        // V2: Circle Ready / Adjust Plan / Not Aligned (replaces "confidence" %)
  | "confidence"   // legacy alias — redirects to "check" in CircleScreen
  | "wallet-setup"
  | "detail"
  | "settle"
  | "reconcile"

const NavContext = createContext<NavContextType | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("splash")
  const [circleView, setCircleView] = useState<CircleView>("list")
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null)

  // After an eNETS payment the gateway redirects the browser back to /?payment=…
  // which is a full page reload — detect the param and land on home rather than splash.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (new URLSearchParams(window.location.search).get("payment")) {
      setScreen("home")
    }
  }, [])

  function go(s: Screen) {
    if (s === "circle" && screen !== "circle") {
      setCircleView("list")
    }
    setScreen(s)
  }

  function openCircle(id: string) {
    setActiveCircleId(id)
    setCircleView("detail")
    setScreen("circle")
  }

  return (
    <NavContext.Provider
      value={{ screen, go, circleView, setCircleView, activeCircleId, openCircle }}
    >
      {children}
    </NavContext.Provider>
  )
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error("useNav must be used within NavProvider")
  return ctx
}
