import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { createClient } from '@/src/lib/supabase/client';
import { toast } from 'sonner';
import { useVersionStore } from '@/src/lib/sync/versionStore';

type Role = 'owner' | 'editor' | 'viewer';
export type Collaborator = { user_id: string; email: string; role: Role; created_at: string; };

const uint8ArrayToHex = (arr: Uint8Array) => '\\x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
const hexToUint8Array = (hex: string) => new Uint8Array(hex.replace('\\x', '').match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);

// NEW: Accept ydoc as a parameter
export function useDocumentSync(documentId: string, editor: any, ydoc: Y.Doc) {
  const router = useRouter();
  const supabase = createClient();
  const { setVersions } = useVersionStore();

  const [syncState, setSyncState] = useState<'loading' | 'offline-saved' | 'online'>('loading');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [documentTitle, setDocumentTitle] = useState('Loading...');

  const fetchCollaborators = async () => {
    const { data, error } = await supabase.rpc('get_document_collaborators', { doc_id: documentId });
    if (!error && data) setCollaborators(data as Collaborator[]);
  };

  useEffect(() => {
    // Only run when the editor is fully mounted
    if (!documentId || !editor) return; 

    let saveTimeout: NodeJS.Timeout;
    let provider: IndexeddbPersistence;
    let channel: ReturnType<typeof supabase.channel>;
    let handleYjsUpdate: (update: Uint8Array, origin: any) => void;
    let handleAutoSave: () => void;

    const initializeDocument = async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return router.push('/login');

      const { data: collabData, error: collabError } = await supabase
        .from('collaborators').select('role').eq('document_id', documentId).eq('user_id', authData.session.user.id).single();

      if (collabError || !collabData) {
        toast.error("You do not have access to this document.");
        return router.push('/');
      }

      const role = collabData.role as Role;
      setUserRole(role);
      editor.setEditable(role === 'owner' || role === 'editor');

      const { data } = await supabase.from('documents').select('content, title').eq('id', documentId).single();
      if (data) {
        setDocumentTitle(data.title || 'Untitled Document');
        if (data.content) Y.applyUpdate(ydoc, hexToUint8Array(data.content), 'initial-load');
      }

      const { data: versionsData } = await supabase.from('document_versions').select('*').eq('document_id', documentId).order('created_at', { ascending: false });
      if (versionsData) setVersions(versionsData as any);
      
      await fetchCollaborators();

      provider = new IndexeddbPersistence(documentId, ydoc);
      provider.on('synced', () => setSyncState('offline-saved'));

      channel = supabase.channel(`doc-${documentId}`);
      channel
        .on('broadcast', { event: 'yjs-update' }, ({ payload }) => { Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'supabase'); })
        .on('broadcast', { event: 'request-state' }, () => { channel.send({ type: 'broadcast', event: 'yjs-update', payload: { update: Array.from(Y.encodeStateAsUpdate(ydoc)) } }); })
        .subscribe((status) => { if (status === 'SUBSCRIBED') { setSyncState('online'); channel.send({ type: 'broadcast', event: 'request-state', payload: {} }); } });

      handleYjsUpdate = (update: Uint8Array, origin: any) => {
        if ((role === 'owner' || role === 'editor') && origin !== 'supabase' && origin !== 'initial-load' && channel) {
          channel.send({ type: 'broadcast', event: 'yjs-update', payload: { update: Array.from(update) } });
        }
      };

      handleAutoSave = () => {
        if (role === 'viewer') return;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          setSyncState('loading');
          try {
            await supabase.from('documents').update({ content: uint8ArrayToHex(Y.encodeStateAsUpdate(ydoc)), updated_at: new Date().toISOString() }).eq('id', documentId);
            setSyncState('online');
          } catch { setSyncState('offline-saved'); }
        }, 2000);
      };

      ydoc.on('update', handleYjsUpdate);
      ydoc.on('update', handleAutoSave);
    };

    initializeDocument();

    return () => {
      clearTimeout(saveTimeout);
      if (handleYjsUpdate) ydoc.off('update', handleYjsUpdate);
      if (handleAutoSave) ydoc.off('update', handleAutoSave);
      if (channel) channel.unsubscribe();
      if (provider) provider.destroy();
    };
  }, [documentId, editor, supabase, router, setVersions, ydoc]);

  const handleTitleBlur = async () => {
    if (userRole === 'viewer') return;
    const finalTitle = documentTitle.trim() || 'Untitled Document';
    setDocumentTitle(finalTitle);
    try {
      await supabase.from('documents').update({ title: finalTitle, updated_at: new Date().toISOString() }).eq('id', documentId);
    } catch {
      toast.error("Failed to save document title.");
    }
  };

  // ydoc is no longer returned here because it lives in page.tsx
  return { syncState, userRole, collaborators, fetchCollaborators, documentTitle, setDocumentTitle, handleTitleBlur, supabase };
}