// AI Readiness evaluation utilities

// Questions to evaluate AI readiness across key dimensions
export const evaluationQuestions = [
  {
    id: 'data',
    question: "How would you describe your organization's data infrastructure and quality?",
    followUp: "Do you have structured datasets relevant to your business problems?",
    importance: 3,
  },
  {
    id: 'strategy',
    question: "Does your organization have a clear AI strategy aligned with business goals?",
    followUp: "Can you describe how AI fits into your broader business strategy?",
    importance: 3,
  },
  {
    id: 'talent',
    question: "What AI and data science talent do you currently have in your organization?",
    followUp: "Do you have plans for training existing staff or hiring specialists?",
    importance: 2,
  },
  {
    id: 'technical',
    question: "How would you rate your organization's technical infrastructure for supporting AI?",
    followUp: "Do you have cloud resources or compute power suitable for AI workloads?",
    importance: 2,
  },
  {
    id: 'governance',
    question: "What governance processes do you have for AI systems and data privacy?",
    followUp: "How do you ensure responsible and ethical use of AI?",
    importance: 2,
  },
  {
    id: 'experience',
    question: "Has your organization implemented any AI or automation projects before?",
    followUp: "What were the outcomes of those projects?",
    importance: 1,
  }
];

// Scoring thresholds for readiness levels
export const readinessLevels = {
  EXPLORING: 'Exploring',
  DEVELOPING: 'Developing',
  ESTABLISHED: 'Established',
  ADVANCED: 'Advanced',
};

// Generate the next evaluation question based on conversation context
export const getNextQuestion = (askedQuestions: string[], currentTopicId?: string): string | null => {
  // If we've asked all the questions, return null to end evaluation
  if (askedQuestions.length >= evaluationQuestions.length) {
    return null;
  }
  
  // Find questions we haven't asked yet
  const remainingQuestions = evaluationQuestions.filter(
    q => !askedQuestions.includes(q.id)
  );
  
  if (remainingQuestions.length === 0) {
    return null;
  }
  
  // If we have a current topic, see if there's a follow-up to ask
  if (currentTopicId) {
    const currentTopic = evaluationQuestions.find(q => q.id === currentTopicId);
    if (currentTopic && currentTopic.followUp && !askedQuestions.includes(`${currentTopicId}-followup`)) {
      return currentTopic.followUp;
    }
  }
  
  // Otherwise, pick the next question from remaining questions
  return remainingQuestions[0].question;
};

// Generate personalized recommendations based on the evaluation
export const generateRecommendations = (answers: Record<string, string>, knowledgeBase?: string): string => {
  const recommendations = [
    "Based on our conversation, here are some tailored recommendations to improve your AI readiness:",
  ];
  
  // Data recommendations
  if (answers.data && answers.data.toLowerCase().includes('limited') || 
      !answers.data || answers.data.length < 20) {
    recommendations.push(
      "• Data Strategy: Start by identifying and organizing key datasets. Consider implementing data quality processes to ensure your data is accurate and accessible."
    );
  }
  
  // Strategy recommendations
  if (!answers.strategy || answers.strategy.toLowerCase().includes('no') || answers.strategy.length < 20) {
    recommendations.push(
      "• Strategic Alignment: Develop a clear AI strategy that aligns with your business objectives. Identify specific business problems where AI can deliver value."
    );
  }
  
  // Talent recommendations
  if (!answers.talent || answers.talent.toLowerCase().includes('limited') || answers.talent.length < 20) {
    recommendations.push(
      "• Talent Development: Consider upskilling existing team members through AI training programs or partnering with external experts for initial projects."
    );
  }
  
  // Add general recommendation for all
  recommendations.push(
    "• Start Small: Begin with a well-defined pilot project to demonstrate value and build momentum for broader AI adoption."
  );
  
  return recommendations.join("\n\n");
};

// Determine the overall AI readiness level based on answers
export const evaluateReadinessLevel = (answers: Record<string, string>): string => {
  // Count how many dimensions have substantial answers
  const answeredDimensions = Object.keys(answers).filter(key => 
    answers[key] && answers[key].length > 20
  ).length;
  
  if (answeredDimensions <= 2) {
    return readinessLevels.EXPLORING;
  } else if (answeredDimensions <= 3) {
    return readinessLevels.DEVELOPING;
  } else if (answeredDimensions <= 5) {
    return readinessLevels.ESTABLISHED;
  } else {
    return readinessLevels.ADVANCED;
  }
};
