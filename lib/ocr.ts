import Tesseract from 'tesseract.js';

export async function ocrImage(buffer: Buffer): Promise<string> {
  const { data } = await Tesseract.recognize(buffer, 'chi_sim+eng', {
    logger: () => {},
  });
  return data.text.trim();
}
