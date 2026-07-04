import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../api/api';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordModal = ({ isOpen, onClose }: PasswordModalProps) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const passwordsMatch = newPass === confirmPass;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || newPass.length < 8) return;
    
    setLoading(true);
    setError('');
    try {
      await api.post('/admin/change_password', { old_password: oldPass, new_password: newPass });
      alert('Contraseña actualizada con éxito');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      onClose();
    } catch (err: Error | unknown) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔑 Cambiar contraseña" maxWidth="max-w-[420px]">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-text-dim text-[0.9rem] font-medium mb-2">Contraseña Actual</label>
          <input 
            type="password" 
            required
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text-main outline-none focus:border-primary transition-colors" 
          />
        </div>
        <div>
          <label className="block text-text-dim text-[0.9rem] font-medium mb-2">Nueva Contraseña</label>
          <input 
            type="password"
            required
            minLength={8}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text-main outline-none focus:border-primary transition-colors" 
          />
        </div>
        <div>
          <label className="block text-text-dim text-[0.9rem] font-medium mb-2">Confirmar Nueva Contraseña</label>
          <input 
            type="password" 
            required
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text-main outline-none focus:border-primary transition-colors" 
          />
          {confirmPass.length > 0 && !passwordsMatch && (
            <div className="text-[#f43f5e] text-[0.8rem] mt-2">Las contraseñas no coinciden</div>
          )}
        </div>
        
        <div className="flex gap-4 mt-4">
          <button 
            type="submit" 
            disabled={loading || !passwordsMatch || newPass.length < 8}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Actualizar'}
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 bg-bg border border-border text-text-dim py-3 rounded-xl font-semibold hover:text-text-main transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
};
