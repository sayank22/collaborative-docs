'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2, Cloud, WifiOff, History, Bookmark, X, RotateCcw } from 'lucide-react';
import { createClient } from '@/src/lib/supabase/client';
import { useVersionStore, VersionSnapshot } from '@/src/lib/sync/versionStore';
import { toast } from 'sonner';

const uint8ArrayToHex = (arr: Uint8Array) => {
  return '\\x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hexToUint8Array = (hex: string) => {
  const cleanHex = hex.replace('\\x', '');
  return new Uint8Array(cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
};

export default function EditorPage() {
  const params = useParams();
  const documentId = params.id as string;
  const supabase = createClient();

  const [syncState, setSyncState] = useState<'loading' | 'offline-saved' | 'online'>('loading');
  const [ydoc] = useState(() => new Y.Doc());

  // Zustand State Management
  const { isSidebarOpen, toggleSidebar, versions, setVersions, addVersion } = useVersionStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] text-gray-900 text-lg prose prose-blue max-w-none',
      },
    },
  });

  // Fetch Version History Timeline
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (!error && data) setVersions(data as VersionSnapshot[]);
  };

  useEffect(() => {
    if (!documentId || !editor) return;

    let saveTimeout: NodeJS.Timeout;
    let provider: IndexeddbPersistence;
    let channel: ReturnType<typeof supabase.channel>;

    const handleYjsUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'supabase' && origin !== 'initial-load' && channel) {
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(update) },
        });
      }
    };

    const handleAutoSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        setSyncState('loading');
        try {
          const stateVector = Y.encodeStateAsUpdate(ydoc);
          const hexState = uint8ArrayToHex(stateVector);

          const { error } = await supabase
            .from('documents')
            .update({ content: hexState, updated_at: new Date().toISOString() })
            .eq('id', documentId);

          if (error) throw error;
          setSyncState('online');
        } catch (error) {
          console.error("Auto-save failed:", error);
          setSyncState('offline-saved');
        }
      }, 2000);
    };

    const initializeDocument = async () => {
      // --- NEW: Auto-Join Logic for Late Joiners (Window B) ---
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        // Silently attempt to insert the user as an editor so they get RLS permissions
        await supabase.from('collaborators').insert({
          document_id: documentId,
          user_id: authData.session.user.id,
          role: 'editor'
        }); // We don't throw an error here because if they are already in the DB, it safely fails
      }
      // ---------------------------------------------------------

      // 1. Fetch Latest Content
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', documentId)
        .single();

      if (!error && data?.content) {
        Y.applyUpdate(ydoc, hexToUint8Array(data.content), 'initial-load');
      }

      // 2. Fetch Snapshots
      await fetchVersions();

      // 3. Connect Local-First Storage
      provider = new IndexeddbPersistence(documentId, ydoc);
      provider.on('synced', () => setSyncState('offline-saved'));

      // 4. Connect WebSockets
      channel = supabase.channel(`doc-${documentId}`);
      channel
        .on('broadcast', { event: 'yjs-update' }, ({ payload }: { payload: { update: number[] } }) => {
          Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'supabase');
        })
        .on('broadcast', { event: 'request-state' }, () => {
          channel.send({
            type: 'broadcast',
            event: 'yjs-update',
            payload: { update: Array.from(Y.encodeStateAsUpdate(ydoc)) },
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setSyncState('online');
            channel.send({ type: 'broadcast', event: 'request-state', payload: {} });
          }
        });

      ydoc.on('update', handleYjsUpdate);
      ydoc.on('update', handleAutoSave);
    };

    initializeDocument();

    return () => {
      clearTimeout(saveTimeout);
      ydoc.off('update', handleYjsUpdate);
      ydoc.off('update', handleAutoSave);
      if (channel) channel.unsubscribe();
      if (provider) provider.destroy();
    };
  }, [documentId, ydoc, editor, supabase]);

  // --- NEW: Handle Manual Snapshot Save with TipTap JSON ---
  const handleCreateSnapshot = async () => {
    const name = prompt("Enter a name for this version snapshot:");
    if (!name) return;

    const promise = new Promise(async (resolve, reject) => {
      try {
        const stateVector = Y.encodeStateAsUpdate(ydoc);
        const hexState = uint8ArrayToHex(stateVector);

        const { data, error } = await supabase
          .from('document_versions')
          .insert({
            document_id: documentId,
            snapshot_data: hexState,
            snapshot_json: editor?.getJSON(), // <-- Saved JSON for CRDT Time Travel
            version_name: name,
          })
          .select()
          .single();

        if (error) throw error;
        addVersion(data as VersionSnapshot);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(promise, {
      loading: 'Creating document snapshot...',
      success: 'Snapshot saved successfully to history!',
      error: 'Failed to save snapshot.',
    });
  };

  // --- NEW: CRDT-Safe Time Travel Restore ---
  const handleRestoreVersion = (version: VersionSnapshot) => {
    if (!version.snapshot_json) {
      toast.error("This snapshot is missing JSON data. (Old version)");
      return;
    }

    try {
      // Pushing old JSON into the editor forces TipTap to generate NEW Yjs operations.
      // This tricks the CRDT into broadcasting the old state as a brand new forward-moving update!
      editor?.commands.setContent(version.snapshot_json);
      toast.success("Document restored to historical version!");
      toggleSidebar(); 
    } catch (err) {
      toast.error("Failed to restore selected version.");
    }
  };

  if (!editor) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Canvas Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">Document Editor</h1>
          
          <div className="flex items-center gap-4">
            {/* Sync State Indicators */}
            <div className="text-sm text-gray-500">
              {syncState === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {syncState === 'offline-saved' && (
                <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  <WifiOff className="w-4 h-4" /> Saved Offline
                </span>
              )}
              {syncState === 'online' && (
                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Cloud className="w-4 h-4" /> Cloud Synced
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleCreateSnapshot}
              className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium transition"
            >
              <Bookmark className="w-4 h-4" /> Save Snapshot
            </button>

            <button
              onClick={toggleSidebar}
              className="flex items-center gap-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium transition"
            >
              <History className="w-4 h-4" /> History
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-8 my-8 bg-white shadow-lg rounded-xl border overflow-y-auto">
          <EditorContent editor={editor} />
        </main>
      </div>

      {/* Version Control Timeline Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 bg-white border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-800 flex items-center gap-1">
              <History className="w-4 h-4" /> Version History
            </h2>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {versions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-4">No snapshots captured yet.</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="p-3 border rounded-lg hover:border-blue-300 bg-white shadow-sm transition">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 truncate pr-2">{v.version_name}</h3>
                    {/* --- NEW: Pass the full 'v' object here, not just the hex string --- */}
                    <button
                      onClick={() => handleRestoreVersion(v)}
                      className="text-xs flex items-center gap-0.5 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                      title="Restore this state"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}