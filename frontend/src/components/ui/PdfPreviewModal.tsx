import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../api/api';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  certHash: string;
}

export const PdfPreviewModal = ({ isOpen, onClose, pdfUrl, certHash }: PdfPreviewModalProps) => {
  const [loadingWa, setLoadingWa] = useState(false);
  const [waSuccess, setWaSuccess] = useState(false);

  const handleSendWhatsapp = async () => {
    setLoadingWa(true);
    setWaSuccess(false);
    try {
      await api.post(`/admin/certificates/send_whatsapp/${certHash}`);
      setWaSuccess(true);
      setTimeout(() => setWaSuccess(false), 3000);
    } catch {
      alert('Error al enviar WhatsApp. Revisa la consola o configuración del servidor.');
    } finally {
      setLoadingWa(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📄 Certificado Digital Oficial" maxWidth="max-w-[700px]">
      <div className="flex flex-col gap-4">
        <div className="w-full h-[60vh] bg-card border border-border rounded-xl overflow-hidden relative">
          {!pdfUrl ? (
            <div className="absolute inset-0 flex items-center justify-center text-text-dim">Cargando PDF...</div>
          ) : (
            <iframe 
              src={pdfUrl} 
              className="w-full h-full border-0 bg-white"
              title="Visor PDF"
            />
          )}
        </div>
        
        <div className="flex gap-4 mt-2">
          <button 
            onClick={handleSendWhatsapp}
            disabled={loadingWa || !certHash}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${waSuccess ? 'bg-success text-white' : 'bg-[#25D366] text-white hover:opacity-90'} disabled:opacity-50`}
          >
            {loadingWa ? 'Enviando...' : waSuccess ? '✅ Enviado por WhatsApp' : '📱 Enviar por WhatsApp al Dueño'}
          </button>
          
          <button 
            onClick={onClose}
            className="px-8 bg-bg border border-border text-text-dim py-3 rounded-xl font-semibold hover:text-text-main transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
