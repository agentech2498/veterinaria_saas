import { Syringe, Award, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface VaccinesTabProps {
  isLoadingDetails: boolean;
  vaccines: any[];
  isDownloading: string | null;
  onNewVaccine: () => void;
  onDownload: () => void;
}

export const VaccinesTab = ({ isLoadingDetails, vaccines, isDownloading, onNewVaccine, onDownload }: VaccinesTabProps) => (
  <div className="animate-in fade-in duration-300">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Syringe className="w-5 h-5 text-[#14b8a6]" />
        Plan Sanitario
      </h3>
      <Button size="sm" icon={Syringe} onClick={onNewVaccine}>Nueva Dosis</Button>
    </div>

    {isLoadingDetails ? (
      <div className="py-10 text-center"><span className="text-slate-500">Cargando...</span></div>
    ) : vaccines.length === 0 ? (
      <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center">
        <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-full text-slate-500 mb-3"><Syringe size={24} /></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Sin vacunas registradas.</p>
      </div>
    ) : (
      <div className="overflow-x-auto max-h-[300px]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3">Vacuna</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Próxima Dosis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {vaccines.map((v: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{v.vaccine_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.date}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.batch_number || '--'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.next_dose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <div className="mt-6">
      <Button
        className={`w-full bg-gradient-to-br from-[#D4AF37] to-[#F9D5B1] hover:from-[#c29c29] hover:to-[#e6c19a] text-slate-900 shadow-md border-0 ${isDownloading === 'vaccines' ? '[&>svg]:animate-spin' : ''}`}
        icon={isDownloading === 'vaccines' ? Loader2 : Award}
        onClick={onDownload}
        disabled={isDownloading !== null}
      >
        Certificado Digital
      </Button>
    </div>
  </div>
);
