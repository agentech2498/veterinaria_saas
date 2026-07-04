import { FileText, History, Loader2, Download } from 'lucide-react';
import { Button } from '../ui/Button';

interface HistoryTabProps {
  isLoadingDetails: boolean;
  records: any[];
  isDownloading: string | null;
  onNewEvolution: () => void;
  onDownload: () => void;
}

export const HistoryTab = ({ isLoadingDetails, records, isDownloading, onNewEvolution, onDownload }: HistoryTabProps) => (
  <div className="animate-in fade-in duration-300">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <History className="w-5 h-5 text-[#14b8a6]" />
        Evolución Médica
      </h3>
      <Button size="sm" icon={FileText} onClick={onNewEvolution}>Nueva Evolución</Button>
    </div>

    {isLoadingDetails ? (
      <div className="py-10 text-center"><span className="text-slate-500">Cargando...</span></div>
    ) : records.length === 0 ? (
      <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center">
        <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-full text-slate-500 mb-3"><FileText size={24} /></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">No hay registros aún.</p>
      </div>
    ) : (
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {records.map((r: any, i: number) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-[#14b8a6]">{r.date}</span>
              <span className="text-xs text-slate-500">Por: {r.vet_name}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.description}</p>
          </div>
        ))}
      </div>
    )}

    <div className="mt-6">
      <Button
        variant="outline"
        icon={isDownloading === 'history' ? Loader2 : Download}
        className={`w-full ${isDownloading === 'history' ? '[&>svg]:animate-spin' : ''}`}
        onClick={onDownload}
        disabled={isDownloading !== null}
      >
        Descargar Historia Clínica (PDF)
      </Button>
    </div>
  </div>
);
