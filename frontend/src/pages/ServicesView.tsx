import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/Spinner';
import { Tags, Plus, Pencil, Trash2, Stethoscope } from 'lucide-react';
import type { ServicesResponse, Service } from '../types/models';

export const ServicesView = () => {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Consultas',
    description: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/admin/'); // Currently the root returns services too
        setData(response.data);
      } catch (err) {
        console.error("Error fetching services data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openModal = (service?: Service) => {
    if (service) {
      setEditId(service.id);
      setFormData({
        name: service.name,
        price: service.price.toString(),
        category: service.category,
        description: service.description || ''
      });
    } else {
      setEditId(null);
      setFormData({ name: '', price: '', category: 'Consultas', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.post(`/admin/update_service/${editId}`, formData);
      } else {
        await api.post('/admin/add_service', formData);
      }
      setIsModalOpen(false);
      
      // Refresh the list
      const response = await api.get('/admin/');
      setData(response.data);
    } catch (err) {
      console.error("Error saving service", err);
    }
  };

  if (loading) return <FullPageLoader />;

  return (
    <AdminLayout orgName={data?.org?.name} username={data?.user?.full_name || data?.user?.username}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tags className="w-5 h-5 text-[#14b8a6]" />
              Gestión de Servicios y Precios
            </h2>
            <p className="text-sm text-slate-500 mt-1">Configura el catálogo de servicios de la clínica</p>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => openModal()}>
            Nuevo Servicio
          </Button>
        </div>

        {data?.services && data.services.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Servicio</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Categoría</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Precio</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Descripción</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.services.map((s: Service, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Stethoscope size={16} />
                        </div>
                        <strong className="text-slate-900 dark:text-white font-semibold">{s.name}</strong>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="default" size="sm">{s.category}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[#0d9488] dark:text-[#2dd4bf] font-bold text-base">
                        ${Number(s.price).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-[250px] truncate">
                      {s.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          icon={Pencil} 
                          onClick={() => openModal(s)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          icon={Trash2}
                        >
                          Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            icon={Tags}
            title="Catálogo vacío"
            description="Agrega tus primeros servicios y consultas para poder atender a los pacientes."
            action={
              <Button variant="outline" icon={Plus} onClick={() => openModal()}>Crear el primer servicio</Button>
            }
          />
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editId ? "Editar Servicio" : "Nuevo Servicio"} 
        maxWidth="max-w-[500px]"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input 
            label="Nombre del Servicio" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="Ej: Consulta General"
          />
          <Input 
            label="Precio ($)" 
            type="number" 
            step="0.01"
            value={formData.price}
            onChange={e => setFormData({...formData, price: e.target.value})}
            placeholder="0.00"
          />
          <Select 
            label="Categoría"
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
            options={[
              { value: 'Consultas', label: 'Consultas' },
              { value: 'Vacunas', label: 'Vacunas' },
              { value: 'Cirugías', label: 'Cirugías' },
              { value: 'Estudios', label: 'Estudios' },
              { value: 'Peluquería', label: 'Peluquería' },
              { value: 'Otros', label: 'Otros' }
            ]}
          />
          <Textarea 
            label="Descripción (Opcional)"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            rows={3}
            placeholder="Detalles sobre el servicio..."
          />
          
          <div className="flex gap-4 mt-2">
            <Button type="submit" className="flex-1">{editId ? 'Guardar Cambios' : 'Crear Servicio'}</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};
