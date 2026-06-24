'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client';
import { FileText, Plus, Loader2, LogOut, Clock, Users, Edit3, Eye } from 'lucide-react';

type DocumentRecord = {
  id: string;
  title: string;
  updated_at: string;
  role: 'owner' | 'editor' | 'viewer';
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Separate states for organization
  const [ownedDocs, setOwnedDocs] = useState<DocumentRecord[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentRecord[]>([]);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndDocuments = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return router.push('/login');
      } 
      
      setUserEmail(session.user.email ?? null);

      // Fetch documents where the user is a collaborator
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
        .order('created_at', { ascending: false }); // Sort by newest added

      if (!error && data) {
        // Format the nested Supabase join data
        const formattedDocs: DocumentRecord[] = data.map((item: any) => ({
          id: item.documents.id,
          title: item.documents.title || 'Untitled Document',
          updated_at: item.documents.updated_at,
          role: item.role,
        }));

        // Split into Owned vs Shared
        setOwnedDocs(formattedDocs.filter(doc => doc.role === 'owner'));
        setSharedDocs(formattedDocs.filter(doc => doc.role !== 'owner'));
      }

      setIsLoading(false);
    };

    fetchUserAndDocuments();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const createNewDocument = async () => {
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
          role: 'owner' 
        });

      if (collabError) throw collabError;

      router.push(`/editor/${newDocId}`);
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document.');
    }
  };

  // Helper to format dates nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">CollabDocs</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {userEmail}
              </span>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        
        {/* SECTION 1: My Documents */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
              <p className="text-sm text-gray-500 mt-1">Documents you created and manage.</p>
            </div>
            <button
              onClick={createNewDocument}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              New Document
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Create Blank Card */}
            <div 
              className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer group" 
              onClick={createNewDocument}
            >
              <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Create Blank</span>
            </div>
            
            {/* Render Owned Documents */}
            {ownedDocs.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => router.push(`/editor/${doc.id}`)}
                className="flex h-48 flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 line-clamp-2">{doc.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium border-t pt-3 mt-2">
                  <Clock className="h-3.5 w-3.5" />
                  Edited {formatDate(doc.updated_at || new Date().toISOString())}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Shared With Me */}
        {sharedDocs.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-gray-400" /> Shared With Me
              </h2>
              <p className="text-sm text-gray-500 mt-1">Documents you've been invited to collaborate on.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sharedDocs.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => router.push(`/editor/${doc.id}`)}
                  className="flex h-48 flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer relative overflow-hidden"
                >
                  {/* Role Badge */}
                  <div className="absolute top-4 right-4">
                    {doc.role === 'editor' ? (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        <Edit3 className="h-3 w-3" /> Editor
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        <Eye className="h-3 w-3" /> Viewer
                      </span>
                    )}
                  </div>

                  <div>
                    <FileText className="h-8 w-8 text-gray-400 mb-3" />
                    <h3 className="font-bold text-gray-900 line-clamp-2 pr-16">{doc.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium border-t pt-3 mt-2">
                    <Clock className="h-3.5 w-3.5" />
                    Edited {formatDate(doc.updated_at || new Date().toISOString())}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}