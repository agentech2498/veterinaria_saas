import React from 'react';
import { Sidebar } from './Sidebar';



export const AdminLayout = ({ children, orgName, username }: { children: React.ReactNode, orgName?: string, username?: string }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#020617] font-sans transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Global Header */}
        <header className="px-10 py-8 flex justify-between items-center shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">Bienvenido, {username}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestionando Clínica: <strong className="text-[#14b8a6]">{orgName}</strong></p>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
