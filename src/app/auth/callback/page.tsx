'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // This automatically parses the code from the URL and creates the session
      const { error } = await supabase.auth.getSession();
      
      if (!error) {
        router.push('/');
      } else {
        console.error('Auth callback error:', error.message);
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-sm text-gray-600">Completing login, please wait...</p>
      </div>
    </div>
  );
}