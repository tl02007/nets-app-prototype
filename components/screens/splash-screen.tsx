"use client"

import { motion } from "motion/react"
import { ArrowRight, ShieldCheck, Users, QrCode } from "lucide-react"
import { useNav } from "../nav-context"
import { NetsLogo } from "../nets-logo"

export function SplashScreen() {
  const { go } = useNav()

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-nets-navy text-white">
      {/* soft brand glow accents */}
      <div className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-nets-blue/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-40 h-56 w-56 rounded-full bg-nets-red/30 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="rounded-3xl bg-white px-7 py-5 shadow-2xl"
        >
          <NetsLogo className="text-4xl" />
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-8 text-balance text-3xl font-extrabold leading-tight"
        >
          Pay Smart.
          <br />
          Live Easy.
        </motion.h1>
        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-3 max-w-[15rem] text-pretty text-sm text-white/70"
        >
          Singapore&apos;s everyday payments, now built for the way you spend with friends.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex w-full max-w-xs flex-col gap-3"
        >
          {[
            { icon: QrCode, text: "Scan & pay at 130,000+ points" },
            { icon: Users, text: "Split group outings with NETS Circle" },
            { icon: ShieldCheck, text: "Bank-grade security & Kill Switch" },
          ].map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left backdrop-blur"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </span>
                <span className="text-sm font-medium text-white/90">{f.text}</span>
              </div>
            )
          })}
        </motion.div>
      </div>

      <div className="relative px-8 pb-10">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => go("home")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nets-red py-4 text-base font-bold text-white shadow-lg shadow-nets-red/30"
        >
          Get Started
          <ArrowRight className="h-5 w-5" />
        </motion.button>
        <p className="mt-4 text-center text-xs text-white/50">
          Prototype for NETS PayTech Hackathon
        </p>
      </div>
    </div>
  )
}
