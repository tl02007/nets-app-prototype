"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Check, Clock, Loader2, QrCode, RefreshCw, Smartphone, X } from "lucide-react"

type QrState = "loading" | "qr" | "success" | "failed" | "timeout" | "error"

interface Props {
  amount: number       // in dollars (e.g. 12.50)
  label?: string       // subtitle shown above QR
  onSuccess: () => void
  onCancel: () => void
}

const TIMEOUT_SECS = 300          // 5-minute NETS QR expiry
const POLL_INTERVAL_MS = 3000     // poll query API every 3 s

function makeTxnId(): string {
  const r = () => Math.random().toString(36).slice(2, 10)
  return `sandbox_nets|m|${r()}-${r()}-${r()}`
}

export function NetsQrPayment({ amount, label, onSuccess, onCancel }: Props) {
  const [state, setState] = useState<QrState>("loading")
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECS)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const txnRefRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const handleSuccess = useCallback(() => {
    clearTimers()
    setState("success")
    setTimeout(onSuccess, 1800)
  }, [clearTimers, onSuccess])

  const pollStatus = useCallback(
    async (ref: string, isTimeoutCall = false) => {
      try {
        const res = await fetch("/api/nets-qr/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txn_retrieval_ref: ref,
            ...(isTimeoutCall && { frontend_timeout_status: 1 }),
          }),
        })
        const data = await res.json()
        if (data.response_code === "00" && data.txn_status === 1) {
          handleSuccess()
        } else if (isTimeoutCall) {
          clearTimers()
          setState("timeout")
        }
      } catch {
        if (isTimeoutCall) { clearTimers(); setState("timeout") }
      }
    },
    [clearTimers, handleSuccess]
  )

  const startCountdown = useCallback(
    (ref: string) => {
      txnRefRef.current = ref
      let secs = TIMEOUT_SECS

      timerRef.current = setInterval(() => {
        secs -= 1
        setSecondsLeft(secs)
        if (secs <= 0) {
          clearTimers()
          pollStatus(ref, true)
        }
      }, 1000)

      pollRef.current = setInterval(() => {
        if (txnRefRef.current) pollStatus(txnRefRef.current)
      }, POLL_INTERVAL_MS)
    },
    [clearTimers, pollStatus]
  )

  const requestQr = useCallback(async () => {
    clearTimers()
    setState("loading")
    setErrorMsg(null)
    setSecondsLeft(TIMEOUT_SECS)

    try {
      const res = await fetch("/api/nets-qr/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txn_id: makeTxnId(),
          amt_in_dollars: amount,
          notify_mobile: "90000000",
        }),
      })
      const data = await res.json()

      if (data.response_code === "00" && data.txn_status === 1) {
        setState("success")
        setTimeout(onSuccess, 1800)
        return
      }
      if (data.response_code === "00" || data.response_code === "09") {
        setQrImage(data.qr_code)
        setIsMock(!!data._mock)
        setState("qr")
        startCountdown(data.txn_retrieval_ref)
        return
      }

      const CODE_MESSAGES: Record<string, string> = {
        "63": "Invalid signature — verify NETS_QR_SECRET_KEY",
        "68": "Request timed out — try again",
        "94": "Transaction ID already used",
        "96": "Invalid order state",
        "99": "NETS system error — try again shortly",
      }
      setErrorMsg(CODE_MESSAGES[data.response_code] ?? `NETS error ${data.response_code ?? "unknown"}`)
      setState("error")
    } catch {
      setErrorMsg("Could not connect to NETS gateway")
      setState("error")
    }
  }, [amount, clearTimers, onSuccess, startCountdown])

  useEffect(() => {
    requestQr()
    return clearTimers
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Demo helper: simulate a successful scan without real bank app
  const simulateScan = useCallback(async () => {
    if (!txnRefRef.current) return
    try {
      const res = await fetch("/api/nets-qr/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_retrieval_ref: txnRefRef.current, _simulate_success: true }),
      })
      const data = await res.json()
      if (data.response_code === "00" && data.txn_status === 1) handleSuccess()
    } catch {}
  }, [handleSuccess])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const expirySoon = secondsLeft < 60

  // The qr_code field from NETS is a base64 PNG; our mock returns a full data: URL for SVG
  const imgSrc = qrImage
    ? qrImage.startsWith("data:") ? qrImage : `data:image/png;base64,${qrImage}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white px-6"
    >
      {state !== "success" && (
        <button
          onClick={() => { clearTimers(); onCancel() }}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:opacity-70"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <AnimatePresence mode="wait">
        {state === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-nets-red" />
            <p className="text-sm font-semibold text-nets-navy">Generating NETS QR…</p>
          </motion.div>
        )}

        {state === "qr" && imgSrc && (
          <motion.div key="qr" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center">
            <div className="mb-1 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-nets-red" />
              <span className="text-sm font-bold text-nets-navy">NETS QR Payment</span>
            </div>
            {label && <p className="mb-3 text-xs text-muted-foreground">{label}</p>}

            <div className={`rounded-2xl border-2 bg-white p-3 shadow-lg transition-colors ${expirySoon ? "border-nets-red" : "border-nets-red/20"}`}>
              <img
                src={imgSrc}
                alt="NETS QR Code — scan with your bank app"
                className="h-52 w-52 object-contain"
              />
            </div>

            <div className={`mt-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${expirySoon ? "bg-nets-red/20" : "bg-nets-red/10"}`}>
              <Clock className={`h-3.5 w-3.5 text-nets-red ${expirySoon ? "animate-pulse" : ""}`} />
              <span className="text-xs font-bold tabular-nums text-nets-red">
                {expirySoon ? "Expiring — " : ""}{mins}:{secs.toString().padStart(2, "0")}
              </span>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Scan with your bank app to pay <span className="font-bold text-nets-navy">${amount.toFixed(2)}</span>
            </p>

            {/* Demo-only simulate button — only shown for mock QRs */}
            {isMock && (
              <button
                onClick={simulateScan}
                className="mt-5 flex items-center gap-2 rounded-full border border-nets-navy/20 bg-nets-navy/5 px-4 py-2 text-xs font-semibold text-nets-navy active:opacity-70"
              >
                <Smartphone className="h-3.5 w-3.5" /> Simulate Payment (demo)
              </button>
            )}
          </motion.div>
        )}

        {state === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-nets-green"
            >
              <Check className="h-10 w-10 text-white" />
            </motion.span>
            <p className="text-lg font-extrabold text-nets-navy">Payment Confirmed!</p>
            <p className="text-sm text-muted-foreground">${amount.toFixed(2)} settled via NETS QR</p>
          </motion.div>
        )}

        {(state === "timeout" || state === "failed" || state === "error") && (
          <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-nets-red/10">
              <X className="h-8 w-8 text-nets-red" />
            </span>
            <p className="text-base font-bold text-nets-navy">
              {state === "timeout" ? "QR Code Expired" : "Payment Failed"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {state === "timeout"
                ? "The 5-minute QR window has expired. Generate a new code to try again."
                : errorMsg ?? "Something went wrong. Please try again."}
            </p>
            <button onClick={requestQr}
              className="flex items-center gap-2 rounded-full bg-nets-red px-5 py-2.5 text-sm font-bold text-white active:opacity-80">
              <RefreshCw className="h-4 w-4" /> Generate New QR
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
