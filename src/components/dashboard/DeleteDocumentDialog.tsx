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

interface DeleteDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteDocumentDialog({ isOpen, onOpenChange, onConfirm }: DeleteDocumentDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
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
            onClick={onConfirm} 
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
          >
            Delete Document
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}