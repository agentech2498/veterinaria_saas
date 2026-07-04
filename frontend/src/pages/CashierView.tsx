import type { Ticket, CashierResponse } from '../types/models';
import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/Spinner';
import { Wallet, Receipt, DollarSign, FileText, Download } from 'lucide-react';

export const CashierView = () => {
  const [metrics, setMetrics] = useState<{ total_revenue: number, ticket_count: number }>({ total_revenue: 0, ticket_count: 0 });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'hoy' | 'mes'>('hoy');
  const [error, setError] = useState<string | null>(null);
  
  // Org and User data (optional if needed from another endpoint, but we can get it from localStorage or simple /auth/me)
  // The layout usually handles org name from context, but if needed we can fetch it. For now, let's use the context/auth.
  const [orgData, setOrgData] = useState<CashierResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Map UI period to backend period
        const backendPeriod = period === 'hoy' ? 'today' : 'month';
        
        const [metricsRes, ticketsRes, adminRes] = await Promise.all([
          api.get(`/finance/metrics?period=${backendPeriod}`),
          api.get('/finance/tickets'),
          api.get('/admin/') // Just to get org/user for the layout as it was doing before
        ]);
        
        setMetrics(metricsRes.data);
        setTickets(ticketsRes.data);
        setOrgData(adminRes.data);
      } catch (err) {
        console.error("Error fetching cashier data", err);
        setError("Error al cargar los datos de caja.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const handleDownloadPDF = async (ticketId: number, ticketNumber: string) => {
    try {
      const response = await api.get(`/finance/ticket/${ticketId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket_${ticketNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading PDF", err);
      alert("Error al descargar el PDF");
    }
  };

  if (loading) return <FullPageLoader />;

  return (
    <AdminLayout orgName={orgData?.org?.name} username={orgData?.user?.full_name || orgData?.user?.username}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#14b8a6]" />
            Caja y Facturación
          </h2>
          <p className="text-sm text-slate-500 mt-1">Control de ingresos y tickets emitidos</p>
        </div>
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setPeriod('hoy')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === 'hoy' ? 'bg-white dark:bg-slate-700 text-[#14b8a6] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Hoy
          </button>
          <button 
            onClick={() => setPeriod('mes')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === 'mes' ? 'bg-white dark:bg-slate-700 text-[#14b8a6] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Este Mes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 -translate-y-4 translate-x-4">
            <DollarSign size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
              <DollarSign size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ingresos del Periodo ({period})
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            ${metrics?.total_revenue?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 -translate-y-4 translate-x-4">
            <Receipt size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500">
              <Receipt size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tickets Emitidos
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            {metrics?.ticket_count || 0}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              Últimos Tickets
            </h3>
          </div>
          <Button variant="outline" size="sm" icon={Download}>Descargar Excel</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider"># Ticket</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Fecha</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Paciente</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Total</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-500">{error}</td>
                </tr>
              ) : tickets.length > 0 ? (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      #{t.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {t.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {t.patient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">
                      ${t.total?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        t.status === 'paid' 
                          ? 'bg-[#d1fae5] text-[#047857] dark:bg-[rgba(16,185,129,0.1)] dark:text-[#34d399]' 
                          : 'bg-[#fef3c7] text-[#b45309] dark:bg-[rgba(245,158,11,0.1)] dark:text-[#fbbf24]'
                      }`}>
                        {t.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={Download}
                        onClick={() => handleDownloadPDF(t.id, t.number)}
                      >
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState 
                      icon={Receipt}
                      title="No hay tickets recientes"
                      description="Los tickets generados al finalizar atenciones aparecerán aquí."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
