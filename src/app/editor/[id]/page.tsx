'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs'; // <-- Added back
import { Loader2, X, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useDocumentSync } from '@/src/hooks/useDocumentSync';
import { useVersionStore, VersionSnapshot } from '@/src/lib/sync/versionStore';
import { EditorHeader } from '@/src/components/editor/EditorHeader';
import { ShareModal } from '@/src/components/editor/ShareModal';
import { ManageAccessModal } from '@/src/components/editor/ManageAccessModal';

export default function EditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  // 1. Initialize Y.Doc at the top level so everyone can share it
  const [ydoc] = useState(() => new Y.Doc());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const { isSidebarOpen, toggleSidebar, versions, addVersion } = useVersionStore();

  // 2. Setup TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), 
      Collaboration.configure({ document: ydoc })
    ],
    immediatelyRender: false, // <-- FIXES the Next.js hydration warning!
    editorProps: { attributes: { class: 'focus:outline-none min-h-[500px] text-gray-900 text-lg prose prose-blue max-w-none' } },
  });

  // 3. Connect our Hook safely (only one call!)
  const { syncState, userRole, documentTitle, setDocumentTitle, handleTitleBlur, collaborators, fetchCollaborators, supabase } = useDocumentSync(documentId, editor, ydoc);

  // 4. Document Actions
  const handleCreateSnapshot = async () => {
    const name = prompt("Enter a name for this version snapshot:");
    if (!name) return;
    
    const uint8ArrayToHex = (arr: Uint8Array) => '\\x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    const promise = new Promise(async (resolve, reject) => {
      try {
        const { data, error } = await supabase.from('document_versions').insert({ document_id: documentId, snapshot_data: uint8ArrayToHex(ydoc.encodeStateAsUpdate()), snapshot_json: editor?.getJSON(), version_name: name }).select().single();
        if (error) throw error;
        addVersion(data as VersionSnapshot); resolve(data);
      } catch (err) { reject(err); }
    });
    toast.promise(promise, { loading: 'Creating snapshot...', success: 'Snapshot saved successfully!', error: 'Failed to save snapshot.' });
  };

  const handleRestoreVersion = (version: VersionSnapshot) => {
    if (!version.snapshot_json) return toast.error("Missing JSON data.");
    try { editor?.commands.setContent(version.snapshot_json); toast.success("Document restored!"); toggleSidebar(); } 
    catch { toast.error("Failed to restore."); }
  };

  if (!editor || !userRole) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex flex-col min-w-0">
        
        <EditorHeader 
          userRole={userRole} 
          syncState={syncState} 
          documentTitle={documentTitle} 
          setDocumentTitle={setDocumentTitle} 
          handleTitleBlur={handleTitleBlur} 
          onOpenShare={() => setIsShareModalOpen(true)} 
          onOpenManage={() => setIsManageModalOpen(true)} 
          onCreateSnapshot={handleCreateSnapshot} 
          onToggleSidebar={toggleSidebar} 
        />

        <main className="flex-1 max-w-4xl w-full mx-auto p-8 my-8 bg-white shadow-lg rounded-xl border overflow-y-auto">
          <EditorContent editor={editor} />
        </main>
      </div>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} documentId={documentId} supabase={supabase} onSuccess={fetchCollaborators} />
      <ManageAccessModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} documentId={documentId} supabase={supabase} userRole={userRole} collaborators={collaborators} onSuccess={fetchCollaborators} />

      {/* History Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 bg-white border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-800 flex items-center gap-1"><History className="w-4 h-4" /> Version History</h2>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-800"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {versions.length === 0 ? <p className="text-sm text-gray-400 text-center mt-4">No snapshots captured yet.</p> : versions.map((v) => (
              <div key={v.id} className="p-3 border rounded-lg hover:border-blue-300 bg-white shadow-sm transition">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 truncate pr-2">{v.version_name}</h3>
                  {(userRole === 'owner' || userRole === 'editor') && (
                    <button onClick={() => handleRestoreVersion(v)} className="text-xs flex items-center gap-0.5 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"><RotateCcw className="w-3 h-3" /> Restore</button>
                  )}
                </div>
                <p className="text-xs text-gray-500">{new Date(v.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}