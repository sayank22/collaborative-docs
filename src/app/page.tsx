'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client';
import { Plus, Loader2, Users, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

// Import our refactored components
import { DashboardSkeleton } from '@/src/components/dashboard/DashboardSkeleton';
import { DashboardNavbar } from '@/src/components/dashboard/DashboardNavbar';
import { DocumentCard, type DocumentRecord } from '@/src/components/dashboard/DocumentCard';
import { DeleteDocumentDialog } from '@/src/components/dashboard/DeleteDocumentDialog';

type CollaboratorWithDocument = {
  role: 'owner' | 'editor' | 'viewer';
  documents: {
    id: string;
    title: string | null;
    updated_at: string;
  };
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof window !== 'undefined' && !window.navigator.onLine);
  
  const [ownedDocs, setOwnedDocs] = useState<DocumentRecord[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentRecord[]>([]);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const handleNetworkChange = () => setIsOffline(!window.navigator.onLine);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    const fetchUserAndDocuments = async () => {
      try {
        const cachedData = localStorage.getItem('collab_docs_dashboard_cache');
        if (cachedData) {
          const { owned, shared, email } = JSON.parse(cachedData);
          setOwnedDocs(owned);
          setSharedDocs(shared);
          if (email) setUserEmail(email);
        }
      } catch (e) {
        console.error("Failed to parse dashboard cache", e);
      }

      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');
        
        setUserEmail(session.user.email ?? null);

        const { data, error } = await supabase
          .from('collaborators')
          .select('role, documents (id, title, updated_at)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formattedDocs: DocumentRecord[] = (data as CollaboratorWithDocument[]).map((item) => ({
            id: item.documents.id,
            title: item.documents.title || 'Untitled Document',
            updated_at: item.documents.updated_at,
            role: item.role,
          }));

          const owned = formattedDocs.filter(doc => doc.role === 'owner');
          const shared = formattedDocs.filter(doc => doc.role !== 'owner');

          setOwnedDocs(owned);
          setSharedDocs(shared);

          localStorage.setItem('collab_docs_dashboard_cache', JSON.stringify({
            owned, shared, email: session.user.email
          }));
        }
      } catch (error) {
        console.error("Dashboard fetch failed, utilizing cache fallback", error);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndDocuments();

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    if (isOffline) return toast.error('Cannot sign out while offline.');
    await supabase.auth.signOut();
    localStorage.removeItem('collab_docs_dashboard_cache');
    router.push('/login');
  };

  const createNewDocument = async () => {
    if (isCreating) return;
    if (isOffline) return toast.error('Cannot create new documents while offline.');
    
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const newDocId = crypto.randomUUID();
      const { error: docError } = await supabase.from('documents').insert({ id: newDocId, title: 'Untitled Document' });
      if (docError) throw docError;

      const { error: collabError } = await supabase.from('collaborators').insert({ document_id: newDocId, user_id: session.user.id, role: 'owner' });
      if (collabError) throw collabError;

      router.push(`/editor/${newDocId}`);
    } catch (error) {
      toast.error('Failed to create document.');
      setIsCreating(false);
    }
  };

  const handleOpenDeleteDialog = (docId: string) => {
    if (isOffline) return toast.error('Cannot delete documents while offline.');
    setDocToDelete(docId);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!docToDelete || isOffline) return;
    try {
      const { error: docError } = await supabase.from('documents').delete().eq('id', docToDelete);
      if (docError) throw docError;

      setOwnedDocs(prev => prev.filter(doc => doc.id !== docToDelete));
      setSharedDocs(prev => prev.filter(doc => doc.id !== docToDelete));
      
      const cachedData = localStorage.getItem('collab_docs_dashboard_cache');
      if (cachedData) {
        const { owned, shared, email } = JSON.parse(cachedData);
        localStorage.setItem('collab_docs_dashboard_cache', JSON.stringify({
          owned: owned.filter((d: DocumentRecord) => d.id !== docToDelete),
          shared: shared.filter((d: DocumentRecord) => d.id !== docToDelete),
          email
        }));
      }
      toast.success('Document deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete document.');
    } finally {
      setDocToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading && ownedDocs.length === 0 && sharedDocs.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar userEmail={userEmail} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-14">
        {isOffline && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 shadow-sm animate-in fade-in duration-300">
            <WifiOff className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">You are offline. Showing cached documents. You can still open and edit recently viewed files.</p>
          </div>
        )}

        <section>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Documents</h1>
              <p className="mt-1 text-sm text-slate-500">Documents you created and manage.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <button 
              onClick={createNewDocument} disabled={isCreating || isOffline}
              className="group relative flex h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-transparent transition-all hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-slate-300 disabled:hover:bg-transparent"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110">
                {isCreating ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : <Plus className={`h-6 w-6 ${isOffline ? 'text-slate-400' : 'text-blue-600'}`} />}
              </div>
              <span className={`text-sm font-semibold ${isOffline ? 'text-slate-400' : 'text-slate-700'}`}>
                {isCreating ? 'Creating...' : isOffline ? 'Offline' : 'Create Blank'}
              </span>
            </button>
            
            {ownedDocs.map((doc) => (
              <DocumentCard 
                key={doc.id} doc={doc} isOffline={isOffline} 
                onClick={(id) => router.push(`/editor/${id}`)}
                onDelete={handleOpenDeleteDialog} 
              />
            ))}
          </div>
        </section>

        {sharedDocs.length > 0 && (
          <section>
            <div className="mb-6 border-t border-slate-200 pt-10">
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                <Users className="h-6 w-6 text-slate-400" /> Shared With Me
              </h2>
              <p className="mt-1 text-sm text-slate-500">Documents you&apos;ve been invited to collaborate on.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {sharedDocs.map((doc) => (
                <DocumentCard 
                  key={doc.id} doc={doc} isOffline={isOffline} 
                  onClick={(id) => router.push(`/editor/${id}`)} 
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <DeleteDocumentDialog 
        isOpen={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onConfirm={executeDelete} 
      />
    </div>
  );
}