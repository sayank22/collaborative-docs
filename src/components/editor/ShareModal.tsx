import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  supabase: any;
  onSuccess: () => void;
}

export function ShareModal({ isOpen, onClose, documentId, supabase, onSuccess }: ShareModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const executeInvite = async () => {
      const { error } = await supabase.rpc('invite_collaborator', {
        doc_id: documentId,
        invitee_email: inviteEmail.trim().toLowerCase(),
        assign_role: inviteRole
      });
      if (error) throw new Error(error.message);
      onSuccess();
      return true;
    };

    toast.promise(executeInvite(), {
      loading: 'Sending invite...',
      success: () => {
        setInviteEmail('');
        onClose();
        return `Invited ${inviteEmail} successfully!`;
      },
      error: (err) => err.message || 'Failed to invite user.',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-blue-600"><Users className="w-5 h-5 text-blue-600"/> Share Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collaborator Email</label>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition">Send Invitation</button>
        </form>
      </div>
    </div>
  );
}