"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

type DemoContextType = {
  // true when demo panel is unlocked (URL param or tap trigger)
  enabled: boolean
  panelOpen: boolean
  // current scene string consumed by components at mount; null after consumed
  scene: string | null
  // bumped by activateScene() — components use this in their key prop to force remount
  resetKey: number
  activateScene: (scene: string) => void
  clearScene: () => void
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  // tap counter for hidden trigger
  recordTap: () => void
}

const DemoContext = createContext<DemoContextType | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [scene, setScene] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [tapCount, setTapCount] = useState(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enable via URL param ?demo on first client render
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("demo")) {
      setEnabled(true)
    }
  }, [])

  function activateScene(s: string) {
    setScene(s)
    setResetKey((k) => k + 1)
  }

  function clearScene() { setScene(null) }
  function togglePanel() { setPanelOpen((p) => !p) }
  function openPanel() { setPanelOpen(true) }
  function closePanel() { setPanelOpen(false) }

  function recordTap() {
    const next = tapCount + 1
    setTapCount(next)
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => setTapCount(0), 1500)
    if (next >= 5) {
      setEnabled(true)
      setPanelOpen(true)
      setTapCount(0)
    }
  }

  return (
    <DemoContext.Provider value={{
      enabled, panelOpen, scene, resetKey,
      activateScene, clearScene, togglePanel, openPanel, closePanel, recordTap,
    }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemoContext() {
  const ctx = useContext(DemoContext)
  if (!ctx) {
    return {
      enabled: false, panelOpen: false, scene: null as string | null, resetKey: 0,
      activateScene: (_: string) => {}, clearScene: () => {}, togglePanel: () => {},
      openPanel: () => {}, closePanel: () => {}, recordTap: () => {},
    }
  }
  return ctx
}
