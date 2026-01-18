interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-300 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
