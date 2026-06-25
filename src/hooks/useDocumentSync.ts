import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { createClient } from '@/src/lib/supabase/client';
import { toast } from 'sonner';
import { useVersionStore } from '@/src/lib/sync/versionStore';
import type { UserRole } from '@/src/lib/supabase/types';
import type { VersionSnapshot } from '@/src/lib/sync/versionStore';

type Role = UserRole;
export type Collaborator = { user_id: string; email: string; role: Role; created_at: string; };
type MinimalEditor = { setEditable: (editable: boolean) => void };
type YjsUpdateOrigin = string | { constructor?: { name?: string } } | null | undefined;

const uint8ArrayToHex = (arr: Uint8Array) => '\\x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
const hexToUint8Array = (hex: string) => new Uint8Array(hex.replace('\\x', '').match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);

export function useDocumentSync(documentId: string, editor: MinimalEditor | null, ydoc: Y.Doc) {
  const router = useRouter();
  const [supabase] = useState(() => createClient()); 
  const { setVersions } = useVersionStore();

  const [syncState, setSyncState] = useState<'loading' | 'offline-saved' | 'online'>('loading');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [documentTitle, setDocumentTitle] = useState('Loading...');

  const fetchCollaborators = async () => {
    const { data, error } = await supabase.rpc('get_document_collaborators', { doc_id: documentId });
    if (!error && data) setCollaborators(data);
  };

  useEffect(() => {
    if (!documentId || !editor) return;

    let saveTimeout: NodeJS.Timeout;
    let provider: IndexeddbPersistence;
    let channel: ReturnType<typeof supabase.channel>;
    let isComponentMounted = true;
    let activeRole: Role = 'viewer';
    let isChannelReady = false; 

    const initialize = async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return router.push('/login');

      const { data: collabData, error: collabError } = await supabase
        .from('collaborators').select('role').eq('document_id', documentId).eq('user_id', authData.session.user.id).single();

      if (collabError) {
        if (collabError.message.includes('FetchError') || collabError.message.includes('Failed to fetch') || !window.navigator.onLine) {
            toast.warning("You are offline. Loading local document cache.");
            setSyncState('offline-saved');
            activeRole = 'editor'; 
        } else {
            toast.error("You do not have access to this document.");
            return router.push('/');
        }
      } else if (collabData) {
        activeRole = collabData.role as Role;
      }

      setUserRole(activeRole);
      editor.setEditable(activeRole === 'owner' || activeRole === 'editor');

      // BOOT INDEXEDDB FIRST
      provider = new IndexeddbPersistence(documentId, ydoc);

      provider.on('synced', async () => {
        if (!isComponentMounted) return;

        if (window.navigator.onLine) {
          try {
            // Pull Cloud State
            const { data } = await supabase.from('documents').select('content, title').eq('id', documentId).single();
            if (data) {
              setDocumentTitle(data.title || 'Untitled Document');
              if (data.content) {
                 Y.applyUpdate(ydoc, hexToUint8Array(data.content), 'initial-load');
              }
            }

            const { data: versionsData } = await supabase.from('document_versions').select('*').eq('document_id', documentId).order('created_at', { ascending: false });
            if (versionsData) setVersions(versionsData as VersionSnapshot[]);
            await fetchCollaborators();

            // CONNECT WEBSOCKETS
            channel = supabase.channel(`doc-${documentId}`, {
                config: { broadcast: { ack: false, self: false } }
            });
            
            channel
              .on('broadcast', { event: 'yjs-update' }, ({ payload }) => { 
                  Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'supabase'); 
              })
              .on('broadcast', { event: 'request-state' }, () => { 
                  if (isChannelReady) {
                      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
                      if (stateUpdate.byteLength < 500000) { 
                          channel.send({ type: 'broadcast', event: 'yjs-update', payload: { update: Array.from(stateUpdate) } }); 
                      }
                  }
              })
              .subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                      isChannelReady = true;
                      setSyncState('online');
                      channel.send({ type: 'broadcast', event: 'request-state', payload: {} });
                  }
              });
          } catch (e) {
            console.error("Sync Error", e);
            setSyncState('offline-saved');
          }
        }
      });
    };

    initialize();

    // BROADCAST & AUTOSAVE ENGINE
    const handleYjsUpdate = (update: Uint8Array, origin: YjsUpdateOrigin) => {
      if (!isComponentMounted) return;

      const isLocalHumanUpdate = origin !== 'supabase' && origin !== 'initial-load' && origin !== 'reconnect' && origin?.constructor?.name !== 'IndexeddbPersistence';

      if (isLocalHumanUpdate && (activeRole === 'owner' || activeRole === 'editor') && channel && isChannelReady) {
        try {
            channel.send({ type: 'broadcast', event: 'yjs-update', payload: { update: Array.from(update) } });
        } catch {
            console.error("Broadcast failed, payload likely too large");
        }
      }

      if (isLocalHumanUpdate && activeRole !== 'viewer') {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(async () => {
            if (!window.navigator.onLine) return; 
            
            setSyncState('loading');
            try {
              const stateVector = Y.encodeStateAsUpdate(ydoc);
              
              // Security Tweak: Payload Size Limit (1MB)
              const MAX_PAYLOAD_BYTES = 1048576; 
              if (stateVector.byteLength > MAX_PAYLOAD_BYTES) {
                  console.error("Security Block: Synchronization payload exceeds 1MB limit.");
                  toast.error("Document is too large to sync. Please reduce content.");
                  setSyncState('offline-saved');
                  return; 
              }

              await supabase.from('documents').update({ content: uint8ArrayToHex(stateVector), updated_at: new Date().toISOString() }).eq('id', documentId);
              setSyncState('online');
            } catch { setSyncState('offline-saved'); }
          }, 2000);
      }
    };

    ydoc.on('update', handleYjsUpdate);

    // NETWORK LISTENERS
    const handleOnline = async () => {
      toast.success("Back online! Syncing background changes...");
      setSyncState('loading');
      try {
         const { data } = await supabase.from('documents').select('content').eq('id', documentId).single();
         if (data?.content) Y.applyUpdate(ydoc, hexToUint8Array(data.content), 'reconnect');

         const stateVector = Y.encodeStateAsUpdate(ydoc);
         await supabase.from('documents').update({ content: uint8ArrayToHex(stateVector), updated_at: new Date().toISOString() }).eq('id', documentId);
         setSyncState('online');
      } catch {
         setSyncState('offline-saved');
      }
    };
    
    const handleOffline = () => {
      toast.warning("You are offline. Changes will save locally.");
      setSyncState('offline-saved');
      isChannelReady = false; 
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isComponentMounted = false;
      clearTimeout(saveTimeout);
      ydoc.off('update', handleYjsUpdate);
      if (channel) channel.unsubscribe();
      if (provider) provider.destroy();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, editor, ydoc]); 

  const handleTitleBlur = async () => {
    if (userRole === 'viewer' || !window.navigator.onLine) return;
    const finalTitle = documentTitle.trim() || 'Untitled Document';
    setDocumentTitle(finalTitle);
    try {
      await supabase.from('documents').update({ title: finalTitle, updated_at: new Date().toISOString() }).eq('id', documentId);
    } catch {
      toast.error("Failed to save document title.");
    }
  };

  return { ydoc, syncState, userRole, collaborators, fetchCollaborators, documentTitle, setDocumentTitle, handleTitleBlur, supabase };
}
