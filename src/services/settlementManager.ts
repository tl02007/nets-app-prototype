import { CircleExpense, CircleSettlement } from '../types/circle';

export class SettlementManager {
  /**
   * Calculate optimal settlements from expenses
   * Minimizes number of transactions needed
   */
  calculateSettlements(expenses: CircleExpense[], circleId: string): CircleSettlement[] {
    const balances = this.calculateBalances(expenses);
    const settlements: CircleSettlement[] = [];

    const debtors = Array.from(balances.entries())
      .filter(([_, balance]) => balance < 0)
      .map(([user, balance]) => ({ user, amount: Math.abs(balance) }));

    const creditors = Array.from(balances.entries())
      .filter(([_, balance]) => balance > 0)
      .map(([user, balance]) => ({ user, amount: balance }));

    // Greedy matching algorithm to minimize transactions
    for (const creditor of creditors) {
      for (const debtor of debtors) {
        if (debtor.amount <= 0) continue;

        const settleAmount = Math.min(creditor.amount, debtor.amount);

        settlements.push({
          id: `settlement-${Date.now()}-${Math.random()}`,
          circleId,
          from: debtor.user,
          to: creditor.user,
          amount: settleAmount,
          status: 'pending',
          createdAt: new Date(),
        });

        creditor.amount -= settleAmount;
        debtor.amount -= settleAmount;
      }
    }

    return settlements;
  }

  /**
   * Calculate how much each person owes/is owed
   */
  private calculateBalances(expenses: CircleExpense[]): Map<string, number> {
    const balances = new Map<string, number>();

    for (const expense of expenses) {
      if (!balances.has(expense.paidBy)) {
        balances.set(expense.paidBy, 0);
      }

      const perPersonShare = expense.amount / expense.splitAmong.length;
      balances.set(expense.paidBy, balances.get(expense.paidBy)! + expense.amount);

      for (const participant of expense.splitAmong) {
        if (!balances.has(participant)) {
          balances.set(participant, 0);
        }
        balances.set(participant, balances.get(participant)! - perPersonShare);
      }
    }

    return balances;
  }

  /**
   * Mark settlement as completed (after payment received)
   */
  markSettlementCompleted(settlement: CircleSettlement): void {
    settlement.status = 'completed';
  }
}
