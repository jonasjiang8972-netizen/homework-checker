import Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function ocrImageClient(file: File | Blob): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(file, 'chi_sim+eng', {
    logger: () => {},
  });

  const text = data.text.trim();
  const confidence = data.confidence || 0;

  return { text, confidence };
}

export function isOcrReliable(result: OcrResult): boolean {
  if (result.confidence < 40) return false;
  if (result.text.length < 5) return false;
  const chineseChars = (result.text.match(/[鿿]/g) || []).length;
  const digitChars = (result.text.match(/[0-9]/g) || []).length;
  if (chineseChars + digitChars < 3) return false;
  return true;
}
