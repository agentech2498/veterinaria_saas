
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2 } from 'lucide-react';

interface OrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any;
}

export const OrgModal = ({ isOpen, onClose, onSave, initialData }: OrgModalProps) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    admin_username: '',
    admin_password: '',
    evolution_api_url: '',
    evolution_api_key: '',
    evolution_instance: '',
    openai_api_key: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          slug: initialData.slug || '',
          admin_username: '',
          admin_password: '',
          evolution_api_url: initialData.evolution_api_url || '',
          evolution_api_key: initialData.evolution_api_key || '',
          evolution_instance: initialData.evolution_instance || '',
          openai_api_key: initialData.openai_api_key || ''
        });
      } else {
        setFormData({
          name: '',
          slug: '',
          admin_username: '',
          admin_password: '',
          evolution_api_url: '',
          evolution_api_key: '',
          evolution_instance: '',
          openai_api_key: ''
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la organización.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Clínica' : 'Nueva Clínica'} maxWidth="max-w-[700px]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Datos Generales</h3>
            <Input 
              label="Nombre de la Clínica *"
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <Input 
              label="Slug (URL identificador)"
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: e.target.value})} 
              placeholder="Ej: mi-veterinaria" 
            />

            {!isEditing && (
              <div className="pt-4 space-y-5">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Cuenta Administrador</h3>
                <Input 
                  label="Usuario Admin *"
                  required={!isEditing} 
                  value={formData.admin_username} 
                  onChange={e => setFormData({...formData, admin_username: e.target.value})} 
                />
                <Input 
                  label="Contraseña Admin *"
                  required={!isEditing} 
                  value={formData.admin_password} 
                  onChange={e => setFormData({...formData, admin_password: e.target.value})} 
                />
              </div>
            )}
          </div>

          <div className="space-y-5">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Integraciones API</h3>
            <Input 
              label="Evolution API URL"
              value={formData.evolution_api_url} 
              onChange={e => setFormData({...formData, evolution_api_url: e.target.value})} 
              placeholder="https://..." 
            />
            <Input 
              label="Evolution API Key (Global)"
              value={formData.evolution_api_key} 
              onChange={e => setFormData({...formData, evolution_api_key: e.target.value})} 
            />
            <Input 
              label="Evolution Instancia (Nombre)"
              value={formData.evolution_instance} 
              onChange={e => setFormData({...formData, evolution_instance: e.target.value})} 
            />
            <Input 
              label="OpenAI API Key (Bot IA)"
              value={formData.openai_api_key} 
              onChange={e => setFormData({...formData, openai_api_key: e.target.value})} 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-8">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
            icon={loading ? Loader2 : undefined}
            className={loading ? "[&>svg]:animate-spin" : ""}
          >
            {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Clínica')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
