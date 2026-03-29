import { apiRequest } from '../services/api';

async function rateCVWithBackend(cvText, jobKeywords = []) {
  return apiRequest('/ai/rate-cv', 'POST', { cvText, jobKeywords });
}

export async function rateCVString(cvText, jobKeywords = []) {
  if (!cvText || cvText.trim().length === 0) {
    return {
      rating: 0,
      strengths: [],
      improvements: ['CV text is empty'],
      reasoning: 'No content to analyze',
      source: 'Validation'
    };
  }

  return await rateCVWithBackend(cvText, jobKeywords);
}

export function getCVRatingConfig() {
  return {
    apiConfigured: true,
    source: 'Server AI (Groq)',
    setupInstructions: 'Set GROQ_API_KEY on server for free AI scoring via Groq at https://console.groq.com'
  };
}
