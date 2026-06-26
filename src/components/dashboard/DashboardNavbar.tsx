import { FileText, LogOut } from 'lucide-react';

interface DashboardNavbarProps {
  userEmail: string | null;
  onSignOut: () => void;
}

export function DashboardNavbar({ userEmail, onSignOut }: DashboardNavbarProps) {
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">CollabDocs</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex sm:items-center sm:gap-3 border-r border-slate-600 pr-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-sm">
                {userInitial}
              </div>
              <span className="text-sm font-medium text-slate-600">{userEmail}</span>
            </div>
            <button 
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-200 text-slate-700 transition-colors hover:bg-slate-300 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}