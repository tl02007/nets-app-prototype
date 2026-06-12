import React, { useState } from 'react';
import { CircleService } from '../services/circleService';
import { Circle } from '../types/circle';

interface CircleViewProps {
  circleId: string;
  userId: string;
  circleService: CircleService;
}

export const CircleView: React.FC<CircleViewProps> = ({ circleId, userId, circleService }) => {
  const [estimatedCost, setEstimatedCost] = useState(100);

  const data = circleService.getCircleWithConfidence(circleId, userId, estimatedCost);

  return (
    <div className="circle-container">
      <h1>{data.circle.name}</h1>
      <p className="description">{data.circle.description}</p>

      {/* Personal Affordability (Private) */}
      <div className="affordability-section private">
        <h3>Your Affordability</h3>
        <div className={`status ${data.myAffordability.affordabilityStatus}`}>
          <p>{data.myAffordability.message}</p>
        </div>
      </div>

      {/* Circle Confidence (Public) */}
      <div className="confidence-section public">
        <h3>Group Confidence Level</h3>
        <div className={`confidence ${data.circleConfidence.overallConfidence}`}>
          <p className="confidence-label">{data.circleConfidence.overallConfidence.toUpperCase()}</p>
          <p className="confidence-reason">{data.circleConfidence.reason}</p>
        </div>
      </div>

      {/* Alternatives */}
      {data.circleConfidence.suggestedAlternatives && data.circleConfidence.suggestedAlternatives.length > 0 && (
        <div className="alternatives-section">
          <h3>Consider These Alternatives</h3>
          {data.circleConfidence.suggestedAlternatives.map((alt) => (
            <div key={alt.name} className="alternative-card">
              <p className="alt-name">{alt.name}</p>
              <p className="alt-cost">Est. ${alt.estimatedCost}</p>
              <span className="confidence-badge">{alt.confidenceImprovement} boost</span>
            </div>
          ))}
        </div>
      )}

      {/* Participants */}
      <div className="participants-section">
        <h3>Participants ({data.circle.participants.length})</h3>
        <div className="participant-list">
          {data.circle.participants.map((p) => (
            <span key={p} className="participant-badge">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
