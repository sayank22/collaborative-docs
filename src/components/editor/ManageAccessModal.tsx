import { X, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Collaborator } from '@/src/hooks/useDocumentSync';

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  supabase: any;
  userRole: 'owner' | 'editor' | 'viewer';
  collaborators: Collaborator[];
  onSuccess: () => void;
}

export function ManageAccessModal({ isOpen, onClose, documentId, supabase, userRole, collaborators, onSuccess }: ManageAccessModalProps) {
  if (!isOpen) return null;

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    const executeUpdate = async () => {
      const { error } = await supabase.rpc('update_collaborator_role', { doc_id: documentId, target_user_id: targetUserId, new_role: newRole });
      if (error) throw new Error(error.message);
      onSuccess();
      return true;
    };
    toast.promise(executeUpdate(), { loading: 'Updating role...', success: 'Role updated!', error: (err) => err.message || 'Failed to update.' });
  };

  const handleRemoveUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;
    const executeRemove = async () => {
      const { error } = await supabase.rpc('remove_collaborator', { doc_id: documentId, target_user_id: targetUserId });
      if (error) throw new Error(error.message);
      onSuccess();
      return true;
    };
    toast.promise(executeRemove(), { loading: 'Removing user...', success: 'User removed.', error: (err) => err.message || 'Failed to remove.' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-gray-700"/> Manage Access</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><X className="w-5 h-5"/></button>
        </div>
        <div className="overflow-y-auto flex-1 pr-2 space-y-3">
          {collaborators.map((c) => (
            <div key={c.user_id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{c.email}</p>
                <p className="text-xs text-gray-500">Added {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                {c.role === 'owner' ? (
                  <span className="text-sm font-bold text-gray-400 bg-gray-200 px-3 py-1 rounded-md">Owner</span>
                ) : (
                  <>
                    <select value={c.role} onChange={(e) => handleUpdateRole(c.user_id, e.target.value)} disabled={userRole !== 'owner'} className={`text-sm border rounded-md px-2 py-1 ${userRole !== 'owner' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white cursor-pointer'}`}>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {userRole === 'owner' && (
                      <button onClick={() => handleRemoveUser(c.user_id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {collaborators.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No collaborators found.</p>}
        </div>
      </div>
    </div>
  );
}