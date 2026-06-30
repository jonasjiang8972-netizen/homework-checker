'use client';

import { useState, useEffect } from 'react';

interface ModelInfo {
  id: string;
  owned_by: string;
  is_vision: boolean;
  is_text: boolean;
  is_image_gen: boolean;
}

export function ModelSelector({ refreshKey = 0 }: { refreshKey?: number }) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterVision, setFilterVision] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selectedModel');
    setLoading(true);
    setError('');
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setModels([]);
          setLoading(false);
          return;
        }
        const list = data.models || [];
        setModels(list);
        if (saved && list.some((m: ModelInfo) => m.id === saved)) {
          setSelected(saved);
        } else if (list.length > 0) {
          const defaultVision = list.find((m: ModelInfo) => m.is_vision && !m.is_image_gen);
          setSelected(defaultVision?.id || list[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setModels([]);
        setError('加载失败');
        setLoading(false);
      });
  }, [refreshKey]);

  useEffect(() => {
    if (selected) localStorage.setItem('selectedModel', selected);
  }, [selected]);

  const filtered = models.filter(m => {
    if (filterVision && !m.is_vision) return false;
    if (search && !m.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const current = models.find(m => m.id === selected);

  if (loading) {
    return <div style={styles.button}>🤖 加载模型中...</div>;
  }

  if (error && models.length === 0) {
    return <div style={{ ...styles.button, color: '#d63031', borderColor: '#ffd5d5', background: '#fff5f5' }}>⚠️ {error}</div>;
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} style={styles.button}>
        🤖 {current?.id?.split('/').pop() || '选择模型'}
        {current?.is_vision && ' 📷'}
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={styles.overlay}>
          <div onClick={e => e.stopPropagation()} style={styles.modal}>
            <div style={styles.modalTitle}>选择 AI 模型</div>

            <div style={styles.filterRow}>
              <input
                type="text"
                placeholder="搜索模型..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              <button
                onClick={() => setFilterVision(!filterVision)}
                style={{
                  ...styles.filterBtn,
                  ...(filterVision ? styles.filterBtnActive : {}),
                }}
              >
                📷 仅多模态
              </button>
            </div>

            <div style={styles.modelList}>
              {filtered.length === 0 && (
                <div style={styles.empty}>没有匹配的模型</div>
              )}
              {filtered.map(m => (
                <div
                  key={m.id}
                  onClick={() => { setSelected(m.id); setOpen(false); }}
                  style={{
                    ...styles.option,
                    ...(selected === m.id ? styles.optionSelected : {}),
                  }}
                >
                  <div style={styles.optionHeader}>
                    <span style={styles.optionLabel}>{m.id.split('/').pop()}</span>
                    <span style={styles.optionProvider}>{m.id.split('/')[0]}</span>
                    {m.is_vision && <span style={styles.visionBadge}>📷</span>}
                  </div>
                  <div style={styles.optionId}>{m.id}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setOpen(false)} style={styles.closeBtn}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: '100%', padding: '10px', fontSize: '13px', fontWeight: 500,
    background: '#f0f3ff', color: '#667eea', border: '1px solid #d0d8f0',
    borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white', borderRadius: '16px', padding: '20px',
    width: '380px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: '16px', fontWeight: 700, color: '#1a1a2e',
    marginBottom: '12px', textAlign: 'center',
  },
  filterRow: {
    display: 'flex', gap: '8px', marginBottom: '12px',
  },
  searchInput: {
    flex: 1, padding: '8px 12px', fontSize: '13px',
    border: '1px solid #e0e4ee', borderRadius: '8px', outline: 'none',
  },
  filterBtn: {
    padding: '8px 12px', fontSize: '12px', fontWeight: 500,
    border: '1px solid #e0e4ee', borderRadius: '8px', cursor: 'pointer',
    background: 'white', color: '#666', whiteSpace: 'nowrap',
  },
  filterBtnActive: {
    background: '#eef1ff', color: '#4f6ef7', borderColor: '#4f6ef7',
  },
  modelList: {
    flex: 1, overflowY: 'auto', marginBottom: '8px',
  },
  empty: {
    textAlign: 'center', padding: '20px', color: '#8e95a2', fontSize: '13px',
  },
  option: {
    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
    marginBottom: '4px', border: '1px solid #eee',
  },
  optionSelected: {
    borderColor: '#667eea', background: '#eef1ff',
  },
  optionHeader: {
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  optionLabel: { fontSize: '14px', fontWeight: 600, color: '#333' },
  optionProvider: { fontSize: '11px', color: '#aaa', fontWeight: 400 },
  visionBadge: { fontSize: '14px', marginLeft: 'auto' },
  optionId: { fontSize: '11px', color: '#999', marginTop: '2px' },
  closeBtn: {
    width: '100%', padding: '10px', fontSize: '14px', fontWeight: 500,
    color: '#888', background: '#f0f0f0', border: 'none',
    borderRadius: '10px', cursor: 'pointer', marginTop: '4px',
  },
};
