import { useState, useEffect } from 'react';

// 模拟 AI 调试工具组件
export function AIDebugTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [modelLogs, setModelLogs] = useState<any[]>([]);
  const [showOCR, setShowOCR] = useState(false);

  // 模拟加载调试信息
  useEffect(() => {
    if (isOpen) {
      // 模拟获取当前批改结果
      setTimeout(() => {
        setCurrentResult({
          model: 'claude-3-5-sonnet-latest',
          timestamp: new Date().toISOString(),
          processingTime: 2450,
          confidence: 0.92,
          ocrText: '题目：计算 27 + 38 = ?\n\n最佳答案：27 + 38 = 65\n\n错误分析：学生在第二步未处理进位',
          gradingResult: {
            is_correct: false,
            error_type: '计算失误',
            knowledge_point: '两位数进位加法',
            error_spot: '第二步未进位',
            correct_solution: '27+38=65\n第一步: 7+8=15，个位5，进位1\n第二步: 2+3+1=6',
            analysis: '对进位规则掌握不牢',
            knowledge_tags: ['进位加法', '竖式计算']
          }
        });
      }, 500);
    }
  }, [isOpen]);

  const toggleDebug = () => {
    setIsOpen(!isOpen);
  };

  const renderLogEntry = (log: any) => (
    <div key={log.timestamp} className="log-entry">
      <div className="log-header">
        <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
        <span className="log-model">{log.model}</span>
      </div>
      <div className="log-content">
        <div className="log-text">{log.text}</div>
      </div>
    </div>
  );

  return (
    <div className="ai-debug-tool">
      <button onClick={toggleDebug} className="debug-toggle">
        {isOpen ? '_hide' : '🔍 AI 调试'}
      </button>
      
      {isOpen && (
        <div className="debug-panel">
          <div className="panel-header">
            <h3>AI 调试面板</h3>
            <button onClick={toggleDebug} className="close-btn">×</button>
          </div>
          
          <div className="panel-content">
            <div className="result-info">
              <h4>批改结果</h4>
              <pre className="result-content">
                {JSON.stringify(currentResult?.gradingResult, null, 2)}
              </pre>
            </div>
            
            <div className="ocr-section">
              <label>
                <input 
                  type="checkbox" 
                  checked={showOCR}
                  onChange={(e) => setShowOCR(e.target.checked)}
                />
                显示 OCR 文本
              </label>
              {showOCR && (
                <div className="ocr-content">
                  <h4>OCR 提取内容</h4>
                  <pre>{currentResult?.ocrText}</pre>
                </div>
              )}
            </div>
            
            <div className="logs-section">
              <h4>模型日志</h4>
              <div className="logs-container">
                {modelLogs.map(renderLogEntry)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}