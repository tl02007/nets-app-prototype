// Example: NETS Payment Form Component
// Shows how to use the settlement API and submit payment to NETS Gateway

import { useRef, useState } from "react"

interface NetsPaymentInitiation {
  txnReq: string
  mac: string
  keyId: string
  gatewayUrl: string
}

export function NetsPaymentForm({
  settlementId,
  onSuccess,
  onError,
}: {
  settlementId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<NetsPaymentInitiation | null>(
    null
  )

  const handlePayment = async () => {
    try {
      setLoading(true)

      // Step 1: Call backend to prepare NETS payment
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId }),
      })

      if (!response.ok) {
        throw new Error("Failed to prepare payment")
      }

      const { paymentInitiation } = await response.json()
      setPaymentData(paymentInitiation)

      // Step 2: Auto-submit form to NETS Gateway
      setTimeout(() => {
        if (formRef.current) {
          console.log("Submitting to NETS Gateway...")
          formRef.current.submit()
        }
      }, 100)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment error"
      console.error(message)
      onError?.(message)
      setLoading(false)
    }
  }

  if (!paymentData) {
    return (
      <button
        onClick={handlePayment}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Preparing Payment..." : "Pay via NETS"}
      </button>
    )
  }

  // Hidden form that will be submitted to NETS Gateway
  return (
    <form
      ref={formRef}
      method="POST"
      action={paymentData.gatewayUrl}
      style={{ display: "none" }}
    >
      <input type="hidden" name="txnReq" value={paymentData.txnReq} />
      <input type="hidden" name="mac" value={paymentData.mac} />
      <input type="hidden" name="keyId" value={paymentData.keyId} />
    </form>
  )
}

/**
 * Hook to monitor settlement status after payment
 */
export function useSettlementStatus(settlementId: string) {
  const [status, setStatus] = useState<
    "pending" | "processing" | "completed" | "failed"
  >("pending")
  const [loading, setLoading] = useState(false)

  const checkStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/settlements/${settlementId}/status`)

      if (!response.ok) {
        throw new Error("Failed to check status")
      }

      const { status: newStatus } = await response.json()
      setStatus(newStatus)
      return newStatus
    } catch (error) {
      console.error("Status check error:", error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Poll status while processing
  const startPolling = () => {
    let pollCount = 0
    const maxPolls = 60 // 5 minutes at 5-second intervals

    const interval = setInterval(async () => {
      const newStatus = await checkStatus()
      pollCount++

      if (newStatus === "completed" || newStatus === "failed") {
        clearInterval(interval)
      } else if (pollCount >= maxPolls) {
        clearInterval(interval)
        console.warn("Polling timeout - settlement may still be processing")
      }
    }, 5000)

    return () => clearInterval(interval)
  }

  return { status, loading, checkStatus, startPolling }
}

/**
 * Example usage in Circle Settlement Flow
 */
export function CircleSettlementExample() {
  const settlementId = "settlement-example-123" // From URL params
  const { status, checkStatus, startPolling } = useSettlementStatus(settlementId)
  const [paymentInitiated, setPaymentInitiated] = useState(false)

  const handlePaymentComplete = () => {
    setPaymentInitiated(true)
    startPolling()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Settle Up</h2>

      {status === "pending" && !paymentInitiated && (
        <div>
          <p>Ready to settle? Click below to pay.</p>
          <NetsPaymentForm
            settlementId={settlementId}
            onSuccess={handlePaymentComplete}
            onError={(error) => console.error(error)}
          />
          <p className="text-sm text-gray-600 mt-2">
            You will be redirected to NETS payment gateway.
          </p>
        </div>
      )}

      {paymentInitiated && status === "processing" && (
        <div className="p-4 bg-yellow-50 rounded">
          <p className="text-yellow-800">Processing payment...</p>
          <button
            onClick={checkStatus}
            className="mt-2 text-sm underline"
          >
            Check Status
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="p-4 bg-green-50 rounded">
          <p className="text-green-800 font-semibold">✓ Payment Successful!</p>
          <p className="text-sm text-green-700 mt-1">
            Settlement has been completed.
          </p>
        </div>
      )}

      {status === "failed" && (
        <div className="p-4 bg-red-50 rounded">
          <p className="text-red-800 font-semibold">✗ Payment Failed</p>
          <p className="text-sm text-red-700 mt-1">
            Please try again or contact support.
          </p>
          <NetsPaymentForm
            settlementId={settlementId}
            onSuccess={handlePaymentComplete}
          />
        </div>
      )}
    </div>
  )
}
