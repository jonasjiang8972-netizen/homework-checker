import sharp from 'sharp';
import { getSupabaseAdmin, uploadImage } from './supabase';

export interface OCRResult {
  ocrText: string;
  confidence: number;
  regions: Array<{
    text: string;
    bbox: [number, number, number, number];
  }>;
}

export interface BatchData {
  id: string;
  originalImageUrl: string | null;
  ocrResult: OCRResult | null;
  metadata: {
    timestamp: string;
    modelVersion: string;
    processingTime: number;
    fileSize: number;
  };
}

export interface SaveBatchOptions {
  studentId: string;
  questionId: string;
  graderResult: any;
  imageBuffer: Buffer;
  modelName: string;
  processingTime: number;
}

async function processImage(
  buffer: Buffer,
  options: { quality?: number; maxWidth?: number; format?: 'webp' } = {}
): Promise<Buffer> {
  const { quality = 80, maxWidth = 1600, format = 'webp' } = options;

  const pipeline = sharp(buffer);
  const processed = await pipeline
    .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  return processed;
}

export async function saveBatchData(options: SaveBatchOptions): Promise<string | null> {
  const { studentId, questionId, graderResult, imageBuffer, modelName, processingTime } = options;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const id = `${studentId}_${Date.now()}`;
  const timestamp = new Date().toISOString();

  const processedImage = await processImage(imageBuffer, {
    quality: 80,
    maxWidth: 1600,
    format: 'webp',
  });

  const filename = `batch_${id}.webp`;
  const url = await uploadImage(processedImage, filename, 'image/webp');

  const ocrText = extractOCRTextFromResult(graderResult);

  const batchData = {
    id,
    originalImageUrl: url,
    ocrResult: {
      ocrText,
      confidence: 0.85,
      regions: [],
    },
    metadata: {
      timestamp,
      modelVersion: modelName,
      processingTime,
      fileSize: processedImage.length,
    },
  };

  const { data, error } = await supabase
    .from('batch_grading_data')
    .insert({
      id: batchData.id,
      student_id: studentId,
      question_id: questionId,
      image_url: batchData.originalImageUrl,
      ocr_text: batchData.ocrResult?.ocrText || '',
      ocr_confidence: batchData.ocrResult?.confidence || 0,
      grading_result: graderResult,
      model_version: modelName,
      processing_time_ms: processingTime,
      file_size: batchData.metadata.fileSize,
    })
    .select()
    .single();

  if (error) {
    console.error('Save batch data error:', error);
    return null;
  }

  return data?.id || id;
}

function extractOCRTextFromResult(result: any): string {
  const texts: string[] = [];
  
  if (result.correct_solution) {
    texts.push(`正确答案：${result.correct_solution}`);
  }
  
  if (result.analysis) {
    texts.push(`分析：${result.analysis}`);
  }
  
  if (result.error_spot) {
    texts.push(`错误点：${result.error_spot}`);
  }

  return texts.join('\n');
}
