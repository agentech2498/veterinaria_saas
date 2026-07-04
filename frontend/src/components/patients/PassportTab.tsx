import { Globe, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface PassportTabProps {
  isLoadingPassport: boolean;
  passportPreviewUrl: string | null;
  isDownloading: string | null;
  onDownload: () => void;
}

export const PassportTab = ({ isLoadingPassport, passportPreviewUrl, isDownloading, onDownload }: PassportTabProps) => (
  <div className="animate-in fade-in duration-300">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Globe className="w-5 h-5 text-[#14b8a6]" />
        Pasaporte Digital
      </h3>
      <Button
        size="sm"
        icon={isDownloading === 'passport' ? Loader2 : Download}
        className={isDownloading === 'passport' ? '[&>svg]:animate-spin' : ''}
        onClick={onDownload}
        disabled={isDownloading !== null || isLoadingPassport}
      >
        Descargar PDF
      </Button>
    </div>

    {isLoadingPassport ? (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 text-[#14b8a6] animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Generando pasaporte digital...</p>
      </div>
    ) : passportPreviewUrl ? (
      <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white shadow-sm">
        <iframe
          src={passportPreviewUrl}
          className="w-full h-full border-0"
          title="Vista previa del pasaporte"
        />
      </div>
    ) : (
      <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center">
        <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-full text-slate-500 mb-3"><Globe size={24} /></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">No se pudo cargar la vista previa.</p>
      </div>
    )}
  </div>
);
