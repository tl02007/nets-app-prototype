export interface Circle {
  id: string;
  name: string;
  description: string;
  activityType: 'dining' | 'travel' | 'entertainment' | 'shopping' | 'other';
  participants: string[];
  createdBy: string;
  createdAt: Date;
  status: 'planning' | 'active' | 'completed';
  estimatedBudget?: number;
  actualSpend?: number;
  location?: string;
}

export interface CircleExpense {
  id: string;
  circleId: string;
  paidBy: string;
  amount: number;
  category: 'food' | 'transport' | 'entertainment' | 'shopping' | 'miscellaneous';
  description: string;
  timestamp: Date;
  splitAmong: string[];
}

export interface CircleConfidence {
  overallConfidence: 'high' | 'moderate' | 'low';
  individualAssessments: Map<string, IndividualConfidence>;
  reason: string;
  suggestedAlternatives?: ActivityAlternative[];
}

export interface IndividualConfidence {
  userId: string;
  affordabilityStatus: 'comfortable' | 'concerning';
  message: string;
  isRevealed: boolean; // Always false to other users
}

export interface ActivityAlternative {
  name: string;
  estimatedCost: number;
  confidenceImprovement: 'high' | 'moderate';
}

export interface CircleSettlement {
  id: string;
  circleId: string;
  from: string;
  to: string;
  amount: number;
  status: 'pending' | 'completed';
  createdAt: Date;
}

export interface CircleRecap {
  circleId: string;
  title: string;
  participants: number;
  totalSpend: number;
  expensesTracked: number;
  settlementStatus: 'pending' | 'completed';
  generatedAt: Date;
}
