export interface SplitResult {
  questions: string[];
  hasNumbering: boolean;
}

const NUMBER_PATTERNS = [
  /^\d+[．.、]\s*/,
  /^\(\d+\)\s*/,
  /^[（(]\d+[)）]\s*/,
  /^[一二三四五六七八九十]+[、.．]\s*/,
  /^\d+[#]\s*/,
];

const QUESTION_PREFIX_PATTERN = /^(第?\d+[题小题]?[、.．:：]?\s*)/;

export function splitQuestions(ocrText: string): SplitResult {
  if (!ocrText || ocrText.trim().length < 10) {
    return { questions: [ocrText.trim()], hasNumbering: false };
  }

  const lines = ocrText.split('\n');
  const questions: string[] = [];
  let hasNumbering = false;

  let bestPattern: RegExp | null = null;
  let bestCount = 0;

  for (const pattern of NUMBER_PATTERNS) {
    let count = 0;
    for (const line of lines) {
      if (pattern.test(line.trim())) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestPattern = pattern;
    }
  }

  if (bestPattern && bestCount >= 2) {
    hasNumbering = true;
    let current = '';

    for (const line of lines) {
      if (bestPattern.test(line.trim())) {
        if (current.trim()) {
          questions.push(current.trim());
        }
        current = line.replace(QUESTION_PREFIX_PATTERN, '').trim();
      } else {
        current += '\n' + line;
      }
    }
    if (current.trim()) {
      questions.push(current.trim());
    }
  }

  if (questions.length < 2) {
    const blocks = ocrText.split(/\n\s*\n/);
    if (blocks.length >= 2) {
      const filtered = blocks
        .map(b => b.trim())
        .filter(b => b.length >= 10);
      if (filtered.length >= 2) {
        return { questions: filtered, hasNumbering: false };
      }
    }
  }

  if (questions.length < 2) {
    return { questions: [ocrText.trim()], hasNumbering: false };
  }

  return { questions, hasNumbering };
}

export function estimateTime(questionCount: number): { seconds: number; label: string } {
  if (questionCount <= 1) return { seconds: 20, label: '约 20 秒' };
  if (questionCount <= 3) return { seconds: questionCount * 12, label: `约 ${questionCount * 12} 秒` };
  if (questionCount <= 5) return { seconds: questionCount * 15, label: `约 ${questionCount * 15} 秒` };
  return { seconds: questionCount * 18, label: `建议分批，每批 3-5 题` };
}
