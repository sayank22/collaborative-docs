'use client';

import { useState } from 'react';
import { type SupabaseClient } from '@supabase/supabase-js';
import { X, Settings, Trash2, Shield, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Collaborator } from '@/src/hooks/useDocumentSync';
import type { Database, UserRole } from '@/src/lib/supabase/types';

// --- NEW: SHADCN IMPORTS ---
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

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  supabase: SupabaseClient<Database>;
  userRole: 'owner' | 'editor' | 'viewer';
  collaborators: Collaborator[];
  onSuccess: () => void;
}

export function ManageAccessModal({ 
  isOpen, 
  onClose, 
  documentId, 
  supabase, 
  userRole, 
  collaborators, 
  onSuccess 
}: ManageAccessModalProps) {
  // Track which specific user row is currently processing a mutation
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // --- NEW: SHADCN MODAL STATE ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateRole = async (targetUserId: string, newRole: UserRole) => {
    setProcessingId(targetUserId);
    try {
      const { error } = await supabase.rpc('update_collaborator_role', { 
        doc_id: documentId, 
        target_user_id: targetUserId, 
        new_role: newRole 
      });
      if (error) throw new Error(error.message);
      
      onSuccess();
      toast.success('Role updated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || 'Failed to update role.');
    } finally {
      setProcessingId(null);
    }
  };

  // 1. The Trigger: Prepares state and opens the accessible modal overlay
  const promptRemoveUser = (targetUserId: string) => {
    setUserToRemove(targetUserId);
    setIsDeleteDialogOpen(true);
  };

  // 2. The Finalizer: Fires off natively once the user confirms in the shadcn dialog box
  const executeRemoveUser = async () => {
    if (!userToRemove) return;
    
    setProcessingId(userToRemove);
    try {
      const { error } = await supabase.rpc('remove_collaborator', { 
        doc_id: documentId, 
        target_user_id: userToRemove 
      });
      if (error) throw new Error(error.message);
      
      onSuccess();
      toast.success('Collaborator removed.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || 'Failed to remove collaborator.');
    } finally {
      setProcessingId(null);
      setUserToRemove(null);
    }
  };

  const getInitial = (email: string) => email ? email.charAt(0).toUpperCase() : '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Settings className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Manage Access</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-5 text-sm text-slate-500">
            People with access to this document. Owners can change roles or remove collaborators.
          </p>

          <div className="space-y-3">
            {collaborators.map((c) => {
              const isProcessing = processingId === c.user_id;
              
              return (
                <div 
                  key={c.user_id} 
                  className={`flex items-center justify-between rounded-xl border border-slate-200 p-3 transition-colors ${
                    isProcessing ? 'bg-slate-50/50 opacity-70' : 'bg-white hover:border-slate-300'
                  }`}
                >
                  {/* User Info (Avatar + Email) */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-blue-100 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-blue-200/50">
                      {getInitial(c.email)}
                    </div>
                    <div className="truncate pr-4">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.email}</p>
                      <p className="text-xs text-slate-500">
                        Added {new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex shrink-0 items-center gap-2">
                    {isProcessing ? (
                      <div className="flex w-24 items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : c.role === 'owner' ? (
                      <span className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                        <Shield className="h-3 w-3" /> Owner
                      </span>
                    ) : (
                      <>
                        {/* Custom Select Dropdown */}
                        <div className="relative">
                          <select 
                            value={c.role} 
                            onChange={(e) => handleUpdateRole(c.user_id, e.target.value as UserRole)} 
                            disabled={userRole !== 'owner'} 
                            className={`block w-28 appearance-none rounded-lg border py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                              userRole !== 'owner' 
                                ? 'border-transparent bg-slate-50 text-slate-500 cursor-not-allowed' 
                                : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 cursor-pointer'
                            }`}
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg className={`h-4 w-4 ${userRole !== 'owner' ? 'text-slate-300' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* UPGRADED: Trigger Shadcn Remove Button */}
                        {userRole === 'owner' && (
                          <button 
                            onClick={() => promptRemoveUser(c.user_id)} 
                            title="Remove collaborator"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {collaborators.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                  <User className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No collaborators found</p>
                <p className="mt-1 text-xs text-slate-500">Share this document to add people.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- NEW: SHADCN ACCESSIBLE DIALOG BACKDROP COMPONENT --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Remove Collaborator?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 mt-2">
              Are you sure you want to remove this collaborator? They will instantly lose all access to view or edit this document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2 justify-end">
            <AlertDialogCancel className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeRemoveUser}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-600/10"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}