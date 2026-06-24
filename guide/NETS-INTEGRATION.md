# NETS Gateway Payment Integration Guide

## Overview

NETS Circle integrates with **eNETS Gateway** (Singapore's leading payment gateway) using their **plugin-based hosted payment approach**. This provides a secure, PCI-compliant way to accept payments without handling sensitive card data directly.

## Integration Architecture

### Payment Flow

```
User Action (Settle Circle)
  ↓
POST /api/settlements (prepare payment)
  ↓
Generate txnReq + MAC signature
  ↓
Return payment initiation data to frontend
  ↓
Frontend submits form to NETS Gateway
  ↓
User completes payment on NETS portal
  ↓
NETS redirects to callback URL
  ↓
Verify MAC signature
  ↓
Update settlement status in Supabase
  ↓
Show receipt to user
```

### Key Components

1. **Transaction Request (txnReq)**: JSON payload containing payment details
   - Merchant ID
   - Transaction amount (in cents)
   - Merchant transaction reference
   - Callback URLs
   - Payment mode (Credit Card, Debit, QR, etc.)

2. **MAC Signature**: HMAC-SHA256(txnReq + secretKey)
   - Ensures transaction integrity
   - Prevents tampering

3. **Callback Handlers**:
   - **S2S** (Server-to-Server): Direct NETS → Your Server (most reliable)
   - **B2S** (Browser-to-Server): User browser → Your Server (backup)

## Configuration

### 1. Get NETS Credentials

1. Register at [NETS Portal](https://www.nets.com.sg)
2. Create merchant account
3. Download credentials from Admin Portal:
   - **Merchant ID** (format: UMID_xxxxxxxxxx)
   - **Secret Key** (used for MAC generation)
   - **API Key** (if using API endpoints)

### 2. Set Environment Variables

```env
# .env.local
NETS_MERCHANT_ID=UMID_xxxxxxxxxx
NETS_SECRET_KEY=your-secret-key-from-portal
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # For production
```

### 3. Configure Callback URLs

In NETS Admin Portal, set callback URLs:

```
B2S URL: https://yourdomain.com/api/settlements/[settlementId]/callback/b2s
S2S URL: https://yourdomain.com/api/settlements/[settlementId]/callback/s2s
```

For local development, use [ngrok](https://ngrok.com) to expose localhost:

```bash
ngrok http 3000
# Use provided URL like https://abcd-1-2-3-4.ngrok.io
```

## API Endpoints

### 1. Create Settlement & Prepare Payment

**Request:**
```bash
POST /api/settlements
Content-Type: application/json

{
  "settlementId": "settlement-123456789"
}
```

**Response:**
```json
{
  "success": true,
  "settlementId": "settlement-123456789",
  "paymentInitiation": {
    "txnReq": "{\"ss\":\"1\",\"msg\":{...}}",
    "mac": "ABC123DEF456...",
    "keyId": "UMID_xxxxxxxxxx",
    "gatewayUrl": "https://uat2.enets.sg/GW2/netsdirect.aspx",
    "settlement": {
      "id": "settlement-123456789",
      "fromMemberId": "alex",
      "toMemberId": "bryan",
      "amount": 25.50
    }
  }
}
```

### 2. Submit Payment to NETS

Frontend must submit HTML form to NETS Gateway:

```html
<form id="netsForm" method="POST" action="https://uat2.enets.sg/GW2/netsdirect.aspx">
  <input type="hidden" name="txnReq" value="...">
  <input type="hidden" name="mac" value="...">
  <input type="hidden" name="keyId" value="...">
</form>

<script>
  // User clicks "Pay Now" button
  document.getElementById('netsForm').submit();
</script>
```

### 3. Check Settlement Status

**Request:**
```bash
GET /api/settlements/settlement-123456789/status
```

**Response:**
```json
{
  "settlementId": "settlement-123456789",
  "status": "completed",
  "amount": 25.50,
  "netsTransactionId": "20260623170826664",
  "completedAt": "2026-06-23T17:08:27Z",
  "createdAt": "2026-06-23T17:06:50Z"
}
```

## NETS Transaction Response Format

When user completes payment, NETS returns:

```json
{
  "ss": "1",
  "msg": {
    "netsMid": "UMID_xxxxxxxxxx",
    "netsTxnRef": "20260623170826664",
    "netsTxnDtm": "2026-06-23 17:08:27.000",
    "netsTxnStatus": "0",
    "netsTxnMsg": "Approval",
    "netsAmountDeducted": "2550",
    "merchantTxnRef": "settlement-123456789",
    "paymentMode": "CC",
    "maskPan": "4111XXXXXXXX1111",
    "bankAuthId": "014089"
  }
}
```

**Status Codes:**
- `"0"` = Success (Approval)
- Other = Declined/Failed

## Payment Modes Supported

| Mode | Type | Example |
|------|------|---------|
| `"CC"` | Credit Card | Visa, Mastercard, AmEx |
| `"DD"` | NETS Debit | NETS Debit Card |
| `"QR"` | QR Code | PayLah, PayAnyOne, Mighty |
| `"OD"` | Online Banking | DBS, UOB, OCBC |
| `""` | All Methods | Leave empty for all options |

## MAC Signature Verification

All responses from NETS include a MAC header that must be verified:

```typescript
import { verifyNetsMac } from "@/lib/nets-integration"

// In callback handler
const txnRes = request.body
const macFromNets = request.headers.get('hmac')
const isValid = verifyNetsMac(txnRes, macFromNets, NETS_SECRET_KEY)

if (!isValid) {
  console.error('MAC verification failed - potential tampering')
  return 401 // Reject
}
```

## Error Handling

### Common Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | Successful | Update settlement to "completed" |
| `5001` | Invalid request | Check txnReq format |
| `5002` | Merchant not found | Verify NETS_MERCHANT_ID |
| `5010` | Transaction declined | User cancelled or card declined |
| Other | Various errors | Log and retry or contact support |

### Retry Strategy

For failed settlements:
1. Keep status as `"pending"` or `"failed"`
2. Allow user to retry payment
3. Use same `merchantTxnRef` for idempotency
4. Log all NETS responses for debugging

## Testing

### Sandbox Environment

Use **UAT** credentials for testing:

```env
NETS_MERCHANT_ID=UMID_887770001  # Test merchant
NETS_SECRET_KEY=f49015ce-84fd-4e9a-a24e-8aeb30d870d6  # Test secret
```

Gateway URL: `https://uat2.enets.sg/GW2/netsdirect.aspx`

### Test Cards

| Card | Number | CVV | Expiry |
|------|--------|-----|--------|
| Visa | 4111 1111 1111 1111 | 123 | Any future |
| Mastercard | 5555 5555 5555 4444 | 123 | Any future |
| NETS Debit | 6226 0200 0000 0008 | 123 | Any future |

### QR Testing

For QR payments, NETS will generate a QR code on their payment page. Use:
- DBS PayLah app
- OCBC PayAnyOne app
- UOB Mighty app

## Production Checklist

- [ ] Register production NETS merchant account
- [ ] Obtain production credentials
- [ ] Update `.env.local` with production values
- [ ] Configure production callback URLs (no ngrok)
- [ ] Test end-to-end payment flow
- [ ] Set up payment receipt emails
- [ ] Configure payment failure notifications
- [ ] Enable Supabase RLS policies
- [ ] Set up payment logging/audit trail
- [ ] Document settlement dispute handling
- [ ] Test webhook retries and timeouts

## Database Schema

### settlements table

```sql
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  circle_id TEXT REFERENCES circles(id),
  from_member_id TEXT NOT NULL,
  to_member_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  nets_transaction_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
)
```

### payment_logs table

```sql
CREATE TABLE payment_logs (
  id TEXT PRIMARY KEY,
  settlement_id TEXT REFERENCES settlements(id),
  status TEXT,
  nets_response JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## Troubleshooting

### MAC Verification Failed

```
Error: "signature not matched"
```

**Solutions:**
1. Verify `NETS_SECRET_KEY` is correct
2. Check that response body hasn't been modified
3. Ensure UTF-8 encoding is used
4. Remove any CR/LF characters from JSON

### Settlement Not Updating

**Check:**
1. Verify callback URL is reachable
2. Check S2S callback logs in NETS portal
3. Ensure Supabase RLS policies allow updates
4. Check settlement ID matches in database

### Frontend Form Not Submitting

**Check:**
1. Verify `txnReq` and `mac` are not empty
2. Confirm NETS Gateway URL is correct (test vs production)
3. Check browser console for CORS errors
4. Test with ngrok for local development

## Support & Resources

- **NETS Documentation**: https://www.nets.com.sg/developers
- **NETS Support**: support@nets.com.sg
- **API Documentation**: Available in NETS Admin Portal
- **Test Merchant**: Use UMID_887770001 for testing
