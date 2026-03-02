'use client';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
  onDownloadCSV: () => void;
}

export default function DownloadModal({
  isOpen,
  onClose,
  onDownloadPDF,
  onDownloadExcel,
  onDownloadCSV,
}: DownloadModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border-2 border-retro-dark shadow-xl">
        <h2 className="text-xl font-bold text-retro-dark mb-4">Download Report</h2>
        <p className="text-retro-dark mb-6">Choose a format to download:</p>
        
        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              onDownloadPDF();
              onClose();
            }}
            className="px-4 py-2 bg-red-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity text-left"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => {
              onDownloadExcel();
              onClose();
            }}
            className="px-4 py-2 bg-green-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity text-left"
          >
            Excel
          </button>
          <button
            type="button"
            onClick={() => {
              onDownloadCSV();
              onClose();
            }}
            className="px-4 py-2 bg-blue-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity text-left"
          >
            CSV
          </button>
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border-2 border-retro-dark text-retro-dark font-bold text-sm rounded hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

