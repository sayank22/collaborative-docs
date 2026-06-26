import { FileText, Clock, Shield, Edit3, Eye, Trash2 } from 'lucide-react';

export type DocumentRecord = {
  id: string;
  title: string;
  updated_at: string;
  role: 'owner' | 'editor' | 'viewer';
};

interface DocumentCardProps {
  doc: DocumentRecord;
  isOffline: boolean;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void; // Optional: Only owners get the delete button
}

export function DocumentCard({ doc, isOffline, onClick, onDelete }: DocumentCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div 
      onClick={() => onClick(doc.id)}
      className="group relative flex h-52 cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
    >
      <div className="absolute right-4 top-4">
        {doc.role === 'owner' ? (
          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <Shield className="h-3 w-3" /> Owner
          </span>
        ) : doc.role === 'editor' ? (
          <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Edit3 className="h-3 w-3" /> Editor
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <Eye className="h-3 w-3" /> Viewer
          </span>
        )}
      </div>

      <div>
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${doc.role === 'owner' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="pr-16 text-base font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {doc.title}
        </h3>
      </div>
      
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        Edited {formatDate(doc.updated_at || new Date().toISOString())}
      </div>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(doc.id);
          }}
          disabled={isOffline}
          className="absolute right-4 bottom-4 rounded-md bg-red-100 p-1 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isOffline ? "Cannot delete offline" : "Delete Document"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}