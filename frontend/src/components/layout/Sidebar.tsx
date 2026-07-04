import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { 
  BarChart3, 
  Calendar, 
  Dog, 
  Tags, 
  Stethoscope, 
  UserCircle, 
  Wallet, 
  Sun, 
  Moon, 
  LogOut 
} from 'lucide-react';

export const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const logout = useAuthStore(state => state.logout);

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <BarChart3 className="w-5 h-5" />, exact: true },
    { name: 'Citas', path: '/admin/appointments', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Pacientes', path: '/admin/patients', icon: <Dog className="w-5 h-5" /> },
    { name: 'Servicios', path: '/admin/services', icon: <Tags className="w-5 h-5" /> },
    { name: 'Atenciones', path: '/admin/attentions', icon: <Stethoscope className="w-5 h-5" /> },
    { name: 'Mi Perfil', path: '/admin/profile', icon: <UserCircle className="w-5 h-5" /> },
    { name: 'Caja', path: '/admin/cashier', icon: <Wallet className="w-5 h-5" /> },
  ];

  return (
    <div className="w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col z-10 transition-colors duration-300">
      <div className="text-2xl font-bold mb-10 text-[#14b8a6] flex items-center gap-2.5 px-2">
        <div className="bg-[#14b8a6]/10 p-2 rounded-xl text-[#14b8a6]">
          <Dog className="w-6 h-6" />
        </div>
        DogBot Admin
      </div>

      <nav className="flex-1 flex flex-col space-y-1">
        <div className="px-3 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Clínica
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-[#f0fdfa] dark:bg-[rgba(20,184,166,0.1)] text-[#0d9488] dark:text-[#2dd4bf]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <div className={`transition-transform duration-200 group-hover:scale-110`}>
              {item.icon}
            </div>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#14b8a6] dark:hover:border-[#14b8a6] hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 w-full group"
        >
          <span className="font-medium text-sm">{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
          <div className="transition-transform duration-200 group-hover:rotate-12">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </div>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 w-full group"
        >
          <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
