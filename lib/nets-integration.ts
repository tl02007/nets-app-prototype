// NETS Payment Integration via Gateway Plugin
// Implements NETS hosted payment flow with MAC signature verification
// Based on NETS eNETS Gateway documentation for Web Browser and QR flows

import crypto from "crypto"

export interface NetsTransactionRequest {
  netsMid: string // NETS Merchant ID
  merchantTxnRef: string // Unique merchant transaction reference
  merchantTxnDtm: string // Merchant transaction datetime (format: "YYYYMMDD HH:mm:ss.SSS")
  txnAmount: string // Amount in cents (as string)
  b2sTxnEndURL: string // Browser-to-Server callback URL
  s2sTxnEndURL: string // Server-to-Server callback URL
  paymentMode?: string // Empty for all methods, or specific: "CC", "DD", "QR"
  currencyCode?: string // Default "SGD"
  clientType?: string // Default "W" (Web)
  submissionMode?: string // Default "B" (Browser)
  paymentType?: string // Default "SALE"
  merchantTimeZone?: string // Default "+8:00"
  netsMidIndicator?: string // Default "U" (User)
  language?: string // Default "en"
}

export interface NetsTransactionResponse {
  ss: string // Status (always "1")
  msg: {
    netsMid: string
    netsTxnRef: string
    netsTxnDtm: string
    netsTxnStatus: string // "0" = success, other = failure
    netsTxnMsg: string // "Approval", "Declined", etc.
    netsAmountDeducted: string
    merchantTxnRef: string
    paymentMode: string // "CC", "DD", "QR", etc.
    [key: string]: string | number
  }
}

/**
 * Generate MAC (HMAC-SHA256) signature for NETS transaction
 */
export function generateNetsMac(txnReq: string, secretKey: string): string {
  const concatenated = txnReq + secretKey
  const hash = crypto
    .createHash("sha256")
    .update(concatenated, "utf8")
    .digest("base64")
  return hash
}

/**
 * Verify MAC received from NETS
 */
export function verifyNetsMac(
  txnRes: string,
  receivedMac: string,
  secretKey: string
): boolean {
  const generatedMac = generateNetsMac(txnRes, secretKey)
  return generatedMac.toLowerCase() === receivedMac.toLowerCase()
}

/**
 * Format NETS timestamp (YYYYMMDD HH:mm:ss.SSS)
 */
export function formatNetsTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const ms = String(date.getMilliseconds()).padStart(3, "0")

  return `${year}${month}${day} ${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * Create a NETS transaction request for hosted payment
 * Returns JSON string to be embedded in HTML form for submission to NETS Gateway
 */
export function createNetsTransactionRequest(options: {
  netsMid: string // Your NETS Merchant ID
  merchantTxnRef: string // Unique transaction reference
  txnAmount: number // Amount in SGD (will convert to cents)
  b2sTxnEndURL: string // Callback URL for browser response
  s2sTxnEndURL: string // Callback URL for server-to-server response
  paymentMode?: string // Empty, "CC", "DD", or "QR"
  currencyCode?: string // Default "SGD"
  clientType?: string // Default "W"
  submissionMode?: string // Default "B"
  paymentType?: string // Default "SALE"
  merchantTimeZone?: string // Default "+8:00"
  netsMidIndicator?: string // Default "U"
  language?: string // Default "en"
}): string {
  const merchantTxnDtm = formatNetsTimestamp()

  const msg = {
    netsMid: options.netsMid,
    tid: "",
    submissionMode: options.submissionMode || "B",
    txnAmount: String(Math.round(options.txnAmount * 100)), // Convert to cents
    merchantTxnRef: options.merchantTxnRef,
    merchantTxnDtm,
    paymentType: options.paymentType || "SALE",
    currencyCode: options.currencyCode || "SGD",
    paymentMode: options.paymentMode || "",
    merchantTimeZone: options.merchantTimeZone || "+8:00",
    b2sTxnEndURL: options.b2sTxnEndURL,
    b2sTxnEndURLParam: "",
    s2sTxnEndURL: options.s2sTxnEndURL,
    s2sTxnEndURLParam: "",
    clientType: options.clientType || "W",
    supMsg: "",
    netsMidIndicator: options.netsMidIndicator || "U",
    ipAddress: "127.0.0.1",
    language: options.language || "en",
  }

  const txnReq = {
    ss: "1",
    msg,
  }

  // Return as JSON string without CR/LF
  return JSON.stringify(txnReq)
}

/**
 * Parse and validate a NETS transaction response
 */
export function parseNetsTransactionResponse(
  txnResJson: string
): NetsTransactionResponse | null {
  try {
    const parsed = JSON.parse(txnResJson)
    if (parsed.ss === "1" && parsed.msg) {
      return parsed as NetsTransactionResponse
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check if transaction was successful
 */
export function isNetsTransactionSuccessful(
  txnRes: NetsTransactionResponse
): boolean {
  return txnRes.msg.netsTxnStatus === "0"
}

/**
 * Get payment gateway URL based on environment
 */
export function getNetsGatewayUrl(environment: "production" | "sandbox" = "sandbox"): string {
  if (environment === "production") {
    return "https://www.enets.sg/GW2/netsdirect.aspx"
  }
  return "https://uat2.enets.sg/GW2/netsdirect.aspx"
}

/**
 * Get NETS JS plugin URL based on environment
 */
export function getNetsPluginUrl(environment: "production" | "sandbox" = "sandbox"): string {
  if (environment === "production") {
    return "https://www.enets.sg/GW2/js/apps.js"
  }
  return "https://uat2.enets.sg/GW2/js/apps.js"
}
