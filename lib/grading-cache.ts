export interface BatchData {
  id: string;
  originalImageUrl: string | null;
  gradingResult: any;
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
  gradingResult: any;
  imageUrl: string;
  modelName: string;
  processingTime: number;
}

export async function saveBatchData(options: SaveBatchOptions): Promise<string | null> {
  const { studentId, questionId, gradingResult, imageUrl, modelName, processingTime } = options;

  const id = `${studentId}_${Date.now()}`;
  const timestamp = new Date().toISOString();

  const batchData = {
    id,
    originalImageUrl: imageUrl,
    gradingResult,
    metadata: {
      timestamp,
      modelVersion: modelName,
      processingTime,
      fileSize: 0,
    },
  };

  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: (gradingResult?.knowledge_point || '图片题目') + ` [${id}]`,
        errorAnalysis: gradingResult?.analysis || '',
        subject: '数学',
        imageUrl: imageUrl || '',
        grading: gradingResult,
      }),
    });
    const json = await res.json();
    return json.data?.id || id;
  } catch {
    return null;
  }
}
