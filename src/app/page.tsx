'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client';
import { FileText, Plus, Loader2, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email ?? null);
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const createNewDocument = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Generate the ID locally (True Local-First approach!)
      const newDocId = crypto.randomUUID();

      // 2. Insert the document (without .select() to avoid the read-back trap)
      const { error: docError } = await supabase
        .from('documents')
        .insert({ id: newDocId, title: 'Untitled Document' });

      if (docError) throw docError;

      // 3. Assign the user as the "Owner" in the collaborators table
      const { error: collabError } = await supabase
        .from('collaborators')
        .insert({ 
          document_id: newDocId, 
          user_id: session.user.id, 
          role: 'owner' 
        });

      if (collabError) throw collabError;

      // 4. Route directly to the new editor page
      router.push(`/editor/${newDocId}`);
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document.');
    }
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
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">CollabDocs</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{userEmail}</span>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <button
            onClick={createNewDocument}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New Document
          </button>
        </div>

        {/* Document Grid (Placeholder for now) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer" onClick={createNewDocument}>
            <Plus className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-900">Create Blank</span>
          </div>
          
          {/* We will map over the actual database documents here later */}
        </div>
      </main>
    </div>
  );
}