"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

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

export type CircleView =
  | "list"
  | "create"
  | "detail"
  | "settle"
  | "recap"

const NavContext = createContext<NavContextType | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("splash")
  const [circleView, setCircleView] = useState<CircleView>("list")
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null)

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
