import { parseKeywordArray } from './keywordParser.js';

// Exported to: server/src/controllers/candidateController.js and services/deadlineSchedulerService.js
export function computeCandidateRanking(candidate, criteriaKeywords) {
  const candidateKeywords = parseKeywordArray(candidate.profile_keywords);

  const normalizedCandidateKeywords = candidateKeywords.map((k) => String(k).toLowerCase());
  const normalizedCriteria = criteriaKeywords.map((k) => String(k).toLowerCase());

  const matchedKeywords = normalizedCriteria.filter((keyword) => normalizedCandidateKeywords.includes(keyword));
  const keywordScore = normalizedCriteria.length === 0 ? 0 : (matchedKeywords.length / normalizedCriteria.length) * 100;

  const qualificationScore = Number(candidate.qualification_score) * 10;
  const experienceScore = Math.min(Number(candidate.experience_years) * 10, 100);

  const finalScore = qualificationScore * 0.45 + experienceScore * 0.25 + keywordScore * 0.3;

  return Number(finalScore.toFixed(3));
}

// Exported to: server/src/controllers/candidateController.js and services/deadlineSchedulerService.js
export function topTenCandidates(rankedCandidates) {
  return rankedCandidates.sort((a, b) => b.rankingScore - a.rankingScore).slice(0, 10);
}
