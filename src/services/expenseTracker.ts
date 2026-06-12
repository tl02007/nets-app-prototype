import { CircleExpense } from '../types/circle';

export class ExpenseTracker {
  /**
   * Automatically detect and categorize transactions linked to a circle
   * Uses transaction history and merchant data
   */
  detectCircleExpenses(
    circleId: string,
    userId: string,
    transactions: any[]
  ): CircleExpense[] {
    const expenses: CircleExpense[] = [];

    for (const transaction of transactions) {
      const category = this.categorizeExpense(transaction.merchant, transaction.description);
      const participants = this.inferSplitParticipants(transaction, circleId);

      expenses.push({
        id: `${circleId}-${transaction.id}`,
        circleId,
        paidBy: userId,
        amount: transaction.amount,
        category,
        description: transaction.description,
        timestamp: transaction.timestamp,
        splitAmong: participants,
      });
    }

    return expenses;
  }

  /**
   * Categorize expenses based on merchant and description
   */
  private categorizeExpense(
    merchant: string,
    description: string
  ): 'food' | 'transport' | 'entertainment' | 'shopping' | 'miscellaneous' {
    const lowerMerchant = merchant.toLowerCase();
    const lowerDesc = description.toLowerCase();

    if (this.matchKeywords(lowerMerchant + ' ' + lowerDesc, ['restaurant', 'cafe', 'food', 'delivery', 'burger', 'pizza'])) {
      return 'food';
    }
    if (this.matchKeywords(lowerMerchant + ' ' + lowerDesc, ['grab', 'uber', 'taxi', 'bus', 'train', 'mrt'])) {
      return 'transport';
    }
    if (this.matchKeywords(lowerMerchant + ' ' + lowerDesc, ['cinema', 'concert', 'theatre', 'movie', 'game'])) {
      return 'entertainment';
    }
    if (this.matchKeywords(lowerMerchant + ' ' + lowerDesc, ['mall', 'store', 'shop', 'retail'])) {
      return 'shopping';
    }

    return 'miscellaneous';
  }

  /**
   * Infer who should be split with based on circle members and transaction context
   */
  private inferSplitParticipants(transaction: any, circleId: string): string[] {
    // Placeholder: integrate with circle members
    // Should analyze transaction size and type to infer equal split
    return []; // To be populated with circle participant IDs
  }

  private matchKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}
