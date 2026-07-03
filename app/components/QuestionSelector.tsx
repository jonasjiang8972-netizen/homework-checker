'use client';

import { useState } from 'react';

interface QuestionSelectorProps {
  questions: string[];
  onConfirm: (selected: string[]) => void;
  onCancel: () => void;
  estimatedLabel: string;
}

export function QuestionSelector({ questions, onConfirm, onCancel, estimatedLabel }: QuestionSelectorProps) {
  const [selected, setSelected] = useState<boolean[]>(() => questions.map(() => true));

  const toggle = (i: number) => {
    setSelected(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const toggleAll = () => {
    const allSelected = selected.every(Boolean);
    setSelected(selected.map(() => !allSelected));
  };

  const selectedCount = selected.filter(Boolean).length;
  const allSelected = selectedCount === questions.length;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.title}>检测到 {questions.length} 道题目</div>
          <div style={styles.subtitle}>选择要批改的题目 · {estimatedLabel}</div>
        </div>

        <div style={styles.list}>
          {questions.map((q, i) => (
            <label key={i} style={{ ...styles.item, ...(selected[i] ? styles.itemActive : {}) }}>
              <input
                type="checkbox"
                checked={selected[i]}
                onChange={() => toggle(i)}
                style={styles.checkbox}
              />
              <span style={styles.itemNum}>{i + 1}</span>
              <span style={styles.itemText} title={q}>
                {q.slice(0, 80)}{q.length > 80 ? '...' : ''}
              </span>
            </label>
          ))}
        </div>

        <div style={styles.footer}>
          <button onClick={toggleAll} style={styles.toggleAllBtn}>
            {allSelected ? '取消全选' : '全选'}
          </button>
          <button onClick={onCancel} style={styles.cancelBtn}>
            取消
          </button>
          <button
            onClick={() => {
              const selectedQuestions = questions.filter((_, i) => selected[i]);
              if (selectedQuestions.length > 0) onConfirm(selectedQuestions);
            }}
            disabled={selectedCount === 0}
            style={{ ...styles.confirmBtn, ...(selectedCount === 0 ? styles.confirmBtnDisabled : {}) }}
          >
            批改已选 ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '420px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 20px 12px',
    borderBottom: '1px solid #eef0f4',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8e95a2',
    marginTop: '4px',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 20px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  itemActive: {
    background: '#f0f4ff',
  },
  checkbox: {
    marginTop: '2px',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#4f6ef7',
  },
  itemNum: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4f6ef7',
    minWidth: '20px',
    textAlign: 'center',
    flexShrink: 0,
  },
  itemText: {
    fontSize: '13px',
    color: '#333',
    lineHeight: '1.5',
    wordBreak: 'break-all',
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px',
    borderTop: '1px solid #eef0f4',
  },
  toggleAllBtn: {
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#666',
    background: '#f0f2f5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#d63031',
    background: 'white',
    border: '1px solid #d63031',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'white',
    background: '#4f6ef7',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
