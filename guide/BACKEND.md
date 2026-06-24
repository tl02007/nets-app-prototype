# NETS Circle Backend Enhancements

## Overview

This document outlines the backend infrastructure added to support a fully functional NETS Circle experience with authentication, payment processing, expense intelligence, and real-time updates.

## Architecture

### 1. Authentication & Authorization (Row-Level Security)

**File**: `supabase-rls.sql`

Supabase RLS policies ensure users can only access:
- Their own profile
- Circles they're members of
- Expenses and settlements within those circles
- Transactions linked to their account

**Key tables**:
- `users`: User profiles (name, email, balance, tier, bank)
- `transactions`: Transaction history with auto-categorization
- `circles`: Group outing data
- `circle_members`: Group membership tracking
- `circle_expenses`: Shared expense records
- `settlements`: Settlement tracking (new)
- `payment_logs`: Payment audit trail (new)

### 2. NETS Payment Integration

**File**: `lib/nets-integration.ts`

Handles payment processing through NETS API:
- `initiateNetsPayment()`: Initiate direct peer-to-peer settlement
- `checkNetsPaymentStatus()`: Poll NETS for transaction status

**Configuration**:
```env
NETS_API_URL=https://api.nets.com.sg/api/v1
NETS_API_KEY=your-api-key
NETS_MERCHANT_ID=your-merchant-id
```

**Settlement Flow**:
1. User taps "Settle" on circle detail
2. System calculates who owes whom
3. Creates `Settlement` records with `status: "pending"`
4. Calls `POST /api/settlements/[id]/execute`
5. Initiates NETS payment via API
6. Updates settlement status to `"processing"`
7. NETS webhook confirms completion → `status: "completed"`

### 3. Expense Intelligence & Auto-Detection

**File**: `lib/expense-intelligence.ts`

Automatically suggests which transactions belong to which circles:
- `categorizeTransaction()`: Maps merchant to expense category
- `matchTransactionToCircle()`: Finds circles matching transaction amount and type
- `inferExpenseSplitParticipants()`: Suggests who should split the expense

**Confidence Scoring**:
- **High**: Amount ≈ estimated cost per person, matching activity type
- **Medium**: Related category to activity type
- **Low**: Amount or category mismatch

### 4. API Routes

#### `POST /api/settlements`
Create settlements for a circle.

**Request**:
```json
{ "circleId": "c1" }
```

**Response**:
```json
{
  "success": true,
  "circleId": "c1",
  "settlements": ["settlement-123", "settlement-456"],
  "count": 2
}
```

#### `POST /api/settlements/[id]/execute`
Execute a single settlement payment via NETS.

**Response**:
```json
{
  "success": true,
  "settlementId": "settlement-123",
  "transactionId": "nets-txn-456",
  "status": "processing"
}
```

#### `GET /api/settlements/[id]/status`
Check settlement payment status.

**Response**:
```json
{
  "settlementId": "settlement-123",
  "status": "completed",
  "completedAt": "2026-06-23T14:30:00Z"
}
```

#### `POST /api/transactions/analyze`
Analyze user transactions for circle expense suggestions.

**Request**:
```json
{ "userId": "alex" }
```

**Response**:
```json
{
  "userId": "alex",
  "suggestionsCount": 3,
  "suggestions": [
    {
      "transactionId": "t1",
      "merchant": "Kopitiam @ Tampines",
      "amount": 8.4,
      "date": "2026-06-23",
      "matches": [
        {
          "circleId": "c1",
          "confidence": "high",
          "category": "Food & Drink"
        }
      ]
    }
  ]
}
```

#### `PUT /api/transactions/analyze` (add to circle)
Add a transaction as an expense to a circle.

**Request**:
```json
{
  "transactionId": "t1",
  "circleId": "c1",
  "paidById": "alex",
  "category": "Food & Drink"
}
```

**Response**:
```json
{
  "success": true,
  "expenseId": "exp-123",
  "circleId": "c1",
  "amount": 8.4
}
```

### 5. Real-time Features

**File**: `lib/realtime.ts`

Supabase Realtime subscriptions keep UI synchronized:
- `subscribeToCircleExpenses()`: Live expense updates
- `subscribeToSettlements()`: Live settlement status
- `subscribeToPaymentLogs()`: Live payment notifications
- `subscribeToUserCircleActivity()`: Aggregated circle activity

**Usage Example**:
```typescript
import { subscribeToCircleExpenses } from "@/lib/realtime"

const unsubscribe = subscribeToCircleExpenses("c1", (data) => {
  if (data.type === "INSERT") {
    console.log("New expense:", data.expense)
  }
})

// Cleanup
unsubscribe()
```

## Settlement Calculation Algorithm

Settlements use a minimal-transfer algorithm to reduce payment count:

1. Calculate per-head split: `total_expenses / member_count`
2. For each member, compute net balance: `paid - per_head_share`
3. Separate members into debtors (negative) and creditors (positive)
4. Match debtor balances with creditor balances minimally

**Example**:
- Alex paid $100, owes $80 per person → net +$20
- Bryan paid $40, owes $80 per person → net -$40
- Cheryl paid $60, owes $80 per person → net -$20
- Result: Bryan pays Alex $40, Cheryl pays Alex $20

## Data Flow

```
Transaction (auto-categorized)
  ↓
Transaction Analysis API → Suggests circles
  ↓
User confirms → Add to circle_expenses
  ↓
Real-time update → UI shows expense
  ↓
User taps "Settle" → Calculate settlements
  ↓
Settlement API creates records (pending)
  ↓
User executes settlement → NETS payment initiated
  ↓
Real-time notification → Settlement status updates
  ↓
NETS webhook callback → Mark completed
  ↓
Real-time update → UI shows receipt
```

## Environment Setup

1. **Supabase**:
   - Create new project at supabase.com
   - Run `supabase-schema.sql` to create tables
   - Run `supabase-rls.sql` to enable RLS policies
   - Copy API URL and anon key

2. **NETS Integration**:
   - Get sandbox API credentials from NETS
   - Add to `.env.local`:
     ```env
     NETS_API_URL=https://sandbox.nets.com.sg/api/v1
     NETS_API_KEY=your-sandbox-key
     NETS_MERCHANT_ID=your-sandbox-id
     ```

3. **Local Development**:
   ```bash
   npm run dev
   ```

## Testing the Flow

1. **View settlements**:
   ```bash
   curl http://localhost:3000/api/settlements?circleId=c1
   ```

2. **Analyze transactions**:
   ```bash
   curl -X POST http://localhost:3000/api/transactions/analyze \
     -H "Content-Type: application/json" \
     -d '{"userId":"alex"}'
   ```

3. **Execute settlement** (in browser):
   - Navigate to Circle detail
   - Tap "Settle up"
   - Confirm payment via NETS

## Next Steps

- [ ] Add Supabase Auth integration for user sign-up/login
- [ ] Implement NETS webhook handler for payment confirmations
- [ ] Add payment failure retry logic
- [ ] Integrate transaction feeds from actual NETS transactions
- [ ] Add push notifications for settlement reminders
- [ ] Implement dispute resolution for incorrect settlements
