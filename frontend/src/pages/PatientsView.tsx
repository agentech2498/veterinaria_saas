import type { PatientsResponse, Patient, PatientOwner } from '../types/models';
import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { PatientModal } from '../components/patients/PatientModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/Spinner';
import { Search, Download, Dog, Eye, Trash2, Users } from 'lucide-react';

const PatientRow = memo(({ 
  row, 
  onView 
}: { 
  row: { patient: Patient; owner: PatientOwner }, 
  onView: (row: { patient: Patient; owner: PatientOwner }) => void 
}) => {
  const handleView = useCallback(() => {
    onView(row);
  }, [row, onView]);

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#14b8a6]/10 flex items-center justify-center text-[#14b8a6] shrink-0">
            <Dog size={20} />
          </div>
          <div>
            <strong className="block text-slate-900 dark:text-white font-semibold cursor-pointer hover:text-[#14b8a6] transition-colors" onClick={handleView}>
              {row.patient.name}
            </strong>
            <span className="text-xs text-slate-500">{row.patient.sex || 'No especificado'}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-slate-900 dark:text-white font-medium">{row.owner?.name || 'S/N'}</div>
        <div className="text-slate-500 text-xs mt-0.5">{row.owner?.phone_number}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
        {row.patient.breed || row.patient.species}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-slate-900 dark:text-white font-medium">
          {row.patient.birth_date ? new Date().getFullYear() - new Date(row.patient.birth_date).getFullYear() + ' años' : '--'}
        </div>
        <div className="text-slate-500 text-xs mt-0.5">
          {row.patient.weight || '--'} kg / {row.patient.height || '--'} cm
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Eye} 
            onClick={handleView}
          >
            Ver Detalle
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            icon={Trash2}
          >
            Eliminar
          </Button>
        </div>
      </td>
    </tr>
  );
});

export const PatientsView = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PatientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<{ patient: Patient; owner: PatientOwner } | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/admin/'); // Currently the root returns patients too
      setData(response.data);
    } catch (err) {
      console.error("Error fetching patients data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPatient(null);
  }, []);

  const autoOpened = useRef(false);

  // Auto-open modal when navigated from Citas with ?search=pet_name
  useEffect(() => {
    if (!loading && data?.patients && searchTerm && !autoOpened.current) {
      autoOpened.current = true;
      const matches = data.patients.filter((row: { patient: Patient; owner: PatientOwner }) =>
        row.patient.name.toLowerCase() === searchTerm.toLowerCase()
      );
      if (matches.length === 1) {
        setSelectedPatient(matches[0]);
      }
    }
  }, [loading, data, searchTerm]);

  const filteredPatients = useMemo(() => {
    if (!data?.patients) return [];
    if (!searchTerm) return data.patients;
    return data.patients.filter((row: { patient: Patient; owner: PatientOwner }) =>
      row.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.owner?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data?.patients, searchTerm]);

  if (loading) return <FullPageLoader />;

  return (
    <AdminLayout orgName={data?.org?.name} username={data?.user?.full_name || data?.user?.username}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#14b8a6]" />
              Gestión de Pacientes
            </h2>
            <p className="text-sm text-slate-500 mt-1">Base de datos de mascotas registradas</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="w-[300px]">
              <Input 
                icon={Search} 
                placeholder="Buscar paciente o dueño..." 
                fullWidth
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <Button variant="secondary" icon={Download}>
              Exportar
            </Button>
          </div>
        </div>

        {data?.patients && data.patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Paciente</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Dueño</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Raza / Especie</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Física</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPatients.map((row: any, idx: number) => (
                  <PatientRow 
                    key={row.patient.id || idx} 
                    row={row} 
                    onView={setSelectedPatient}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            icon={Dog}
            title="No hay pacientes registrados"
            description="Los pacientes creados manuales o por WhatsApp se mostrarán aquí."
          />
        )}
      </div>
      
      <PatientModal 
        isOpen={!!selectedPatient} 
        onClose={handleCloseModal} 
        patientData={selectedPatient}
        onSuccess={fetchData}
      />
    </AdminLayout>
  );
};
