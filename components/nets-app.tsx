"use client"

import { AnimatePresence, motion } from "motion/react"
import { CircleDataProvider } from "./circle-data-context"
import { NavProvider, useNav } from "./nav-context"
import { BottomNav } from "./bottom-nav"
import { SplashScreen } from "./screens/splash-screen"
import { HomeScreen } from "./screens/home-screen"
import { PayScreen } from "./screens/pay-screen"
import { HistoryScreen } from "./screens/history-screen"
import { ProfileScreen } from "./screens/profile-screen"
import { CircleScreen } from "./screens/circle-screen"
import { DemoProvider, useDemoContext } from "@/lib/demo-context"
import { DemoPanel } from "./demo-panel"

function ScreenRouter() {
  const { screen, circleView } = useNav()
  const { enabled, panelOpen, openPanel } = useDemoContext()

  // Hide bottom nav inside Circle sub-views (comfort/experience/confidence/detail/create/settle/reconcile)
  const circleSubView = screen === "circle" && circleView !== "list"
  const showBottomNav = screen !== "splash" && !circleSubView

  return (
    <div className="relative h-full w-full overflow-hidden bg-nets-page">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0"
        >
          {screen === "splash" && <SplashScreen />}
          {screen === "home" && <HomeScreen />}
          {screen === "pay" && <PayScreen />}
          {screen === "history" && <HistoryScreen />}
          {screen === "circle" && <CircleScreen />}
          {screen === "profile" && <ProfileScreen />}
        </motion.div>
      </AnimatePresence>

      {showBottomNav && <BottomNav />}

      {/* Demo mode floating trigger button */}
      {enabled && !panelOpen && (
        <button
          onClick={openPanel}
          className="absolute bottom-20 right-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-nets-navy/60 text-[10px] font-black text-white shadow-lg backdrop-blur-sm active:opacity-70"
          aria-label="Open demo panel"
        >
          D
        </button>
      )}

      {/* Demo panel overlay */}
      {enabled && <DemoPanel />}
    </div>
  )
}

export function NetsApp() {
  return (
    <DemoProvider>
      <CircleDataProvider>
        <NavProvider>
          <ScreenRouter />
        </NavProvider>
      </CircleDataProvider>
    </DemoProvider>
  )
}
