function sanitizeKeywords(jobKeywords) {
  let source = jobKeywords;

  // Accept array, JSON string array, or comma-separated string.
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        source = JSON.parse(trimmed);
      } catch {
        source = trimmed.split(',');
      }
    } else {
      source = trimmed.split(',');
    }
  }

  if (!Array.isArray(source)) return [];
  return source
    .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
    .filter(Boolean)
    .slice(0, 20);
}

function clampRating(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(10, Number(parsed.toFixed(1))));
}

function tryParseJsonFromModelResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  // First try parsing the raw content directly.
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

// Exported to: server/src/controllers/cvAiController.js and applicantAuthController.js
export async function rateCvWithAi(cvText, rawJobKeywords = []) {
  const text = String(cvText || '').trim();
  const jobKeywords = sanitizeKeywords(rawJobKeywords);

  if (!text) {
    return {
      rating: 0,
      strengths: [],
      improvements: ['CV text is empty'],
      reasoning: 'No content provided',
      source: 'validation'
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      rating: 0,
      strengths: [],
      improvements: ['GROQ_API_KEY not configured on server'],
      reasoning: 'AI rating service is not available. Please configure GROQ_API_KEY.',
      source: 'error'
    };
  }

  if (typeof fetch !== 'function') {
    return {
      rating: 0,
      strengths: [],
      improvements: ['Fetch API not available in server environment'],
      reasoning: 'AI rating service is not available.',
      source: 'error'
    };
  }

  const prompt = [
    'Rate the following CV from 0 to 10.',
    'Scoring criteria: structure/clarity, skills depth, outcomes/impact, and relevance to job keywords.',
    `Job keywords: ${jobKeywords.length ? jobKeywords.join(', ') : 'none provided'}`,
    'Return strict JSON with this shape only:',
    '{"rating": 0-10 number, "strengths": ["..."], "improvements": ["..."], "reasoning": "..."}',
    'CV text:',
    text
  ].join('\n\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      return {
        rating: 0,
        strengths: [],
        improvements: ['AI service returned an error'],
        reasoning: `Groq API error: ${response.status}`,
        source: 'error'
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = tryParseJsonFromModelResponse(content);
    if (!parsed) {
      return {
        rating: 0,
        strengths: [],
        improvements: ['AI service could not parse response'],
        reasoning: 'Failed to extract rating from AI model response.',
        source: 'error'
      };
    }

    return {
      rating: clampRating(parsed.rating),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5) : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'AI scoring completed.',
      source: 'groq'
    };
  } catch (error) {
    return {
      rating: 0,
      strengths: [],
      improvements: ['AI service request failed'],
      reasoning: `Request failed: ${error?.message || 'Unknown error'}`,
      source: 'error'
    };
  } finally {
    clearTimeout(timeout);
  }
}
