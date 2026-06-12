import { Circle, CircleConfidence, CircleRecap, CircleExpense, CircleSettlement } from '../types/circle';
import { ConfidenceEngine } from './confidenceEngine';
import { ExpenseTracker } from './expenseTracker';
import { SettlementManager } from './settlementManager';

export class CircleService {
  private confidenceEngine = new ConfidenceEngine();
  private expenseTracker = new ExpenseTracker();
  private settlementManager = new SettlementManager();
  private circles: Map<string, Circle> = new Map();
  private expenses: Map<string, CircleExpense[]> = new Map();
  private settlements: Map<string, CircleSettlement[]> = new Map();

  /**
   * Create a new circle
   */
  createCircle(circle: Circle): Circle {
    this.circles.set(circle.id, circle);
    this.expenses.set(circle.id, []);
    this.settlements.set(circle.id, []);
    return circle;
  }

  /**
   * Get circle with confidence assessment
   * Each user sees only their private affordability assessment
   */
  getCircleWithConfidence(circleId: string, requestingUserId: string, estimatedCost: number): {
    circle: Circle;
    myAffordability: any;
    circleConfidence: CircleConfidence;
  } {
    const circle = this.circles.get(circleId);
    if (!circle) throw new Error('Circle not found');

    const individualAssessments = new Map();

    for (const participant of circle.participants) {
      const assessment = this.confidenceEngine.assessIndividualAffordability(participant, circle, estimatedCost);
      individualAssessments.set(participant, assessment);
    }

    const circleConfidence = this.confidenceEngine.calculateCircleConfidence(
      circle,
      estimatedCost,
      individualAssessments
    );

    return {
      circle,
      myAffordability: individualAssessments.get(requestingUserId),
      circleConfidence,
    };
  }

  /**
   * Link and track expenses for a circle
   */
  linkExpenses(circleId: string, userId: string, transactions: any[]): CircleExpense[] {
    const newExpenses = this.expenseTracker.detectCircleExpenses(circleId, userId, transactions);
    const existing = this.expenses.get(circleId) || [];
    this.expenses.set(circleId, [...existing, ...newExpenses]);

    // Auto-calculate settlements
    const settlements = this.settlementManager.calculateSettlements(this.expenses.get(circleId)!, circleId);
    this.settlements.set(circleId, settlements);

    return newExpenses;
  }

  /**
   * Get circle settlement status
   */
  getSettlements(circleId: string): CircleSettlement[] {
    return this.settlements.get(circleId) || [];
  }

  /**
   * Complete a settlement
   */
  completeSettlement(settlementId: string): void {
    for (const settlements of this.settlements.values()) {
      const settlement = settlements.find((s) => s.id === settlementId);
      if (settlement) {
        this.settlementManager.markSettlementCompleted(settlement);
        break;
      }
    }
  }

  /**
   * Generate circle recap after activity completion
   */
  generateRecap(circleId: string): CircleRecap {
    const circle = this.circles.get(circleId);
    const expenses = this.expenses.get(circleId) || [];
    const settlements = this.settlements.get(circleId) || [];

    if (!circle) throw new Error('Circle not found');

    const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const completedSettlements = settlements.filter((s) => s.status === 'completed').length;

    return {
      circleId,
      title: circle.name,
      participants: circle.participants.length,
      totalSpend,
      expensesTracked: expenses.length,
      settlementStatus: completedSettlements === settlements.length ? 'completed' : 'pending',
      generatedAt: new Date(),
    };
  }
}
