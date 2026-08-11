import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const NETS_QR_URL = "https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/request"

function computeSignature(body: object, secretKey: string): string {
  const jsonStr = JSON.stringify(body)
  const hex = crypto.createHash("sha256").update(jsonStr + secretKey).digest("hex").toUpperCase()
  return Buffer.from(hex).toString("base64")
}

// Generates a deterministic QR-pattern SVG (21×21 modules, NETS navy on white)
// encoded as a base64 data URL so the component can use it as <img src>
function generateMockQrDataUrl(): string {
  const cell = 10
  const size = 21
  const rects: string[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Replicate the finder-pattern corners + pseudo-random interior
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
      const on = finder ? true : (x * 13 + y * 7 + ((x * y) % 5)) % 3 === 0
      if (on) rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#0a1e3c"/>`)
    }
  }
  const dim = size * cell
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" style="background:white">${rects.join("")}</svg>`
  const b64 = Buffer.from(svg).toString("base64")
  return `data:image/svg+xml;base64,${b64}`
}

function mockRef() {
  return `mock-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { txn_id, amt_in_dollars, notify_mobile } = body

  const apiKey = process.env.NETS_QR_API_KEY
  const projectId = process.env.NETS_QR_PROJECT_ID
  const secretKey = process.env.NETS_QR_SECRET_KEY

  // Attempt real NETS sandbox if credentials look configured
  if (apiKey && projectId && !apiKey.includes("your_")) {
    const payload = { txn_id, amt_in_dollars, notify_mobile }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": apiKey,
      "project-id": projectId,
    }
    if (secretKey && !secretKey.includes("your_")) {
      headers["signature"] = computeSignature(payload, secretKey)
    }
    try {
      const res = await fetch(NETS_QR_URL, { method: "POST", headers, body: JSON.stringify(payload) })
      const data = await res.json()
      // Real credentials succeeded — return as-is
      if (data.response_code === "00" || data.response_code === "09") {
        return NextResponse.json(data)
      }
    } catch {
      // Fall through to mock
    }
  }

  // Mock response — simulates NETS QR "request in progress" (response_code 09)
  return NextResponse.json({
    response_code: "09",
    txn_status: 0,
    qr_code: generateMockQrDataUrl(),
    txn_retrieval_ref: mockRef(),
    _mock: true,
  })
}
