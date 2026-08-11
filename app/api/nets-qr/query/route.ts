import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const NETS_QR_QUERY_URL = "https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/query"

function computeSignature(body: object, secretKey: string): string {
  const jsonStr = JSON.stringify(body)
  const hex = crypto.createHash("sha256").update(jsonStr + secretKey).digest("hex").toUpperCase()
  return Buffer.from(hex).toString("base64")
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { txn_retrieval_ref, frontend_timeout_status, _simulate_success } = body

  const apiKey = process.env.NETS_QR_API_KEY
  const projectId = process.env.NETS_QR_PROJECT_ID
  const secretKey = process.env.NETS_QR_SECRET_KEY

  // For mock refs, skip the real API entirely
  const isMockRef = typeof txn_retrieval_ref === "string" && txn_retrieval_ref.startsWith("mock-")

  if (!isMockRef && apiKey && projectId && !apiKey.includes("your_")) {
    const payload: Record<string, unknown> = { txn_retrieval_ref }
    if (frontend_timeout_status !== undefined) payload.frontend_timeout_status = frontend_timeout_status
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": apiKey,
      "project-id": projectId,
    }
    if (secretKey && !secretKey.includes("your_")) {
      headers["signature"] = computeSignature(payload, secretKey)
    }
    try {
      const res = await fetch(NETS_QR_QUERY_URL, { method: "POST", headers, body: JSON.stringify(payload) })
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      // Fall through to mock
    }
  }

  // Mock: _simulate_success flag triggers a confirmed payment (set by the prototype's "Simulate" button)
  if (_simulate_success) {
    return NextResponse.json({ response_code: "00", txn_status: 1, _mock: true })
  }

  // Mock: timeout query → treat as failed (so the UI shows the timeout screen)
  if (frontend_timeout_status === 1) {
    return NextResponse.json({ response_code: "68", txn_status: 0, _mock: true })
  }

  // Normal poll — still pending
  return NextResponse.json({ response_code: "09", txn_status: 0, _mock: true })
}
