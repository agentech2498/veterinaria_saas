import type { User as UserModel, Organization } from '../types/models';
import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { PasswordModal } from '../components/profile/PasswordModal';
import { ProfessionalIdentityView } from '../components/profile/ProfessionalIdentityView';
import { Button } from '../components/ui/Button';
import { FullPageLoader } from '../components/ui/Spinner';
import { User as UserIcon, Key } from 'lucide-react';

export const ProfileView = () => {
  const [data, setData] = useState<{ user: UserModel, org: Organization } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/admin/'); // Endpoint is returning all context for now
        setData(response.data);
      } catch (err) {
        console.error("Error fetching profile data", err);
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
            <UserIcon className="w-5 h-5 text-[#14b8a6]" />
            Perfil y Configuración
          </h2>
          <p className="text-sm text-slate-500 mt-1">Administra tus datos personales y seguridad</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Identidad Profesional - Nuevo Módulo Centralizado */}
        <ProfessionalIdentityView />

        {/* Seguridad */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between max-w-2xl">
          <div>
            <div className="mb-6 flex items-center gap-2">
              <Key className="text-amber-500" size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">Seguridad</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              Actualiza tu contraseña periódicamente para mantener tu cuenta segura. 
              Al cambiarla, se cerrarán otras sesiones activas por seguridad.
            </p>
          </div>
          <Button 
            variant="outline" 
            icon={Key} 
            onClick={() => setIsPassModalOpen(true)}
          >
            Cambiar Contraseña
          </Button>
        </div>

      </div>

      <PasswordModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
    </AdminLayout>
  );
};
