"use client"

import { Signal, Wifi, BatteryMedium } from "lucide-react"
import { useDemoContext } from "@/lib/demo-context"

export function StatusBar({ dark = false }: { dark?: boolean }) {
  const tone = dark ? "text-white" : "text-black"
  const { recordTap } = useDemoContext()
  return (
    <div className={`flex items-center justify-between px-5 pt-3 pb-1 text-[13px] font-semibold ${tone}`}>
      {/* 5-tap on time label to unlock demo mode */}
      <span onClick={recordTap} className="select-none">19:09</span>
      <div className="flex items-center gap-1.5">
        <Signal className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <BatteryMedium className="h-4 w-4" />
      </div>
    </div>
  )
}
