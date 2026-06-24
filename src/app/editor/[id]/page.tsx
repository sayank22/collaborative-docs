'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2, Save, Cloud, WifiOff } from 'lucide-react';
import { createClient } from '@/src/lib/supabase/client';

export default function EditorPage() {
  const params = useParams();
  const documentId = params.id as string;
  const supabase = createClient();

  const [syncState, setSyncState] = useState<'loading' | 'offline-saved' | 'online'>('loading');
  const [ydoc] = useState(() => new Y.Doc());

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

  useEffect(() => {
    if (!documentId) return;

    // 1. Connect Yjs to IndexedDB (Local-First)
    const provider = new IndexeddbPersistence(documentId, ydoc);
    provider.on('synced', () => {
      setSyncState('offline-saved');
    });

    // 2. Connect to Supabase Realtime (Multiplayer WebSockets)
    const channel = supabase.channel(`doc-${documentId}`);

    channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        // When anyone types OR sends a full state, merge it mathematically
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(ydoc, update, 'supabase');
      })
      .on('broadcast', { event: 'request-state' }, () => {
        // A new user just joined and asked for the state! 
        // Encode our entire local document and send it to them.
        const fullState = Y.encodeStateAsUpdate(ydoc);
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(fullState) },
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncState('online');
          
          // We just joined the channel! Ask anyone already here for the latest state.
          channel.send({
            type: 'broadcast',
            event: 'request-state',
            payload: {},
          });
        }
      });

    // 3. Broadcast local keystrokes to other collaborators
    const handleYjsUpdate = (update: Uint8Array, origin: any) => {
      // Prevent infinite loops! Only broadcast our own local typing.
      if (origin !== 'supabase') {
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(update) }, // Convert binary to JSON array for WebSockets
        });
      }
    };

    ydoc.on('update', handleYjsUpdate);

    // Cleanup connections when leaving the page
    return () => {
      ydoc.off('update', handleYjsUpdate);
      channel.unsubscribe();
      provider.destroy();
    };
  }, [documentId, ydoc, supabase]);

  if (!editor) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Document Editor</h1>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {syncState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {syncState === 'offline-saved' && (
            <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              <WifiOff className="w-4 h-4" /> Offline
            </span>
          )}
          {syncState === 'online' && (
            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Cloud className="w-4 h-4" /> Live Syncing
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8 my-8 bg-white shadow-lg rounded-xl border">
        <EditorContent editor={editor} />
      </main>
    </div>
  );
}