'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2, CloudOff, Cloud, Save } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [syncState, setSyncState] = useState<'loading' | 'offline-saved' | 'syncing'>('loading');

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable history because Yjs handles undo/redo natively
        history: false, 
      }),
    ],
    content: '', // Let Yjs manage the content
    editorProps: {
      attributes: {
        class: 'prose prose-blue max-w-none focus:outline-none min-h-[500px]',
      },
    },
  });

  useEffect(() => {
    if (!editor || !documentId) return;

    // 1. Create a new Yjs CRDT Document
    const ydoc = new Y.Doc();

    // 2. Connect the Yjs Document to the browser's IndexedDB (Offline First)
    // This immediately loads any offline changes the user made previously
    const provider = new IndexeddbPersistence(documentId, ydoc);

    provider.on('synced', () => {
      console.log('Local IndexedDB loaded!');
      setSyncState('offline-saved');
    });

    // 3. Bind Yjs to TipTap
    // We dynamically register the collaboration extension
    editor.commands.insertContent(''); // Clear initial state
    editor.extensionManager.extensions.push(
      Collaboration.configure({
        document: ydoc,
      })
    );

    // Cleanup when leaving the page
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [editor, documentId]);

  if (!editor) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Editor Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Document Editor</h1>
        
        {/* Offline / Sync Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {syncState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {syncState === 'offline-saved' && (
            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Save className="w-4 h-4" /> Saved Locally
            </span>
          )}
        </div>
      </header>

      {/* Editor Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 my-8 bg-white shadow-lg rounded-xl border">
        <EditorContent editor={editor} />
      </main>
    </div>
  );
}