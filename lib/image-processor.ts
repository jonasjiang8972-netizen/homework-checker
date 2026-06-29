import sharp from 'sharp';

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

const DEFAULT_OPTIONS: ProcessOptions = {
  quality: 85,
  maxWidth: 1600,
  maxHeight: 1600,
  format: 'webp',
};

async function processImage(
  buffer: Buffer,
  options: ProcessOptions = DEFAULT_OPTIONS
): Promise<Buffer> {
  const { quality = 85, maxWidth = 1600, maxHeight = 1600, format = 'webp' } = options;

  let pipeline = sharp(buffer);

  pipeline = pipeline.resize(maxWidth, maxHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  } else if (format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality });
  } else {
    pipeline = pipeline.png();
  }

  return await pipeline.toBuffer();
}

export async function processAndUpload(
  buffer: Buffer,
  filename: string,
  contentType: string,
  uploadFn: (buffer: Buffer, filename: string, contentType: string) => Promise<string | null>
): Promise<ProcessedImage> {
  const processedBuffer = await processImage(buffer, {
    quality: 85,
    maxWidth: 1600,
    maxHeight: 1600,
    format: 'webp',
  });

  const newFilename = `processed_${Date.now()}_${filename.replace(/\.[^.]+$/, '.webp')}`;

  const url = await uploadFn(processedBuffer, newFilename, 'image/webp');

  return {
    buffer: processedBuffer,
    contentType: 'image/webp',
    url,
    originalName: filename,
  };
}

export function estimateCompressionSize(originalBuffer: Buffer, format: 'webp' | 'jpeg' = 'webp'): number {
  if (format === 'webp') {
    return Math.round(originalBuffer.length * 0.5);
  }
  return Math.round(originalBuffer.length * 0.7);
}
