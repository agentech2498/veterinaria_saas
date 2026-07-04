import React, { useCallback, useState } from 'react';
import { Modal } from '../ui/Modal';
import { UploadCloud, X } from 'lucide-react';
import { uploadStamp, uploadBadge } from '../../api/identityService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'firma' | 'sello' | 'badge';
}

export const UploadModal = ({ isOpen, onClose, type }: UploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = type === 'firma' ? 'Subir Firma' : type === 'badge' ? 'Subir Insignia Oficial' : 'Subir Sello Profesional';

  const handleFile = (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('La imagen supera los 5MB permitidos.');
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    try {
      if (type === 'firma') {
        // Fallback file upload for signature if not using canvas
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const { uploadSignature } = await import('../../api/identityService');
          await uploadSignature(reader.result as string);
          alert('Firma guardada correctamente.');
          onClose();
        };
        return;
      } else if (type === 'sello') {
        await uploadStamp(file);
      } else if (type === 'badge') {
        await uploadBadge(file);
      }
      
      alert('Imagen procesada correctamente.');
      onClose();
    } catch {
      alert('Error al subir la imagen');
    } finally {
      if (type !== 'firma') setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-[480px]">
      {!preview ? (
        <div 
          className={`min-h-[220px] border-2 border-dashed rounded-[16px] flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-sidebar-hover' : 'border-border bg-bg hover:border-primary-light'}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => document.getElementById('hiddenFileInput')?.click()}
        >
          <input 
            type="file" 
            id="hiddenFileInput" 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp" 
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
          <UploadCloud className="w-12 h-12 text-text-dim mb-4" />
          <h3 className="text-[1.1rem] text-text-main font-semibold">Arrastra tu imagen aquí</h3>
          <p className="text-text-dim text-[0.9rem] mt-2">o haz clic para explorar</p>
          <div className="flex gap-2 mt-4">
            <span className="bg-card border border-border px-2 py-1 rounded text-xs font-bold text-text-main">JPG</span>
            <span className="bg-card border border-border px-2 py-1 rounded text-xs font-bold text-text-main">PNG</span>
            <span className="bg-card border border-border px-2 py-1 rounded text-xs font-bold text-text-main">WEBP</span>
          </div>
        </div>
      ) : (
        <div className="relative min-h-[220px] bg-white rounded-[16px] border border-border flex items-center justify-center p-4">
          <img src={preview} alt="Preview" className="max-h-[180px] max-w-full object-contain" />
          <button 
            onClick={clearSelection}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <p className="text-text-dim text-[0.8rem] text-center mt-4 mb-6">Tamaño máximo: 5MB</p>

      <div className="flex gap-4">
        <button 
          disabled={!file || loading}
          onClick={handleUpload}
          className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Subiendo...' : 'Guardar Imagen'}
        </button>
        <button 
          onClick={onClose}
          className="flex-1 bg-bg border border-border text-text-dim py-3 rounded-xl font-semibold hover:text-text-main transition-colors"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
};
