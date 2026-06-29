'use client';

import { useState, useEffect } from 'react';

const AVAILABLE_MODELS = [
  { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', desc: '速度快，适合基础题型' },
  { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', desc: '平衡速度与准确度' },
  { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', desc: '准确度高，适合复杂题型' },
  { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', desc: '最高准确度，耗时较长' },
];

export function ModelSelector() {
  const [selected, setSelected] = useState('claude-3-5-sonnet-latest');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selectedModel');
    if (saved) setSelected(saved);
  }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
    localStorage.setItem('selectedModel', id);
    setOpen(false);
  };

  const current = AVAILABLE_MODELS.find(m => m.id === selected);

  return (
    <div>
      <button onClick={() => setOpen(true)} style={styles.button}>
        🤖 {current?.label || selected}
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={styles.overlay}>
          <div onClick={e => e.stopPropagation()} style={styles.modal}>
            <div style={styles.modalTitle}>选择 AI 模型</div>
            {AVAILABLE_MODELS.map(m => (
              <div
                key={m.id}
                onClick={() => handleSelect(m.id)}
                style={{
                  ...styles.option,
                  ...(selected === m.id ? styles.optionSelected : {}),
                }}
              >
                <div style={styles.optionLabel}>{m.label}</div>
                <div style={styles.optionDesc}>{m.desc}</div>
              </div>
            ))}
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
    borderRadius: '10px', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white', borderRadius: '16px', padding: '20px',
    width: '320px', maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: '16px', fontWeight: 700, color: '#1a1a2e',
    marginBottom: '14px', textAlign: 'center',
  },
  option: {
    padding: '12px', borderRadius: '10px', cursor: 'pointer',
    marginBottom: '6px', border: '1px solid #eee',
  },
  optionSelected: {
    borderColor: '#667eea', background: '#eef1ff',
  },
  optionLabel: { fontSize: '14px', fontWeight: 600, color: '#333' },
  optionDesc: { fontSize: '12px', color: '#888', marginTop: '2px' },
  closeBtn: {
    width: '100%', padding: '10px', fontSize: '14px', fontWeight: 500,
    color: '#888', background: '#f0f0f0', border: 'none',
    borderRadius: '10px', cursor: 'pointer', marginTop: '8px',
  },
};
