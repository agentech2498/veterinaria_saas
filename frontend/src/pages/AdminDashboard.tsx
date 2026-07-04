import { useEffect, useState, useCallback, memo } from 'react';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { CalendarClock, Dog, Activity, MessageCircle } from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/Spinner';
import { TicketModal } from '../components/appointments/TicketModal';
import type { AdminDashboardResponse, Appointment, PatientOwner } from '../types/models';

const RecentAppointmentRow = memo(({ 
  item, 
  onStatusChange 
}: { 
  item: { appointment: Appointment; owner: PatientOwner }, 
  onStatusChange: (id: number, status: string) => void 
}) => {
  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(item.appointment.id, e.target.value);
  }, [item.appointment.id, onStatusChange]);

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#14b8a6]/10 flex items-center justify-center text-[#14b8a6]">
            <Dog size={16} />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">{item.appointment.pet_name}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
        {item.owner.name || item.owner.phone_number}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
        {new Date(item.appointment.date).toLocaleString('es-ES', { 
          weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select 
          value={item.appointment.status}
          onChange={handleSelectChange}
          disabled={item.appointment.status === 'attended' || item.appointment.status === 'cancelled'}
          className={`appearance-none font-medium rounded-full px-3 py-1 text-xs border outline-none cursor-pointer focus:ring-2
            ${item.appointment.status === 'confirmed' ? 'bg-[#d1fae5] dark:bg-[rgba(16,185,129,0.1)] text-[#047857] dark:text-[#34d399] border-[#a7f3d0] dark:border-[rgba(16,185,129,0.2)]' : ''}
            ${item.appointment.status === 'waiting' ? 'bg-[#fef3c7] dark:bg-[rgba(245,158,11,0.1)] text-[#b45309] dark:text-[#fbbf24] border-[#fde68a] dark:border-[rgba(245,158,11,0.2)]' : ''}
            ${item.appointment.status === 'attended' ? 'bg-[#dbeafe] dark:bg-[rgba(59,130,246,0.1)] text-[#1d4ed8] dark:text-[#60a5fa] border-[#bfdbfe] dark:border-[rgba(59,130,246,0.2)]' : ''}
            ${item.appointment.status === 'cancelled' ? 'bg-[#fee2e2] dark:bg-[rgba(239,68,68,0.1)] text-[#b91c1c] dark:text-[#f87171] border-[#fecaca] dark:border-[rgba(239,68,68,0.2)]' : ''}
          `}
        >
          <option value="confirmed">Confirmado</option>
          <option value="waiting">En espera</option>
          <option value="attended">Atendido (Cobrar)</option>
          <option value="cancelled">Suspendido</option>
        </select>
      </td>
    </tr>
  );
});

export const AdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null);

  const handleStatusChange = useCallback(async (app_id: number, new_status: string) => {
    if (!new_status) return;
    if (new_status === 'attended') {
      setSelectedApptId(app_id);
      setIsTicketModalOpen(true);
      return;
    }
    try {
      await api.post(`/admin/update_appointment_status/${app_id}`, { status: new_status });
      const response = await api.get('/admin/');
      setData(response.data);
    } catch (err) {
      console.error('Error updating status', err);
    }
  }, []);

  const handleTicketSuccess = useCallback(async () => {
    const response = await api.get('/admin/');
    setData(response.data);
  }, []);

  const handleTicketClose = useCallback(() => {
    setIsTicketModalOpen(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/admin/');
        setData(response.data);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <FullPageLoader />;

  return (
    <AdminLayout orgName={data?.org?.name} username={data?.user?.full_name || data?.user?.username}>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 -translate-y-4 translate-x-4">
            <CalendarClock size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#14b8a6]/10 p-3 rounded-xl text-[#14b8a6]">
              <CalendarClock size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">CITAS TOTALES</div>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{data?.total_appointments}</div>
            <Badge variant="success" size="sm">+12% este mes</Badge>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 -translate-y-4 translate-x-4">
            <Activity size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500">
              <Activity size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">PACIENTES ACTIVOS</div>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{data?.patients_count}</div>
            <span className="text-xs font-medium text-slate-500">Registrados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 -translate-y-4 translate-x-4">
            <MessageCircle size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
              <MessageCircle size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">ESTADO WHATSAPP</div>
          </div>
          <div className="mt-1">
            <Badge variant={data?.org?.evolution_instance ? 'success' : 'warning'} className="mb-2">
              {data?.org?.evolution_instance ? 'Conectado' : 'Sin conexión'}
            </Badge>
            <div className="text-xs text-slate-500 font-medium">Instancia: {data?.org?.evolution_instance || 'No configurada'}</div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Citas Recientes</h2>
            <p className="text-sm text-slate-500 mt-1">Últimas interacciones por WhatsApp</p>
          </div>
        </div>
        
        {data?.recent_appointments && data.recent_appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Paciente</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Dueño</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Fecha Programada</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.recent_appointments.map((item: { appointment: Appointment; owner: PatientOwner }, idx: number) => (
                  <RecentAppointmentRow 
                    key={item.appointment.id || idx} 
                    item={item} 
                    onStatusChange={handleStatusChange} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            icon={CalendarClock}
            title="No hay citas recientes"
            description="Las citas agendadas por WhatsApp o manualmente aparecerán aquí."
          />
        )}
      </div>

      <TicketModal
        isOpen={isTicketModalOpen}
        appointmentId={selectedApptId}
        onClose={handleTicketClose}
        onSuccess={handleTicketSuccess}
      />
    </AdminLayout>
  );
};

