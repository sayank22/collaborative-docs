'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import * as Y from 'yjs';
import { Loader2, X, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useDocumentSync } from '@/src/hooks/useDocumentSync';
import { useVersionStore, VersionSnapshot } from '@/src/lib/sync/versionStore';
import { EditorHeader } from '@/src/components/editor/EditorHeader';
import { ShareModal } from '@/src/components/editor/ShareModal';
import { ManageAccessModal } from '@/src/components/editor/ManageAccessModal';
import { AIEditor } from '@/src/components/editor/AIEditor';

export default function EditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [ydoc] = useState(() => new Y.Doc());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const { isSidebarOpen, toggleSidebar, versions, addVersion } = useVersionStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), 
      Collaboration.configure({ document: ydoc }), 
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    immediatelyRender: false,
    editorProps: { 
      attributes: { 
        class: 'focus:outline-none min-h-[800px] w-full text-slate-900 text-base sm:text-lg prose prose-slate prose-blue max-w-none' 
      } 
    },
  });

  const { syncState, userRole, documentTitle, setDocumentTitle, handleTitleBlur, collaborators, fetchCollaborators, supabase } = useDocumentSync(documentId, editor, ydoc);

  // Update editor editable state based on user role
  useEffect(() => {
    if (editor && userRole) {
      editor.setEditable(userRole !== 'viewer');
    }
  }, [editor, userRole]);

  const handleCreateSnapshot = async () => {
    const name = prompt("Enter a name for this version snapshot:");
    if (!name) return;
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        const stateVector = Y.encodeStateAsUpdate(ydoc);
        
        const MAX_PAYLOAD_BYTES = 1048576;
        if (stateVector.byteLength > MAX_PAYLOAD_BYTES) {
            return reject(new Error("Payload exceeds 1MB size limit."));
        }

        const uint8ArrayToHex = (arr: Uint8Array) => '\\x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        const hexState = uint8ArrayToHex(stateVector);
        
        const { data, error } = await supabase.from('document_versions').insert({ 
            document_id: documentId, 
            snapshot_data: hexState, 
            snapshot_json: editor?.getJSON(), 
            version_name: name 
        }).select().single();
        
        if (error) throw error;
        addVersion(data as VersionSnapshot); 
        resolve(data);
      } catch (err) { 
        reject(err); 
      }
    });

    toast.promise(promise, { 
        loading: 'Creating snapshot...', 
        success: 'Snapshot saved successfully!', 
        error: (err) => err instanceof Error ? err.message : 'Failed to save snapshot.' 
    });
  };

  const handleRestoreVersion = (version: VersionSnapshot) => {
    if (!version.snapshot_json) return toast.error("Missing JSON data.");
    try { 
      editor?.commands.setContent(version.snapshot_json); 
      toast.success("Document restored!"); 
      toggleSidebar(); 
    } catch { 
      toast.error("Failed to restore."); 
    }
  };

  if (!editor || !userRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="flex min-w-0 flex-1 flex-col">
        
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

        <AIEditor editor={editor} userRole={userRole} />

      </div>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} documentId={documentId} supabase={supabase} onSuccess={fetchCollaborators} />
      <ManageAccessModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} documentId={documentId} supabase={supabase} userRole={userRole} collaborators={collaborators} onSuccess={fetchCollaborators} />

      {/* History Sidebar */}
      {isSidebarOpen && (
        <div className="flex w-80 flex-col border-l border-slate-200 bg-slate-50 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <History className="h-4 w-4 text-slate-500" /> Version History
            </h2>
            <button 
              onClick={toggleSidebar} 
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {versions.length === 0 ? (
              <div className="mt-8 text-center text-sm text-slate-400">
                <p>No snapshots captured yet.</p>
                <p className="mt-1 text-xs">Save a version to see it here.</p>
              </div>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{v.version_name}</h3>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    {new Date(v.created_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    })}
                  </p>
                  
                  {(userRole === 'owner' || userRole === 'editor') && (
                    <div className="mt-2 border-t border-slate-100 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <button 
                        onClick={() => handleRestoreVersion(v)} 
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore this version
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}