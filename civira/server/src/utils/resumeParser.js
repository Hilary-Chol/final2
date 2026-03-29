import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const commonResumeKeywords = [
  'data analysis',
  'public health',
  'reporting',
  'compliance',
  'sql',
  'excel',
  'python',
  'leadership',
  'analytics',
  'communications',
  'research',
  'monitoring',
  'evaluation',
  'project management',
  'stakeholder engagement',
  'policy',
  'database',
  'statistics',
  'administration',
  'community outreach',
  'budgeting',
  'procurement',
  'training',
  'quality assurance'
];

function uniqueKeywords(items) {
  const seen = new Map();

  items.forEach((item) => {
    const normalized = String(item || '').trim();
    if (!normalized) {
      return;
    }

    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  });

  return Array.from(seen.values());
}

// Exported to: utility helper consumed by parseResumeFile() in this module.
export function extractKeywordsFromText(text, criteriaKeywords = []) {
  const normalizedText = String(text || '').toLowerCase();

  if (!normalizedText.trim()) {
    return [];
  }

  const directMatches = criteriaKeywords.filter((keyword) => normalizedText.includes(String(keyword).toLowerCase()));
  const vocabularyMatches = commonResumeKeywords.filter((keyword) => normalizedText.includes(keyword.toLowerCase()));

  return uniqueKeywords([...directMatches, ...vocabularyMatches]).slice(0, 15);
}

// Exported to: server/src/controllers/applicantAuthController.js and candidateController.js
export async function parseResumeFile(file, criteriaKeywords = []) {
  if (!file) {
    return {
      extractedKeywords: [],
      resumeFileName: null
    };
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  let resumeText = '';

  if (file.mimetype === 'application/pdf' || extension === '.pdf') {
    const parser = new PDFParse({ data: file.buffer });
    const parsedPdf = await parser.getText();
    await parser.destroy();
    resumeText = parsedPdf.text || '';
  } else if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === '.docx'
  ) {
    const parsedDocx = await mammoth.extractRawText({ buffer: file.buffer });
    resumeText = parsedDocx.value || '';
  } else if (file.mimetype === 'text/plain' || extension === '.txt') {
    resumeText = file.buffer.toString('utf8');
  } else {
    throw new Error('Unsupported resume format. Use PDF, DOCX, or TXT.');
  }

  return {
    extractedKeywords: extractKeywordsFromText(resumeText, criteriaKeywords),
    resumeFileName: file.originalname,
    resumeText
  };
}
