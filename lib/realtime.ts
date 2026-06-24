// Real-time Subscriptions for NETS Circle
// Uses Supabase Realtime to push live updates to connected clients

import { supabase } from "./supabase"

export type RealtimeCallback<T> = (data: T) => void

export type SubscriptionUnsubscribe = () => void

/**
 * Subscribe to circle expense updates
 */
export function subscribeToCircleExpenses(
  circleId: string,
  callback: RealtimeCallback<any>
): SubscriptionUnsubscribe {
  const channel = supabase
    .channel(`circle-expenses:${circleId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "circle_expenses",
        filter: `circle_id=eq.${circleId}`,
      },
      (payload) => {
        callback({
          type: payload.eventType,
          expense: payload.new || payload.old,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to settlement status updates
 */
export function subscribeToSettlements(
  circleId: string,
  callback: RealtimeCallback<any>
): SubscriptionUnsubscribe {
  const channel = supabase
    .channel(`settlements:${circleId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "settlements",
        filter: `circle_id=eq.${circleId}`,
      },
      (payload) => {
        callback({
          type: "settlement_updated",
          settlement: payload.new,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to circle member balance updates
 */
export function subscribeToCircleMembers(
  circleId: string,
  callback: RealtimeCallback<any>
): SubscriptionUnsubscribe {
  const channel = supabase
    .channel(`circle-members:${circleId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "circle_members",
        filter: `circle_id=eq.${circleId}`,
      },
      (payload) => {
        callback({
          type: "member_updated",
          member: payload.new,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to payment notifications
 */
export function subscribeToPaymentLogs(
  settlementId: string,
  callback: RealtimeCallback<any>
): SubscriptionUnsubscribe {
  const channel = supabase
    .channel(`payment-logs:${settlementId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "payment_logs",
        filter: `settlement_id=eq.${settlementId}`,
      },
      (payload) => {
        callback({
          type: "payment_log",
          log: payload.new,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to all circle activity for a user
 */
export function subscribeToUserCircleActivity(
  userId: string,
  circleIds: string[],
  callback: RealtimeCallback<any>
): SubscriptionUnsubscribe {
  const unsubscribers: SubscriptionUnsubscribe[] = []

  for (const circleId of circleIds) {
    unsubscribers.push(
      subscribeToCircleExpenses(circleId, (data) =>
        callback({ source: "expense", circleId, ...data })
      )
    )
    unsubscribers.push(
      subscribeToSettlements(circleId, (data) =>
        callback({ source: "settlement", circleId, ...data })
      )
    )
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub())
  }
}
