function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseExperienceYears(resumeText = '') {
  const text = String(resumeText || '').toLowerCase();
  const patterns = [
    /(\d{1,2})\+?\s*(years|year|yrs|yr)\s*(of\s*)?(experience|exp)/g,
    /(experience|exp)\s*[:\-]?\s*(\d{1,2})\+?\s*(years|year|yrs|yr)/g
  ];

  let maxYears = 0;
  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      const numericTokens = match.slice(1).map((token) => Number(token)).filter((token) => !Number.isNaN(token));
      if (numericTokens.length) {
        maxYears = Math.max(maxYears, numericTokens[0]);
      }
      match = pattern.exec(text);
    }
  }

  return clamp(maxYears, 0, 30);
}

function inferQualificationScore(resumeText = '', criteriaKeywords = []) {
  const text = String(resumeText || '').toLowerCase();

  let score = 50;
  if (text.includes('phd') || text.includes('doctorate')) {
    score = 95;
  } else if (text.includes('master') || text.includes('msc') || text.includes('mba')) {
    score = 85;
  } else if (text.includes('bachelor') || text.includes('bsc') || text.includes('ba ')) {
    score = 75;
  } else if (text.includes('diploma')) {
    score = 65;
  }

  const normalizedCriteria = (Array.isArray(criteriaKeywords) ? criteriaKeywords : [])
    .map((keyword) => String(keyword || '').toLowerCase().trim())
    .filter(Boolean);

  if (normalizedCriteria.length) {
    const matches = normalizedCriteria.filter((keyword) => text.includes(keyword)).length;
    const matchRatio = matches / normalizedCriteria.length;
    score += matchRatio * 20;
  }

  const impactWords = ['led', 'implemented', 'managed', 'improved', 'developed'];
  const impactHits = impactWords.filter((word) => text.includes(word)).length;
  score += Math.min(10, impactHits * 2);

  return clamp(Number(score.toFixed(2)), 0, 100);
}

function inferExperienceYearsByLevel(experienceLevel = '') {
  const level = String(experienceLevel || '').toLowerCase();
  if (level === 'executive') return 10;
  if (level === 'senior') return 7;
  if (level === 'mid') return 4;
  return 1;
}

// Exported to: server/src/controllers/candidateController.js
export function inferApplicantMetricsFromCv({ resumeText, criteriaKeywords, experienceLevel }) {
  const cvExperienceYears = parseExperienceYears(resumeText);
  const fallbackExperienceYears = inferExperienceYearsByLevel(experienceLevel);

  return {
    inferredQualificationScore: inferQualificationScore(resumeText, criteriaKeywords),
    inferredExperienceYears: cvExperienceYears > 0 ? cvExperienceYears : fallbackExperienceYears
  };
}
