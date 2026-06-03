'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  requirementId?: string;
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  requirementId,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Delete Requirement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-slate-200">
            Are you sure you want to delete requirement{' '}
            <span className="font-mono text-violet-400">{requirementId}</span>?
          </p>
          <p className="text-sm text-slate-400">
            This will also unlink all associated test cases and scripts. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
