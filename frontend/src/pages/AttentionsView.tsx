import type { Patient, PatientsResponse } from '../types/models';
import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { FullPageLoader } from '../components/ui/Spinner';
import { Activity, Plus, Clock, UserCheck, CheckCircle2, FileText, Banknote } from 'lucide-react';

export const AttentionsView = () => {
  const [data, setData] = useState<PatientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/admin/'); // Replace with /attentions/active when backend supports it fully
        setData(response.data);
      } catch (err) {
        console.error("Error fetching attentions data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <FullPageLoader />;

  return (
    <AdminLayout orgName={data?.org?.name} username={data?.user?.full_name || data?.user?.username}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#14b8a6]" />
            Gestión de Atenciones (Sala)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Monitorea el flujo de pacientes en la clínica</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsNewModalOpen(true)}>
          Nueva Atención
        </Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        
        {/* Column 1: En Espera */}
        <div className="flex-1 min-w-[320px] bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock size={16} />
            </div>
            <h3 className="text-[1.05rem] font-bold text-slate-900 dark:text-white">En Espera</h3>
            <span className="ml-auto bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">0</span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No hay pacientes en espera</p>
            </div>
          </div>
        </div>

        {/* Column 2: En Consulta */}
        <div className="flex-1 min-w-[320px] bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/30 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <UserCheck size={16} />
            </div>
            <h3 className="text-[1.05rem] font-bold text-slate-900 dark:text-white">En Consulta</h3>
            <span className="ml-auto bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">0</span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-blue-100 dark:border-blue-900/20 rounded-xl">
              <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 font-medium text-sm">Ninguna consulta activa</p>
            </div>
          </div>
        </div>

        {/* Column 3: Finalizados */}
        <div className="flex-1 min-w-[320px] bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={16} />
            </div>
            <h3 className="text-[1.05rem] font-bold text-slate-900 dark:text-white">Finalizados (Hoy)</h3>
            <span className="ml-auto bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">0</span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-emerald-100 dark:border-emerald-900/20 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No hay finalizados aún</p>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Nueva Atención */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="🏥 Nueva Atención" maxWidth="max-w-[500px]">
        <div className="flex flex-col gap-5">
          <Select 
            label="Paciente"
            defaultValue=""
            options={[
              { value: '', label: 'Seleccione un paciente...' },
              ...(data?.patients?.map((p: { patient: Patient; owner: import('../types/models').PatientOwner }) => ({ value: p.patient.id, label: p.patient.name })) || [])
            ]}
          />
          <Textarea 
            label="Notas Iniciales (Motivo)"
            rows={3} 
            placeholder="Motivo de la consulta..."
          />
          <div className="flex gap-4 mt-2">
            <Button className="flex-1">Iniciar Consulta</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Finalizar (Placeholder visual del original) */}
      <Modal isOpen={isFinishModalOpen} onClose={() => setIsFinishModalOpen(false)} title="🧾 Finalizar Consulta y Generar Ticket" maxWidth="max-w-[800px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Agregar Servicios
            </h3>
            <div className="text-slate-500 text-sm">Panel de selección de servicios...</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" /> Resumen del Ticket
            </h3>
            <div className="text-slate-500 text-center py-8 text-sm">Vacío</div>
            <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4 text-right">
              <div className="text-slate-500 text-sm mb-1">Total a cobrar</div>
              <div className="font-bold text-3xl text-slate-900 dark:text-white">$0.00</div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <Button variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">Finalizar y Cobrar</Button>
          <Button variant="secondary" onClick={() => setIsFinishModalOpen(false)}>Cerrar</Button>
        </div>
      </Modal>

    </AdminLayout>
  );
};
