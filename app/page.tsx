import { NetsApp } from "@/components/nets-app"

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-nets-navy-deep p-0 sm:p-6">
      {/* Phone frame for desktop; full screen on mobile */}
      <div className="relative h-[100dvh] w-full max-w-[420px] overflow-hidden bg-nets-page sm:h-[860px] sm:max-h-[90vh] sm:rounded-[2.75rem] sm:border-8 sm:border-black sm:shadow-2xl">
        <NetsApp />
      </div>
    </main>
  )
}
