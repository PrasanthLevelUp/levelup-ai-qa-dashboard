'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface RequirementDialogProps {
  open: boolean;
  onClose: (refresh: boolean) => void;
  requirement: any | null;
  projectHeaders: Record<string, string>;
}

export default function RequirementDialog({
  open,
  onClose,
  requirement,
  projectHeaders,
}: RequirementDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium',
    acceptanceCriteria: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (requirement) {
      setFormData({
        title: requirement.title || '',
        description: requirement.description || '',
        category: requirement.category || '',
        priority: requirement.priority || 'Medium',
        acceptanceCriteria: requirement.acceptance_criteria || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'Medium',
        acceptanceCriteria: '',
      });
    }
  }, [requirement, open]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      setSaving(true);
      const url = requirement ? `/api/requirements/${requirement.id}` : '/api/requirements';
      const method = requirement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...projectHeaders,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description || null,
          category: formData.category || null,
          priority: formData.priority,
          acceptanceCriteria: formData.acceptanceCriteria || null,
        }),
      });

      if (response.ok) {
        toast.success(requirement ? 'Requirement updated' : 'Requirement created');
        onClose(true);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast.error('Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1a1f2e] border-slate-700">
        <DialogHeader>
          <DialogTitle>{requirement ? 'Edit Requirement' : 'Create Requirement'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., User Login with Google SSO"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-slate-200"
              >
                <option value="">Select Category</option>
                <option value="Authentication">Authentication</option>
                <option value="Payment">Payment</option>
                <option value="UI">UI</option>
                <option value="API">API</option>
                <option value="Performance">Performance</option>
                <option value="Security">Security</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-slate-200"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Acceptance Criteria</Label>
            <Textarea
              value={formData.acceptanceCriteria}
              onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
              placeholder="Enter acceptance criteria (one per line)..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : requirement ? 'Save Changes' : 'Create Requirement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
