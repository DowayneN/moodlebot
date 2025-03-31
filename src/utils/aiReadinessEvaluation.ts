// AI Readiness evaluation utilities
import { findRelevantChunks, createSimpleEmbedding } from './textProcessing';

interface EvaluationContext {
  preprocessedData?: {
    chunks: Array<{
      text: string;
      embedding: number[];
    }>;
  };
  industry?: string;
  businessObjectives?: string[];
  currentTopicId?: string;
  previousAnswers?: Record<string, string>;
}

// Core evaluation dimensions that OpenAI should cover
export const evaluationDimensions = {
  context: {
    id: 'context',
    description: 'Understanding of the organization\'s industry, size, and business objectives',
    importance: 3
  },
  data: {
    id: 'data',
    description: 'Data infrastructure, quality, and management capabilities',
    importance: 3
  },
  strategy: {
    id: 'strategy',
    description: 'AI strategy alignment with business goals and roadmap',
    importance: 3
  },
  talent: {
    id: 'talent',
    description: 'AI/ML talent, skills, and training programs',
    importance: 2
  },
  technical: {
    id: 'technical',
    description: 'Technical infrastructure and tools for AI implementation',
    importance: 2
  },
  governance: {
    id: 'governance',
    description: 'Data governance, ethics, and compliance frameworks',
    importance: 2
  },
  experience: {
    id: 'experience',
    description: 'Previous AI/ML project experience and outcomes',
    importance: 1
  }
};

// Scoring thresholds for readiness levels
export const readinessLevels = {
  EXPLORING: 'Exploring',
  DEVELOPING: 'Developing',
  ESTABLISHED: 'Established',
  ADVANCED: 'Advanced',
};

// Industry-specific context for personalized recommendations
export const industryContexts = {
  healthcare: {
    opportunities: ['Patient outcome prediction', 'Medical image analysis', 'Treatment optimization'],
    considerations: ['HIPAA compliance', 'Patient data privacy', 'Medical device regulations'],
  },
  finance: {
    opportunities: ['Risk assessment', 'Fraud detection', 'Automated trading'],
    considerations: ['Regulatory compliance', 'Algorithm transparency', 'Real-time processing'],
  },
  retail: {
    opportunities: ['Demand forecasting', 'Personalized recommendations', 'Inventory optimization'],
    considerations: ['Customer privacy', 'Real-time analytics', 'Multi-channel integration'],
  },
  manufacturing: {
    opportunities: ['Predictive maintenance', 'Quality control', 'Supply chain optimization'],
    considerations: ['IoT integration', 'Legacy systems', 'Safety regulations'],
  },
  // Add more industries as needed
};

// Generate the next evaluation question using OpenAI
export const generateNextQuestion = async (
  context: EvaluationContext,
  openAIClient: any
): Promise<string | null> => {
  const { previousAnswers = {}, currentTopicId } = context;
  const askedDimensions = Object.keys(previousAnswers);
  
  // If we've covered all dimensions, return null
  if (askedDimensions.length >= Object.keys(evaluationDimensions).length) {
    return null;
  }

  // Get relevant context from preprocessed data
  const relevantContext = context.preprocessedData ? 
    getRelevantContext(JSON.stringify(previousAnswers), context.preprocessedData) : [];

  // Determine next dimension to evaluate
  const remainingDimensions = Object.entries(evaluationDimensions)
    .filter(([id]) => !askedDimensions.includes(id))
    .sort(([, a], [, b]) => b.importance - a.importance);

  if (remainingDimensions.length === 0) {
    return null;
  }

  const nextDimension = remainingDimensions[0][1];
  
  // Prepare the prompt for OpenAI
  const prompt = {
    role: "system",
    content: `You are an AI readiness assessment expert. Generate a conversational, insightful question to evaluate the following dimension of AI readiness: ${nextDimension.description}.

Current Context:
${relevantContext.length > 0 ? `Based on their data: ${relevantContext.join('\n')}` : 'No specific data available yet.'}

Previous answers:
${Object.entries(previousAnswers).map(([dim, answer]) => `${evaluationDimensions[dim].description}: ${answer}`).join('\n')}

Requirements:
1. Make the question conversational and engaging
2. Reference specific information from their context if available
3. Focus on gathering concrete details about their capabilities
4. Avoid yes/no questions
5. Keep the question concise but informative

Generate only the question, without any additional text.`
  };

  try {
    const completion = await openAIClient.createChatCompletion({
      model: "gpt-4",
      messages: [prompt],
      temperature: 0.7,
      max_tokens: 150
    });

    const question = completion.choices[0].message.content.trim();
    context.currentTopicId = nextDimension.id;
    return question;
  } catch (error) {
    console.error('Error generating question:', error);
    // Fallback to a basic question if OpenAI fails
    return `Could you tell me about your organization's ${nextDimension.description.toLowerCase()}?`;
  }
};

// Function to retrieve relevant context from preprocessed data
const getRelevantContext = (
  query: string,
  preprocessedData?: { chunks: Array<{ text: string; embedding: number[]; }> }
): string[] => {
  if (!preprocessedData?.chunks || preprocessedData.chunks.length === 0) {
    return [];
  }

  return findRelevantChunks(query, preprocessedData.chunks, 3);
};

// Calculate readiness score for each dimension
const calculateDimensionScores = (
  answers: Record<string, string>,
  context?: EvaluationContext
): Record<string, number> => {
  const scores: Record<string, number> = {};
  
  Object.entries(answers).forEach(([dimension, answer]) => {
    if (dimension === 'context') return; // Skip context from scoring
    
    let score = 0;
    const length = answer.length;
    
    // Get relevant context for scoring
    const relevantContext = context?.preprocessedData ? 
      getRelevantContext(answer, context.preprocessedData) : [];
    
    // Base score calculation
    if (length > 100) score += 3;
    else if (length > 50) score += 2;
    else if (length > 20) score += 1;
    
    // Adjust score based on sentiment and context
    const hasPositiveIndicators = answer.toLowerCase().includes('yes') || 
                                answer.toLowerCase().includes('have') ||
                                answer.toLowerCase().includes('implemented');
    const hasNegativeIndicators = answer.toLowerCase().includes('no') ||
                                 answer.toLowerCase().includes('limited') ||
                                 answer.toLowerCase().includes('not yet');
    
    if (hasPositiveIndicators) score += 1;
    if (hasNegativeIndicators) score -= 1;
    
    // Boost score if answer aligns with preprocessed data
    if (relevantContext.length > 0) {
      const contextAlignment = relevantContext.some(chunk => 
        answer.toLowerCase().includes(chunk.toLowerCase().substring(0, 20))
      );
      if (contextAlignment) score += 0.5;
    }
    
    scores[dimension] = Math.max(0, Math.min(5, score)); // Normalize between 0-5
  });
  
  return scores;
};

// Generate personalized recommendations based on the evaluation
export const generateRecommendations = async (
  answers: Record<string, string>,
  context: EvaluationContext,
  openAIClient: any
): Promise<string> => {
  const dimensionScores = calculateDimensionScores(answers, context);
  const relevantContext = context.preprocessedData ? 
    getRelevantContext(JSON.stringify(answers), context.preprocessedData) : [];

  const prompt = {
    role: "system",
    content: `As an AI readiness expert, generate personalized recommendations based on the following assessment:

Organization Context:
${relevantContext.join('\n')}

Evaluation Responses:
${Object.entries(answers).map(([dim, answer]) => `${evaluationDimensions[dim].description}: ${answer}`).join('\n')}

Dimension Scores (0-5):
${Object.entries(dimensionScores).map(([dim, score]) => `${evaluationDimensions[dim].description}: ${score}`).join('\n')}

Requirements:
1. Provide specific, actionable recommendations
2. Reference their actual data and metrics
3. Prioritize recommendations based on scores
4. Include industry-specific considerations
5. Suggest concrete next steps
6. Use emojis for better readability
7. Format in clear sections

Generate a comprehensive but concise set of recommendations.`
  };

  try {
    const completion = await openAIClient.createChatCompletion({
      model: "gpt-4",
      messages: [prompt],
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating recommendations:', error);
    // Fallback to basic recommendations
    return generateBasicRecommendations(answers, dimensionScores, context);
  }
};

// Fallback function for basic recommendations
const generateBasicRecommendations = (
  answers: Record<string, string>,
  dimensionScores: Record<string, number>,
  context?: EvaluationContext
): string => {
  const industryContext = answers.context ? determineIndustryContext(answers.context) : null;
  
  const recommendations = [
    "Based on our detailed assessment and analysis of your organization's data, here are your personalized AI readiness insights and recommendations:",
    "\n🎯 Overall Assessment:",
  ];
  
  // Add industry-specific context if available
  if (industryContext) {
    recommendations.push(
      `\nIn the ${industryContext.industry} industry, we see particular opportunities in:`,
      ...industryContext.opportunities.map(opp => `• ${opp}`),
      "\nKey considerations for your industry:",
      ...industryContext.considerations.map(con => `• ${con}`)
    );
  }
  
  recommendations.push("\n💡 Dimension-Specific Recommendations:");
  
  // Enhanced recommendations with RAG
  Object.entries(dimensionScores).forEach(([dimension, score]) => {
    if (score <= 3) {
      const dimensionRecommendations = getDimensionRecommendations(
        dimension,
        score,
        answers[dimension],
        context
      );
      recommendations.push(...dimensionRecommendations);
    }
  });
  
  recommendations.push(
    "\n📈 Next Steps:",
    "1. Focus on addressing the recommendations in order of priority",
    "2. Start with a well-defined pilot project to demonstrate value",
    "3. Regularly reassess your AI readiness as you progress",
    "\nWould you like me to elaborate on any of these recommendations or discuss specific next steps for your organization?"
  );
  
  return recommendations.join("\n");
};

// Helper function to get dimension-specific recommendations with RAG
const getDimensionRecommendations = (
  dimension: string,
  score: number,
  answer: string,
  context?: EvaluationContext
): string[] => {
  const recommendations: string[] = [];
  const relevantContext = context?.preprocessedData ? 
    getRelevantContext(`${dimension} recommendations for ${answer}`, context.preprocessedData) : [];

  switch (dimension) {
    case 'data':
      recommendations.push(
        "📊 Data Readiness:",
        "• Conduct a comprehensive data audit to identify and catalog available datasets",
        "• Implement data quality monitoring and improvement processes",
        "• Establish clear data governance policies and documentation standards"
      );
      break;
    case 'strategy':
      recommendations.push(
        "🎯 Strategic Alignment:",
        "• Define clear business objectives that could benefit from AI implementation",
        "• Develop a phased AI adoption roadmap aligned with business goals",
        "• Identify quick wins for initial AI projects to demonstrate value"
      );
      break;
    case 'talent':
      recommendations.push(
        "👥 Talent Development:",
        "• Assess current team skills and identify key capability gaps",
        "• Develop an AI training program for existing staff",
        "• Consider partnerships with AI experts or consultancies for initial projects"
      );
      break;
    case 'technical':
      recommendations.push(
        "🔧 Technical Infrastructure:",
        "• Evaluate current infrastructure against AI workload requirements",
        "• Consider cloud-based AI platforms for initial projects",
        "• Develop a scalable technical architecture plan"
      );
      break;
    case 'governance':
      recommendations.push(
        "🔒 Governance & Ethics:",
        "• Establish an AI ethics framework and governance structure",
        "• Implement processes for responsible AI development and deployment",
        "• Ensure compliance with relevant regulations and standards"
      );
      break;
  }

  // Add relevant context from preprocessed data if available
  if (relevantContext.length > 0) {
    recommendations.push(
      "\nBased on your organization's data:",
      ...relevantContext.map(context => `• ${context}`)
    );
  }

  return recommendations;
};

// Determine the overall AI readiness level based on answers
export const evaluateReadinessLevel = (
  answers: Record<string, string>,
  context?: EvaluationContext
): string => {
  const dimensionScores = calculateDimensionScores(answers, context);
  const averageScore = Object.values(dimensionScores).reduce((a, b) => a + b, 0) / 
                      Object.keys(dimensionScores).length;
  
  if (averageScore <= 1.5) {
    return readinessLevels.EXPLORING;
  } else if (averageScore <= 2.5) {
    return readinessLevels.DEVELOPING;
  } else if (averageScore <= 3.5) {
    return readinessLevels.ESTABLISHED;
  } else {
    return readinessLevels.ADVANCED;
  }
};

// Helper function to determine industry context from initial response
const determineIndustryContext = (contextAnswer: string): any => {
  const answer = contextAnswer.toLowerCase();
  
  if (answer.includes('health') || answer.includes('medical') || answer.includes('hospital')) {
    return { industry: 'healthcare', ...industryContexts.healthcare };
  }
  if (answer.includes('bank') || answer.includes('finance') || answer.includes('investment')) {
    return { industry: 'finance', ...industryContexts.finance };
  }
  if (answer.includes('retail') || answer.includes('shop') || answer.includes('store')) {
    return { industry: 'retail', ...industryContexts.retail };
  }
  if (answer.includes('manufact') || answer.includes('production') || answer.includes('factory')) {
    return { industry: 'manufacturing', ...industryContexts.manufacturing };
  }
  
  return null;
};

