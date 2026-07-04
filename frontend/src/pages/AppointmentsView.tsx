import type { AppointmentsResponse, Appointment, PatientOwner } from '../types/models';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { TicketModal } from '../components/appointments/TicketModal';
import { CalendarPlus, Calendar, Clock, User, Dog, CalendarClock } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'waiting', label: 'Marcar En Espera' },
  { value: 'confirmed', label: 'Marcar Confirmada' },
  { value: 'attended', label: 'Marcar Atendido (Cobrar)' },
  { value: 'cancelled', label: 'Marcar Suspendido' }
];

const AppointmentRow = memo(({ 
  appt, 
  onStatusChange, 
  onNavigate 
}: { 
  appt: { appointment: Appointment; owner: PatientOwner }, 
  onStatusChange: (id: number, status: string) => void,
  onNavigate: (petName: string) => void
}) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'En espera';
      case 'confirmed': return 'Confirmada';
      case 'attended': return 'Atendido';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getStatusVariant = (status: string): 'warning' | 'success' | 'info' | 'error' | 'default' => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'confirmed': return 'success';
      case 'attended': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(appt.appointment.id, e.target.value);
  }, [appt.appointment.id, onStatusChange]);

  const handleNavigate = useCallback(() => {
    onNavigate(appt.appointment.pet_name);
  }, [appt.appointment.pet_name, onNavigate]);

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
          <Calendar className="w-4 h-4 text-slate-400" />
          {new Date(appt.appointment.date).toLocaleDateString('es-AR')}
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
          <Clock className="w-3.5 h-3.5" />
          {new Date(appt.appointment.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div
          className="flex items-center gap-2 text-slate-900 dark:text-white font-medium cursor-pointer group"
          onClick={handleNavigate}
          title={`Ver ficha de ${appt.appointment.pet_name} en Pacientes`}
        >
          <Dog className="w-4 h-4 text-[#14b8a6] group-hover:scale-110 transition-transform" />
          <span className="group-hover:text-[#14b8a6] transition-colors underline-offset-2 group-hover:underline">
            {appt.appointment.pet_name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
          <User className="w-3.5 h-3.5" />
          {appt.owner.name}
        </div>
      </td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
        {appt.appointment.reason}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge variant={getStatusVariant(appt.appointment.status)}>
          {getStatusLabel(appt.appointment.status)}
        </Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Select 
          fullWidth={false}
          className="w-40 py-1.5 text-xs"
          value={appt.appointment.status}
          onChange={handleStatusChange}
          disabled={appt.appointment.status === 'attended' || appt.appointment.status === 'cancelled'}
          options={STATUS_OPTIONS}
        />
      </td>
    </tr>
  );
});

export const AppointmentsView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AppointmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    pet_name: '',
    owner_phone: '',
    owner_name: '',
    date: '',
    time: '',
    reason: ''
  });

  // Ticket Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null);
  // Stable helper: converts raw API [{appointment, owner}] → flat appointment list
  const normalizeAppointments = useCallback(
    (raw: { appointment: Appointment; owner: PatientOwner }[]) =>
      raw.map((row) => ({
        id: row.appointment.id,
        pet_name: row.appointment.pet_name,
        owner_name: row.owner?.name || '',
        reason: row.appointment.reason || '',
        date: row.appointment.date,
        status: row.appointment.status,
      })),
    []
  );

  // Functions moved to AppointmentRow

  const handleNavigateToPatient = useCallback((petName: string) => {
    navigate(`/admin/patients?search=${encodeURIComponent(petName)}`);
  }, [navigate]);

  const handleModalClose = useCallback(() => setIsModalOpen(false), []);
  const handleTicketModalClose = useCallback(() => setIsTicketModalOpen(false), []);
  const handleNewAppointmentClick = useCallback(() => setIsModalOpen(true), []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

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
      const raw = response.data?.all_appointments || [];
      setData({ ...response.data, appointments: normalizeAppointments(raw) });
    } catch (err) {
      console.error("Error updating status", err);
    }
  }, [normalizeAppointments]);

  const refreshAppointments = useCallback(async () => {
    const response = await api.get('/admin/');
    const raw = response.data?.all_appointments || [];
    setData({ ...response.data, appointments: normalizeAppointments(raw) });
  }, [normalizeAppointments]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const combinedDate = `${formData.date}T${formData.time}`;
      await api.post('/admin/add_appointment', { ...formData, date: combinedDate });
      setIsModalOpen(false);
      setFormData({ pet_name: '', owner_phone: '', owner_name: '', date: '', time: '', reason: '' });
      const response = await api.get('/admin/');
      const raw = response.data?.all_appointments || [];
      setData({ ...response.data, appointments: normalizeAppointments(raw) });
    } catch (err) {
      console.error("Error saving appointment", err);
    }
  }, [formData, normalizeAppointments]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/admin/');
        const raw = response.data?.all_appointments || [];
        setData({ ...response.data, appointments: normalizeAppointments(raw) });
      } catch (err) {
        console.error("Error fetching appointments data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [normalizeAppointments]);

  if (loading) return <FullPageLoader />;

  return (
    <AdminLayout orgName={data?.org?.name} username={data?.user?.full_name || data?.user?.username}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#14b8a6]" />
              Calendario de Citas
            </h2>
            <p className="text-sm text-slate-500 mt-1">Administra los turnos de la clínica</p>
          </div>
          <Button variant="primary" icon={CalendarPlus} onClick={handleNewAppointmentClick}>
            Nueva Cita
          </Button>
        </div>

        {data?.appointments && data.appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Fecha y Hora</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Paciente</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Motivo</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.appointments.map((appt: { appointment: Appointment; owner: PatientOwner }, idx: number) => (
                  <AppointmentRow 
                    key={appt.appointment.id || idx} 
                    appt={appt} 
                    onStatusChange={handleStatusChange} 
                    onNavigate={handleNavigateToPatient}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            icon={CalendarClock}
            title="No hay citas programadas"
            description="Actualmente no hay ninguna cita registrada en la base de datos."
            action={
              <Button variant="outline" icon={CalendarPlus} onClick={handleNewAppointmentClick}>Agendar la primera cita</Button>
            }
          />
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        title="Agendar Nueva Cita" 
        maxWidth="max-w-[500px]"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input 
            label="Nombre de la Mascota *" 
            name="pet_name"
            value={formData.pet_name}
            onChange={handleInputChange}
            placeholder="Ej: Max"
            required
          />
          <Input 
            label="Teléfono del Dueño *" 
            type="tel"
            name="owner_phone"
            value={formData.owner_phone}
            onChange={handleInputChange}
            placeholder="Ej: +541123456789"
            required
          />
          <Input 
            label="Nombre del Dueño (Opcional)" 
            name="owner_name"
            value={formData.owner_name}
            onChange={handleInputChange}
            placeholder="Ej: Juan Pérez"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                label="Fecha *" 
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="flex-1">
              <Input 
                label="Hora *" 
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <Textarea 
            label="Motivo de la Cita (Opcional)"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            rows={3}
            placeholder="Ej: Consulta general, vacunación..."
          />
          
          <div className="flex gap-4 mt-2">
            <Button type="submit" className="flex-1">Confirmar Cita</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={handleModalClose}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <TicketModal
        isOpen={isTicketModalOpen}
        appointmentId={selectedApptId}
        onClose={handleTicketModalClose}
        onSuccess={refreshAppointments}
      />
    </AdminLayout>
  );
};
