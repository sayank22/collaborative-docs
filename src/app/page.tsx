'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client';
import { FileText, Plus, Loader2, LogOut, Clock, Users, Edit3, Eye, Shield, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DocumentRecord = {
  id: string;
  title: string;
  updated_at: string;
  role: 'owner' | 'editor' | 'viewer';
};

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
    const handleNetworkChange = () => {
      setIsOffline(!window.navigator.onLine);
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    const fetchUserAndDocuments = async () => {
      // CACHE LOAD: Instantly show UI using local storage
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

      // NETWORK FETCH: If online, get fresh data from Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return router.push('/login');
        } 
        
        setUserEmail(session.user.email ?? null);

        const { data, error } = await supabase
          .from('collaborators')
          .select(`
            role,
            documents (
              id,
              title,
              updated_at
            )
          `)
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

          // UPDATE CACHE: Lock fresh data into local storage
          localStorage.setItem('collab_docs_dashboard_cache', JSON.stringify({
            owned,
            shared,
            email: session.user.email
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

    // NETWORK STATUS LISTENERS
    const handleOnline = () => { setIsOffline(false); fetchUserAndDocuments(); };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    if (isOffline) {
      toast.error('Cannot sign out while offline.');
      return;
    }
    await supabase.auth.signOut();
    localStorage.removeItem('collab_docs_dashboard_cache'); // Clear cache on logout
    router.push('/login');
  };

  const createNewDocument = async () => {
    if (isCreating) return;
    if (isOffline) {
      toast.error('Cannot create new documents while offline.');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const newDocId = crypto.randomUUID();

      const { error: docError } = await supabase
        .from('documents')
        .insert({ id: newDocId, title: 'Untitled Document' });

      if (docError) throw docError;

      const { error: collabError } = await supabase
        .from('collaborators')
        .insert({
          document_id: newDocId,
          user_id: session.user.id,
          role: 'owner',
        });

      if (collabError) throw collabError;

      router.push(`/editor/${newDocId}`);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document.');
      setIsCreating(false);
    }
  };

  // 1. The Trigger: Prepares state and opens the accessible modal overlay
  const handleOpenDeleteDialog = (docId: string) => {
    if (isOffline) {
      toast.error('Cannot delete documents while offline.');
      return;
    }
    setDocToDelete(docId);
    setIsDeleteDialogOpen(true);
  };

  // 2. The Finalizer: Fires off natively once the user confirms in the shadcn dialog box
  const executeDelete = async () => {
    if (!docToDelete || isOffline) return;

    try {
      // With CASCADE DELETE configured in SQL, deleting from 'documents' handles the rest!
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docToDelete);

      if (docError) throw docError;

      // Update functional react states
      setOwnedDocs(prev => prev.filter(doc => doc.id !== docToDelete));
      setSharedDocs(prev => prev.filter(doc => doc.id !== docToDelete));
      
      // Keep your synchronous local dashboard cache matching perfectly
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
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document.');
    } finally {
      // Clean up pointer variables to reset accessibility focus states
      setDocToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  // ---------------------------------------------------------------------------
  // SKELETON LOADER
  // ---------------------------------------------------------------------------
  if (isLoading && ownedDocs.length === 0 && sharedDocs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200/50 border border-slate-200" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo area */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">CollabDocs</span>
            </div>
            
            {/* Actions area */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex sm:items-center sm:gap-3 border-r border-slate-600 pr-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-sm">
                  {userInitial}
                </div>
                <span className="text-sm font-medium text-slate-600">{userEmail}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-200 text-slate-700 transition-colors hover:bg-slate-300 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-14">
        
        {/* Offline Banner Indicator */}
        {isOffline && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 shadow-sm animate-in fade-in duration-300">
            <WifiOff className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              You are offline. Showing cached documents. You can still open and edit recently viewed files.
            </p>
          </div>
        )}

        {/* SECTION 1: My Documents */}
        <section>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Documents</h1>
              <p className="mt-1 text-sm text-slate-500">Documents you created and manage.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            
            {/* Create Blank Card */}
            <button 
              onClick={createNewDocument}
              disabled={isCreating || isOffline}
              className="group relative flex h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-transparent transition-all hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-slate-300 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110 group-hover:shadow group-active:scale-95">
                {isCreating ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                ) : (
                  <Plus className={`h-6 w-6 ${isOffline ? 'text-slate-400' : 'text-blue-600'}`} />
                )}
              </div>
              <span className={`text-sm font-semibold ${isOffline ? 'text-slate-400' : 'text-slate-700'}`}>
                {isCreating ? 'Creating...' : isOffline ? 'Offline' : 'Create Blank'}
              </span>
            </button>
            
            {/* Render Owned Documents */}
            {ownedDocs.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => router.push(`/editor/${doc.id}`)}
                className="group relative flex h-52 cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
              >
                <div className="absolute right-4 top-4">
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <Shield className="h-3 w-3" /> Owner
                  </span>
                </div>

                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
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

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteDialog(doc.id);
                  }}
                  disabled={isOffline}
                  className="absolute right-4 bottom-4 rounded-md bg-red-100 p-1 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isOffline ? "Cannot delete offline" : "Delete Document"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Shared With Me */}
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
                <div 
                  key={doc.id}
                  onClick={() => router.push(`/editor/${doc.id}`)}
                  className="group relative flex h-52 cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                  {/* Role Badge */}
                  <div className="absolute right-4 top-4">
                    {doc.role === 'editor' ? (
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
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500">
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
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 mt-2">
              This action cannot be undone. This will permanently delete the document and wipe all version history snapshots from the production server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2 justify-end">
            <AlertDialogCancel className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} // <-- Calls the database function we just created!
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </div>
  );
}