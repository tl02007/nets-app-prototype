import { Circle, CircleExpense, CircleConfidence, IndividualConfidence, ActivityAlternative } from '../types/circle';

export class ConfidenceEngine {
  private userSpendingPatterns: Map<string, number[]> = new Map();

  /**
   * Assess individual affordability privately
   * Returns assessment visible only to that user
   */
  assessIndividualAffordability(
    userId: string,
    circle: Circle,
    estimatedCost: number
  ): IndividualConfidence {
    const userPattern = this.getUserSpendingPattern(userId, circle.activityType);
    const averageSpend = userPattern.length > 0 ? userPattern.reduce((a, b) => a + b) / userPattern.length : 0;
    const variance = this.calculateVariance(userPattern, averageSpend);

    const isComfortable = estimatedCost <= averageSpend + variance * 0.5;

    return {
      userId,
      affordabilityStatus: isComfortable ? 'comfortable' : 'concerning',
      message: isComfortable
        ? `This activity falls within your typical ${circle.activityType} spending range.`
        : `This activity may exceed your usual spending pattern.`,
      isRevealed: false, // Private to user
    };
  }

  /**
   * Calculate Circle Confidence without revealing individual finances
   */
  calculateCircleConfidence(
    circle: Circle,
    estimatedCost: number,
    individualAssessments: Map<string, IndividualConfidence>
  ): CircleConfidence {
    let concernedCount = 0;
    for (const assessment of individualAssessments.values()) {
      if (assessment.affordabilityStatus === 'concerning') {
        concernedCount++;
      }
    }

    const concernRatio = concernedCount / circle.participants.length;
    let confidence: 'high' | 'moderate' | 'low';
    let reason: string;

    if (concernRatio === 0) {
      confidence = 'high';
      reason = 'Most participants are likely comfortable with the expected spending.';
    } else if (concernRatio <= 0.33) {
      confidence = 'moderate';
      reason = 'Some participants may face affordability concerns. Consider a lower-cost option.';
    } else {
      confidence = 'low';
      reason = 'The activity may exceed the typical spending comfort range of several participants.';
    }

    return {
      overallConfidence: confidence,
      individualAssessments,
      reason,
      suggestedAlternatives: this.generateAlternatives(circle, estimatedCost),
    };
  }

  /**
   * Suggest lower-cost alternatives to improve participation
   */
  private generateAlternatives(circle: Circle, estimatedCost: number): ActivityAlternative[] {
    const alternatives: ActivityAlternative[] = [];

    if (circle.activityType === 'dining') {
      alternatives.push({
        name: 'Casual dining venue',
        estimatedCost: estimatedCost * 0.6,
        confidenceImprovement: 'high',
      });
    }

    if (circle.activityType === 'entertainment') {
      alternatives.push({
        name: 'Daytime activity',
        estimatedCost: estimatedCost * 0.5,
        confidenceImprovement: 'high',
      });
    }

    return alternatives;
  }

  private getUserSpendingPattern(userId: string, activityType: string): number[] {
    // Fetch from transaction history
    // This is a placeholder - integrate with actual transaction data
    return this.userSpendingPatterns.get(userId) || [];
  }

  private calculateVariance(data: number[], mean: number): number {
    if (data.length === 0) return 0;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }
}
