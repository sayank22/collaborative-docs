import { ArrowLeft, Loader2, WifiOff, Cloud, Share2, Settings, Bookmark, History } from 'lucide-react';
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

export function EditorHeader({ userRole, syncState, documentTitle, setDocumentTitle, handleTitleBlur, onOpenShare, onOpenManage, onCreateSnapshot, onToggleSidebar }: EditorHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2 flex-1">
        <button onClick={() => router.push('/')} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition" title="Back to Dashboard">
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {/* NEW: Editable Title Input */}
        <input 
          type="text"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          onBlur={handleTitleBlur}
          readOnly={userRole === 'viewer'}
          className={`text-xl font-bold text-gray-800 bg-transparent border-transparent focus:border-gray-300 hover:border-gray-200 border rounded-md px-2 py-1 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition ${userRole === 'viewer' ? 'cursor-default focus:ring-0 hover:border-transparent' : 'cursor-text'}`}
          placeholder="Document Title"
        />

        {userRole === 'viewer' && <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full font-bold border border-red-200 ml-2">VIEW ONLY</span>}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500 hidden md:flex items-center">
          {syncState === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {syncState === 'offline-saved' && <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full"><WifiOff className="w-4 h-4" /> Offline</span>}
          {syncState === 'online' && <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full"><Cloud className="w-4 h-4" /> Synced</span>}
        </div>

        {(userRole === 'owner' || userRole === 'editor') && (
          <>
            <div className="flex rounded-md shadow-sm">
              <button onClick={onOpenShare} className="flex items-center gap-1 text-sm bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 rounded-l-md font-medium transition border-r border-blue-700">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button onClick={onOpenManage} className="flex items-center gap-1 text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-r-md transition" title="Manage Access">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <button onClick={onCreateSnapshot} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium transition hidden sm:flex">
              <Bookmark className="w-4 h-4" /> Save
            </button>
          </>
        )}

        <button onClick={onToggleSidebar} className="flex items-center gap-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium transition">
          <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
        </button>
      </div>
    </header>
  );
}