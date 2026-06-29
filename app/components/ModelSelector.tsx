import { useState, useEffect } from 'react';

export function ModelSelector() {
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-5-sonnet-latest');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 从环境变量或默认配置加载模型
  useEffect(() => {
    const model = process.env.NEXT_PUBLIC_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
    setSelectedModel(model);
  }, []);

  const availableModels = [
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: '速度快，适合基础题型' },
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', description: '平衡速度与准确度' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', description: '准确度高，适合复杂题型' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: '最高准确度，耗时较长' },
  ];

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    // 这里应该保存到本地存储或后端
    localStorage.setItem('selectedModel', modelId);
    setIsModalOpen(false);
  };

  return (
    <div className="model-selector">
      <button 
        onClick={() => setIsModalOpen(true)}
        className="model-button"
      >
        当前模型: {availableModels.find(m => m.id === selectedModel)?.label || selectedModel}
      </button>

      {isModalOpen && (
        <div className="model-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="model-modal" onClick={e => e.stopPropagation()}>
            <h3>选择 AI 模型</h3>
            <div className="model-list">
              {availableModels.map(model => (
                <div 
                  key={model.id}
                  className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <div className="model-label">{model.label}</div>
                  <div className="model-description">{model.description}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setIsModalOpen(false)} className="close-button">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}