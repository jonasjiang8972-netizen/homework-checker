export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  url: string | null;
  originalName: string;
}

export interface ProcessOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export async function processAndUpload(
  buffer: Buffer,
  filename: string,
  contentType: string,
  uploadFn: (buffer: Buffer, filename: string, contentType: string) => Promise<string | null>
): Promise<ProcessedImage> {
  const newFilename = `processed_${Date.now()}_${filename}`;
  const url = await uploadFn(buffer, newFilename, contentType);
  return { buffer, contentType, url, originalName: filename };
}

export function estimateCompressionSize(originalBuffer: Buffer, format: 'webp' | 'jpeg' = 'webp'): number {
  if (format === 'webp') return Math.round(originalBuffer.length * 0.5);
  return Math.round(originalBuffer.length * 0.7);
}
