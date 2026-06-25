'use client';

import { useState } from 'react';
import { type SupabaseClient } from '@supabase/supabase-js';
import { X, Users, Mail, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/src/lib/supabase/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  supabase: SupabaseClient<Database>;
  onSuccess: () => void;
}

export function ShareModal({ isOpen, onClose, documentId, supabase, onSuccess }: ShareModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || isLoading) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.rpc('invite_collaborator', {
        doc_id: documentId,
        invitee_email: inviteEmail.trim().toLowerCase(),
        assign_role: inviteRole
      });

      if (error) throw new Error(error.message);

      toast.success(`Invited ${inviteEmail} successfully!`);
      setInviteEmail('');
      setInviteRole('viewer'); // Reset to default
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to invite user.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Share Document</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="mb-5 text-sm text-slate-500">
            Invite others to collaborate on this document.
          </p>

          <form onSubmit={handleInvite} className="space-y-4">
            
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Collaborator Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input 
                  id="email"
                  type="email" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                  required 
                  autoFocus
                  disabled={isLoading}
                  placeholder="name@example.com"
                  className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 transition-all" 
                />
              </div>
            </div>

            {/* Role Select */}
            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
                Access Role
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Shield className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <select 
                  id="role"
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')} 
                  disabled={isLoading}
                  className="block w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 transition-all"
                >
                  <option value="viewer">Viewer (Can only read)</option>
                  <option value="editor">Editor (Can make changes)</option>
                </select>
                {/* Custom Chevron for select */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isLoading || !inviteEmail}
                className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
