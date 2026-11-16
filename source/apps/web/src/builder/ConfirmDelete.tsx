// The confirmation dialog before a block or a flow is deleted (F-06 AC-034). The question comes from the edit functions
// (`deleteBlockQuestion`, `deleteFlowQuestion`), which name the item and say what is left unwired. Nothing is removed
// until the user confirms.
export interface ConfirmDeleteProps {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDelete({ question, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <section role="dialog" aria-modal="true" aria-label="Confirm delete" style={dialogStyle}>
      <p>{question}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onConfirm}>
          Delete
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

const dialogStyle = {
  border: '1px solid #18181b',
  borderRadius: 8,
  padding: '10px 12px',
  marginTop: 12,
  background: '#ffffff',
} as const;
