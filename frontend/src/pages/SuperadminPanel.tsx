import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { LogOut, Building, Users, Plus, Edit2, Trash2, RefreshCw, Activity, ShieldAlert } from 'lucide-react';
import { OrgModal } from '../components/Superadmin/OrgModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/Spinner';
import type { SuperadminResponse, Organization } from '../types/models';

export const SuperadminPanel = () => {
  const [data, setData] = useState<SuperadminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const logout = useAuthStore((state) => state.logout);

  const fetchData = async () => {
    try {
      const response = await api.get('/superadmin/');
      setData(response.data);
    } catch (err) {
      console.error("Error fetching superadmin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveOrg = async (formData: any) => {
    if (selectedOrg) {
      await api.post(`/superadmin/update_org/${selectedOrg.id}`, formData);
    } else {
      await api.post('/superadmin/create_org', formData);
    }
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿ESTÁS SEGURO? Se eliminarán TODOS los pacientes, citas y datos de esta clínica sin recuperación.')) {
      try {
        await api.delete(`/superadmin/delete_org/${id}`);
        fetchData();
      } catch {
        alert('Error al eliminar');
      }
    }
  };

  const handleSyncWebhook = async (id: number) => {
    setSyncing(id);
    try {
      const res = await api.post(`/superadmin/register_webhook/${id}`);
      alert(res.data.message);
    } catch (err: Error | unknown) {
      alert((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Error al configurar el webhook');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <FullPageLoader />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-outfit selection:bg-[#14b8a6]/20">
      {/* Sidebar */}
      <aside className="w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 relative z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 py-4 border-b border-slate-800">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">DogBot SaaS</h1>
              <p className="text-xs text-indigo-300 font-medium tracking-wider uppercase mt-0.5">Super Admin</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#14b8a6]/10 text-[#14b8a6] rounded-xl font-semibold transition-all group">
            <Building size={20} className="group-hover:scale-110 transition-transform" />
            <span>Clínicas</span>
            <span className="ml-auto bg-[#14b8a6] text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {data?.organizations?.length || 0}
            </span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
            <Users size={20} className="group-hover:scale-110 transition-transform" />
            <span>Usuarios SaaS</span>
          </a>
          
          <div className="my-6 border-t border-slate-800/50"></div>
          
          <a href="/admin" className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all">
            <Activity size={18} />
            <span>Ir a Mi Veterinaria →</span>
          </a>
        </nav>
        
        <div className="p-4 mt-auto">
          <button 
            onClick={logout} 
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="px-8 py-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Panel SuperAdmin
              </h2>
              <p className="text-sm text-slate-500 mt-1">Gestión central de suscripciones y clínicas veterinarias.</p>
            </div>
            <Button 
              variant="primary" 
              icon={Plus} 
              onClick={() => { setSelectedOrg(null); setModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 border-indigo-600 shadow-lg shadow-indigo-500/20"
            >
              Nueva Clínica
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-slate-400" />
                Clínicas Registradas
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">ID</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Nombre</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Slug / Instancia</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.organizations?.length || 0) > 0 ? (
                    data?.organizations?.map((org: Organization) => (
                      <tr key={org.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">#{org.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{org.name}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded font-mono text-xs inline-block mt-3 ml-6">{org.slug}</td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={org.is_active ? 'success' : 'error'}
                          >
                            {org.is_active ? 'Activa' : 'Suspendida'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleSyncWebhook(org.id)}
                              disabled={syncing === org.id}
                              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Sincronizar Webhook WhatsApp"
                            >
                              <RefreshCw className={`w-4 h-4 ${syncing === org.id ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                              onClick={() => { setSelectedOrg(org); setModalOpen(true); }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Editar Clínica"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(org.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Eliminar Clínica (Irreversible)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <EmptyState 
                          icon={Building}
                          title="No hay clínicas registradas"
                          description="Comienza creando la primera clínica para tu plataforma SaaS."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      <OrgModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedOrg(null); }}
        onSave={handleSaveOrg}
        initialData={selectedOrg}
      />
    </div>
  );
};
