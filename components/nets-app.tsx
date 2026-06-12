"use client"

import { AnimatePresence, motion } from "motion/react"
import { NavProvider, useNav } from "./nav-context"
import { BottomNav } from "./bottom-nav"
import { SplashScreen } from "./screens/splash-screen"
import { HomeScreen } from "./screens/home-screen"
import { PayScreen } from "./screens/pay-screen"
import { HistoryScreen } from "./screens/history-screen"
import { ProfileScreen } from "./screens/profile-screen"
import { CircleScreen } from "./screens/circle-screen"

function ScreenRouter() {
  const { screen, circleView } = useNav()

  // Hide bottom nav inside Circle sub-views (confidence/detail/create/settle/recap)
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
    </div>
  )
}

export function NetsApp() {
  return (
    <NavProvider>
      <ScreenRouter />
    </NavProvider>
  )
}
