'use client';

import { 
  ArrowLeft, 
  Loader2, 
  WifiOff, 
  Cloud, 
  Share2, 
  Settings, 
  Bookmark, 
  History,
  Eye,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EditorHeaderProps {
  userRole: 'owner' | 'editor' | 'viewer';
  syncState: 'loading' | 'offline-saved' | 'online';
  documentTitle: string;
  setDocumentTitle: (title: string) => void;
  handleTitleBlur: () => void;
  onOpenShare: () => void;
  onOpenManage: () => void;
  onCreateSnapshot: () => void;
  onToggleSidebar: () => void;
}

export function EditorHeader({ 
  userRole, 
  syncState, 
  documentTitle, 
  setDocumentTitle, 
  handleTitleBlur, 
  onOpenShare, 
  onOpenManage, 
  onCreateSnapshot, 
  onToggleSidebar 
}: EditorHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      
      {/* LEFT SECTION: Navigation & Title */}
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
        <button 
          onClick={() => router.push('/')} 
          className="group flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-slate-300 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-slate-200" 
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
        </button>
        
        {/* Document Icon (Visual Anchor) */}
        <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-sky-100 sm:flex">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input 
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            onBlur={handleTitleBlur}
            readOnly={userRole === 'viewer'}
            placeholder="Untitled Document"
            className={`w-full max-w-40 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-slate-900 transition-all sm:max-w-75 md:max-w-100 ${
              userRole === 'viewer' 
                ? 'cursor-default focus:outline-none' 
                : 'cursor-text hover:border-slate-300 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10'
            }`}
          />

          {userRole === 'viewer' && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-600/20">
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">View Only</span>
            </span>
          )}
        </div>
      </div>
      
      {/* RIGHT SECTION: Status & Actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        
        {/* Sync Status Indicator */}
        <div className="hidden items-center gap-1.5 pr-2 sm:flex px-3 py-2">
          {syncState === 'loading' && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 px-2 py-1 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              Saving...
            </div>
          )}
          {syncState === 'offline-saved' && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 px-2 py-1 rounded-lg">
              <WifiOff className="h-4 w-4 text-slate-400" />
              Saved locally
            </div>
          )}
          {syncState === 'online' && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-emerald-100 px-2 py-1 rounded-lg">
              <Cloud className="h-4 w-4 text-emerald-600" />
              Saved to cloud
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="hidden h-6 w-px bg-slate-600 sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {(userRole === 'owner' || userRole === 'editor') && (
            <>
              {/* Snapshot Button */}
              <button 
                onClick={onCreateSnapshot} 
                title="Save Version Snapshot"
                className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden lg:inline">Save Version</span>
              </button>

              {/* Share Group */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={onOpenShare} 
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                
                {userRole === 'owner' && (
                  <button 
                    onClick={onOpenManage} 
                    title="Manage Access"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* History Toggle Button */}
          <button 
            onClick={onToggleSidebar} 
            title="View History"
            className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">History</span>
          </button>
        </div>
      </div>
    </header>
  );
}