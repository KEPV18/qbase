# QBase WYSIWYG Document Editor — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the static `SchemaDrivenRecordView` with a rich, interactive WYSIWYG document editor that allows users to view, edit, fill, and save documents exactly like Microsoft Word. Include version history, audit trail, input validation, access control, and extended system metadata.

**Architecture:** 
- Frontend: React + Slate.js (rich text editor) + TipTap (WYSIWYG) or use a commercial component like react-docx-viewer
- Backend: Supabase RPC functions for atomic updates, RLS policies for access control
- Database: `record_versions` table for audit trail, `records` table updated with version counter
- Document format: Store as structured JSON (form_data) with rich text fields, not binary blobs

**Tech Stack:** React 18, TypeScript, Tailwind CSS, TipTap/ProseMirror for WYSIWYG, Supabase for backend, Zustand for state

---

## Phase 0: Analysis & Current State

### Task 0.1: Audit current implementation
**Objective:** Understand the current `SchemaDrivenRecordView` and how data flows

**Files:**
- Read: `src/components/forms/SchemaDrivenRecordView.tsx`
- Read: `src/components/forms/DynamicFormRenderer.tsx`
- Read: `src/data/formSchemas.ts`
- Read: `src/lib/supabase.ts` (if exists)
- Read: `src/types/records.ts` (if exists)

**Step 1:** Read all files and document current data flow
**Step 2:** Identify exactly where the editor component is mounted (which page/route)
**Step 3:** Check if there are any existing edit modes or forms

---

## Phase 1: Database Schema & Versioning

### Task 1.1: Create `record_versions` table
**Objective:** Store complete audit trail of every document version

**Backend:** Supabase SQL migration (run via Supabase Dashboard or psql)

```sql
-- record_versions table
CREATE TABLE IF NOT EXISTS record_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  form_data JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT,
  change_type TEXT CHECK (change_type IN ('create', 'edit', 'save', 'copy', 'delete', 'approve', 'reject')),
  diff_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_record_versions_record_id ON record_versions(record_id);
CREATE INDEX IF NOT EXISTS idx_record_versions_version_number ON record_versions(record_id, version_number);
CREATE INDEX IF NOT EXISTS idx_record_versions_changed_at ON record_versions(changed_at DESC);

-- RLS: Users can only see versions of records they have access to
ALTER TABLE record_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "record_versions_select" ON record_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_versions.record_id
      AND (
        r.created_by = auth.uid()
        OR r.assigned_to = auth.uid()
        OR r.status = 'approved'
        OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'qa_manager'))
      )
    )
  );

CREATE POLICY "record_versions_insert" ON record_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_versions.record_id
      AND (
        r.created_by = auth.uid()
        OR r.assigned_to = auth.uid()
        OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'editor'))
      )
    )
  );
```

**Verification:** 
```bash
# Run via Supabase SQL Editor, verify table exists
SELECT * FROM record_versions LIMIT 1;
```

### Task 1.2: Extend `records` table with version metadata
**Objective:** Add version tracking fields to the main records table

```sql
-- Add columns to records table
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS version_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS latest_version_id UUID REFERENCES record_versions(id),
  ADD COLUMN IF NOT EXISTS edit_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_source_id UUID REFERENCES records(id);

-- Add the new system metadata fields
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS linked_project TEXT,
  ADD COLUMN IF NOT EXISTS coverage_month TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID, -- optional FK if you have projects table
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end DATE;
```

### Task 1.3: Create RPC functions for atomic version operations
**Objective:** Ensure version creation is atomic and consistent

```sql
-- Function to save a new version atomically
CREATE OR REPLACE FUNCTION save_record_version(
  p_record_id UUID,
  p_form_data JSONB,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_change_type TEXT DEFAULT 'edit'
) RETURNS UUID AS $$
DECLARE
  v_new_version_id UUID;
  v_new_version_number INT;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version_number
  FROM record_versions
  WHERE record_id = p_record_id;

  -- Insert version
  INSERT INTO record_versions (
    record_id, version_number, form_data,
    changed_by, change_reason, change_type
  ) VALUES (
    p_record_id, v_new_version_number, p_form_data,
    p_changed_by, p_change_reason, p_change_type
  )
  RETURNING id INTO v_new_version_id;

  -- Update record with new version info
  UPDATE records SET
    form_data = p_form_data,
    version_number = v_new_version_number,
    latest_version_id = v_new_version_id,
    edit_count = edit_count + 1,
    updated_at = NOW(),
    _last_modified_at = NOW(),
    _last_modified_by = (SELECT email FROM auth.users WHERE id = p_changed_by)
  WHERE id = p_record_id;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock/unlock record for editing
CREATE OR REPLACE FUNCTION lock_record_for_edit(
  p_record_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock UUID;
  v_current_lock_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check current lock
  SELECT locked_by, locked_at
  INTO v_current_lock, v_current_lock_time
  FROM records WHERE id = p_record_id;

  -- If locked by someone else and less than 30 min ago, fail
  IF v_current_lock IS NOT NULL 
     AND v_current_lock != p_user_id 
     AND v_current_lock_time > NOW() - INTERVAL '30 minutes' THEN
    RETURN FALSE;
  END IF;

  -- Lock the record
  UPDATE records SET
    locked_by = p_user_id,
    locked_at = NOW()
  WHERE id = p_record_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unlock_record(
  p_record_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE records SET
    locked_by = NULL,
    locked_at = NULL
  WHERE id = p_record_id
    AND (locked_by = p_user_id OR locked_by IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Task 1.4: Create RPC for getting version history
**Objective:** Fast paginated version history lookup

```sql
CREATE OR REPLACE FUNCTION get_record_version_history(
  p_record_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  version_id UUID,
  version_number INT,
  changed_by_email TEXT,
  changed_at TIMESTAMP WITH TIME ZONE,
  change_reason TEXT,
  change_type TEXT,
  diff_summary JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id,
    rv.version_number,
    u.email,
    rv.changed_at,
    rv.change_reason,
    rv.change_type,
    rv.diff_summary
  FROM record_versions rv
  LEFT JOIN auth.users u ON rv.changed_by = u.id
  WHERE rv.record_id = p_record_id
  ORDER BY rv.version_number DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## Phase 2: Backend API Layer

### Task 2.1: Create record editor API hooks
**Objective:** React hooks for editor operations

**File:** `src/hooks/useRecordEditor.ts` (NEW)

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface EditorState {
  isEditing: boolean;
  isSaving: boolean;
  isLocked: boolean;
  lockedBy: string | null;
  canEdit: boolean;
  errors: Record<string, string>;
}

export interface VersionInfo {
  versionId: string;
  versionNumber: number;
  changedBy: string;
  changedAt: string;
  changeReason?: string;
  changeType: string;
}

export function useRecordEditor(recordId: string | undefined) {
  const { user } = useAuth();
  const [state, setState] = useState<EditorState>({
    isEditing: false,
    isSaving: false,
    isLocked: false,
    lockedBy: null,
    canEdit: false,
    errors: {},
  });

  const [versions, setVersions] = useState<VersionInfo[]>([]);

  // Check if user can edit this record
  const checkEditPermission = useCallback(async () => {
    if (!recordId || !user) return false;
    
    const { data: record } = await supabase
      .from('records')
      .select('created_by, assigned_to, status, locked_by, locked_at')
      .eq('id', recordId)
      .single();

    if (!record) return false;

    // Admin/QA Manager can always edit
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = ['admin', 'qa_manager'].includes(role?.role);
    
    // Creator or assignee can edit
    const isOwner = record.created_by === user.id || record.assigned_to === user.id;
    
    // Check if locked by someone else
    const isLockedByOther = record.locked_by 
      && record.locked_by !== user.id 
      && new Date(record.locked_at) > new Date(Date.now() - 30 * 60 * 1000);

    const canEdit = isAdmin || (isOwner && !isLockedByOther);
    
    setState(s => ({
      ...s,
      canEdit,
      isLocked: !!isLockedByOther,
      lockedBy: isLockedByOther ? record.locked_by : null,
    }));

    return canEdit;
  }, [recordId, user]);

  // Lock record for editing
  const startEditing = useCallback(async () => {
    if (!recordId || !user) return false;
    
    setState(s => ({ ...s, isEditing: true }));
    
    const { data, error } = await supabase.rpc('lock_record_for_edit', {
      p_record_id: recordId,
      p_user_id: user.id,
    });

    if (error || !data) {
      setState(s => ({ ...s, isEditing: false, isLocked: true }));
      return false;
    }

    return true;
  }, [recordId, user]);

  // Unlock and cancel editing
  const cancelEditing = useCallback(async () => {
    if (!recordId || !user) return;
    
    await supabase.rpc('unlock_record', {
      p_record_id: recordId,
      p_user_id: user.id,
    });

    setState(s => ({ ...s, isEditing: false, errors: {} }));
  }, [recordId, user]);

  // Save changes with version
  const saveChanges = useCallback(async (
    formData: Record<string, unknown>,
    changeReason?: string,
    options?: { linkedProject?: string; coverageMonth?: string }
  ) => {
    if (!recordId || !user) return { success: false, error: 'Not authenticated' };

    setState(s => ({ ...s, isSaving: true, errors: {} }));

    // Validate required fields
    const { data: schema } = await supabase
      .from('form_schemas')
      .select('fields')
      .eq('form_code', formData.form_code)
      .single();

    const errors: Record<string, string> = {};
    if (schema?.fields) {
      for (const field of schema.fields) {
        if (field.required && !formData[field.key]) {
          errors[field.key] = `${field.label} is required`;
        }
      }
    }

    // Validate new metadata fields
    if (options?.linkedProject !== undefined && !options.linkedProject) {
      errors.linked_project = 'Linked Project is required';
    }
    if (options?.coverageMonth !== undefined && !options.coverageMonth) {
      errors.coverage_month = 'Coverage Month is required';
    }

    if (Object.keys(errors).length > 0) {
      setState(s => ({ ...s, isSaving: false, errors }));
      return { success: false, errors };
    }

    // Build update payload
    const updatePayload: any = {
      form_data: formData,
      status: 'draft', // Reset to draft after edit
    };

    if (options?.linkedProject) {
      updatePayload.linked_project = options.linkedProject;
    }
    if (options?.coverageMonth) {
      updatePayload.coverage_month = options.coverageMonth;
    }

    // Save version first
    const { data: versionId, error: versionError } = await supabase.rpc('save_record_version', {
      p_record_id: recordId,
      p_form_data: formData,
      p_changed_by: user.id,
      p_change_reason: changeReason || 'Document updated',
      p_change_type: 'edit',
    });

    if (versionError) {
      setState(s => ({ ...s, isSaving: false }));
      return { success: false, error: versionError.message };
    }

    // Unlock after save
    await supabase.rpc('unlock_record', {
      p_record_id: recordId,
      p_user_id: user.id,
    });

    setState(s => ({
      ...s,
      isSaving: false,
      isEditing: false,
      errors: {},
    }));

    return { success: true, versionId };
  }, [recordId, user]);

  // Load version history
  const loadVersions = useCallback(async (limit = 20, offset = 0) => {
    if (!recordId) return;

    const { data, error } = await supabase.rpc('get_record_version_history', {
      p_record_id: recordId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Failed to load versions:', error);
      return;
    }

    setVersions(data || []);
  }, [recordId]);

  // Restore a previous version
  const restoreVersion = useCallback(async (versionId: string, reason?: string) => {
    if (!recordId || !user) return { success: false };

    // Get the version data
    const { data: version } = await supabase
      .from('record_versions')
      .select('form_data')
      .eq('id', versionId)
      .single();

    if (!version) return { success: false, error: 'Version not found' };

    // Save as new version (copy)
    const { data: newVersionId, error } = await supabase.rpc('save_record_version', {
      p_record_id: recordId,
      p_form_data: version.form_data,
      p_changed_by: user.id,
      p_change_reason: reason || `Restored from version ${versionId}`,
      p_change_type: 'copy',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Refresh versions
    await loadVersions();

    return { success: true, versionId: newVersionId };
  }, [recordId, user, loadVersions]);

  return {
    state,
    versions,
    checkEditPermission,
    startEditing,
    cancelEditing,
    saveChanges,
    loadVersions,
    restoreVersion,
  };
}
```

### Task 2.2: Create document diff utility
**Objective:** Show what changed between versions

**File:** `src/lib/documentDiff.ts` (NEW)

```typescript
export interface DiffResult {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { old: unknown; new: unknown }>;
}

export function computeDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): DiffResult {
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const changed: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of allKeys) {
    if (key.startsWith('_')) continue; // Skip metadata
    
    const oldVal = oldData[key];
    const newVal = newData[key];

    if (oldVal === undefined && newVal !== undefined) {
      added[key] = newVal;
    } else if (oldVal !== undefined && newVal === undefined) {
      removed[key] = oldVal;
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed[key] = { old: oldVal, new: newVal };
    }
  }

  return { added, removed, changed };
}

export function diffToSummary(diff: DiffResult): string[] {
  const summary: string[] = [];
  
  const addedKeys = Object.keys(diff.added);
  if (addedKeys.length > 0) {
    summary.push(`Added ${addedKeys.length} field(s): ${addedKeys.join(', ')}`);
  }
  
  const removedKeys = Object.keys(diff.removed);
  if (removedKeys.length > 0) {
    summary.push(`Removed ${removedKeys.length} field(s): ${removedKeys.join(', ')}`);
  }
  
  const changedKeys = Object.keys(diff.changed);
  if (changedKeys.length > 0) {
    summary.push(`Changed ${changedKeys.length} field(s): ${changedKeys.join(', ')}`);
  }
  
  if (summary.length === 0) {
    summary.push('No changes detected');
  }
  
  return summary;
}
```

---

## Phase 3: WYSIWYG Editor Components

### Task 3.1: Install rich text editor dependencies
**Objective:** Add TipTap/ProseMirror for WYSIWYG editing

**Command:**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-placeholder
npm install -D @tiptap/extension-color @tiptap/extension-text-style
```

### Task 3.2: Create `RichTextField` component
**Objective:** Single rich text input that looks like Word

**File:** `src/components/editor/RichTextField.tsx` (NEW)

```typescript
import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Redo, Undo } from 'lucide-react';

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export const RichTextField: React.FC<RichTextFieldProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  readOnly = false,
  minHeight = '120px',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p></p>',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>');
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`rich-text-field border rounded-md overflow-hidden ${readOnly ? 'bg-muted/30' : 'bg-white'}`}>
      {!readOnly && (
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            icon={<UnderlineIcon className="w-4 h-4" />}
          />
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            icon={<AlignLeft className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            icon={<AlignCenter className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            icon={<AlignRight className="w-4 h-4" />}
          />
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered className="w-4 h-4" />}
          />
          <div className="flex-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={<Undo className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={<Redo className="w-4 h-4" />}
          />
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3"
        style={{ minHeight }}
      />
    </div>
  );
};

const ToolbarButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}> = ({ onClick, icon, active, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded hover:bg-accent transition-colors ${
      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {icon}
  </button>
);

export default RichTextField;
```

### Task 3.3: Create `EditableSchemaField` component
**Objective:** Wrapper that renders the correct input based on field type

**File:** `src/components/editor/EditableSchemaField.tsx` (NEW)

```typescript
import React, { useState, useCallback } from 'react';
import { FieldSchema } from '../../data/formSchemas';
import { RichTextField } from './RichTextField';

interface EditableSchemaFieldProps {
  field: FieldSchema;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
  error?: string;
}

export const EditableSchemaField: React.FC<EditableSchemaFieldProps> = ({
  field,
  value,
  onChange,
  readOnly = false,
  error,
}) => {
  const handleChange = useCallback((newValue: unknown) => {
    onChange(field.key, newValue);
  }, [field.key, onChange]);

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'signature':
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              error ? 'border-red-500' : 'border-input'
            } ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
            placeholder={field.placeholder || `Enter ${field.label}`}
          />
        );

      case 'textarea':
        return (
          <RichTextField
            value={String(value || '')}
            onChange={(html) => handleChange(html)}
            placeholder={field.placeholder || `Enter ${field.label}`}
            readOnly={readOnly}
            minHeight="80px"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value === '' ? '' : Number(e.target.value))}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-md text-sm font-mono ${
              error ? 'border-red-500' : 'border-input'
            } ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={String(value || '').replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')}
            onChange={(e) => {
              const d = e.target.value;
              if (d) {
                const [y, m, day] = d.split('-');
                handleChange(`${day}/${m}/${y}`);
              } else {
                handleChange('');
              }
            }}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              error ? 'border-red-500' : 'border-input'
            } ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
          />
        );

      case 'select':
        return (
          <select
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            disabled={readOnly}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              error ? 'border-red-500' : 'border-input'
            } ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="flex flex-wrap gap-3">
            {field.options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={field.key}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={readOnly}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={readOnly}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm">{field.label}</span>
          </label>
        );

      case 'multiselect':
        const currentValues = Array.isArray(value) ? value : String(value || '').split(',').map(s => s.trim()).filter(Boolean);
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map(opt => (
              <label key={opt.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                currentValues.includes(opt.value)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white border-border text-muted-foreground hover:bg-accent'
              } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}>
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={currentValues.includes(opt.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...currentValues, opt.value]
                      : currentValues.filter(v => v !== opt.value);
                    handleChange(newValues);
                  }}
                  disabled={readOnly}
                  className="hidden"
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'table': {
        const rows = Array.isArray(value) ? value : [];
        const columns = field.columns || [];
        return (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="px-2 py-1.5 text-xs font-medium text-left">#</th>
                  {columns.map(col => (
                    <th key={col.key} className="px-2 py-1.5 text-xs font-medium text-left">{col.label}</th>
                  ))}
                  {!readOnly && <th className="px-2 py-1.5 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                    {columns.map(col => (
                      <td key={col.key} className="px-2 py-1.5">
                        <input
                          type="text"
                          value={String(row[col.key] || '')}
                          onChange={(e) => {
                            const newRows = [...rows];
                            newRows[i] = { ...newRows[i], [col.key]: e.target.value };
                            handleChange(newRows);
                          }}
                          readOnly={readOnly}
                          className={`w-full px-2 py-1 text-sm border rounded ${readOnly ? 'bg-transparent' : 'bg-white border-input'}`}
                        />
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => {
                            const newRows = rows.filter((_: any, ri: number) => ri !== i);
                            handleChange(newRows);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && (
              <button
                onClick={() => {
                  const newRow: any = {};
                  columns.forEach(col => newRow[col.key] = '');
                  handleChange([...rows, newRow]);
                }}
                className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent border-t"
              >
                + Add Row
              </button>
            )}
          </div>
        );
      }

      default:
        return (
          <RichTextField
            value={String(value || '')}
            onChange={(html) => handleChange(html)}
            placeholder={field.placeholder || `Enter ${field.label}`}
            readOnly={readOnly}
            minHeight="60px"
          />
        );
    }
  };

  return (
    <div className={`space-y-1 ${error ? 'animate-shake' : ''}`}>
      {field.type !== 'checkbox' && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">
            {field.label}
          </span>
          {field.required && (
            <span className="text-red-500">*</span>
          )}
          {field.readOnly && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Read-only
            </span>
          )}
        </div>
      )}
      {renderInput()}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default EditableSchemaField;
```

### Task 3.4: Create `DocumentEditor` main component
**Objective:** Full WYSIWYG editor with all features

**File:** `src/components/editor/DocumentEditor.tsx` (NEW)

```typescript
import React, { useState, useCallback, useEffect } from 'react';
import { Save, X, Edit2, Lock, History, Eye, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { SchemaDrivenRecordView } from '../forms/SchemaDrivenRecordView';
import { EditableSchemaField } from './EditableSchemaField';
import { useRecordEditor } from '../../hooks/useRecordEditor';
import { FormSchema, getFormSchema } from '../../data/formSchemas';
import { useAuth } from '../../hooks/useAuth';

interface DocumentEditorProps {
  recordId: string;
  formCode: string;
  initialData: Record<string, unknown>;
  onSaved?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  recordId,
  formCode,
  initialData,
  onSaved,
}) => {
  const { user } = useAuth();
  const {
    state: editorState,
    versions,
    checkEditPermission,
    startEditing,
    cancelEditing,
    saveChanges,
    loadVersions,
    restoreVersion,
  } = useRecordEditor(recordId);

  const [editData, setEditData] = useState<Record<string, unknown>>(initialData);
  const [changeReason, setChangeReason] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [linkedProject, setLinkedProject] = useState(initialData.linked_project as string || '');
  const [coverageMonth, setCoverageMonth] = useState(initialData.coverage_month as string || '');

  // Check permissions on mount
  useEffect(() => {
    checkEditPermission();
  }, [checkEditPermission]);

  // Load versions when panel opens
  useEffect(() => {
    if (showVersions) {
      loadVersions();
    }
  }, [showVersions, loadVersions]);

  const schema = getFormSchema(formCode);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const result = await saveChanges(editData, changeReason || undefined, {
      linkedProject: linkedProject || undefined,
      coverageMonth: coverageMonth || undefined,
    });

    if (result.success) {
      setChangeReason('');
      onSaved?.();
    }
  }, [editData, changeReason, linkedProject, coverageMonth, saveChanges, onSaved]);

  const handleStartEdit = useCallback(async () => {
    const success = await startEditing();
    if (success) {
      setEditData(initialData); // Reset to current data
    }
  }, [startEditing, initialData]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    const reason = prompt('Reason for restoring this version?');
    const result = await restoreVersion(versionId, reason || undefined);
    if (result.success) {
      // Reload page or data
      window.location.reload();
    }
  }, [restoreVersion]);

  const canEdit = editorState.canEdit && !editorState.isLocked;

  return (
    <div className="document-editor space-y-6">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-3">
          {editorState.isEditing ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                <Edit2 className="w-3 h-3" />
                Editing
              </span>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Reason for changes (optional)"
                className="px-3 py-1.5 text-sm border rounded-md w-64"
              />
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
              <Eye className="w-3 h-3" />
              View Mode
            </span>
          )}

          {editorState.isLocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
              <Lock className="w-3 h-3" />
              Locked by {editorState.lockedBy}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
          >
            <History className="w-4 h-4" />
            Versions
          </button>

          {editorState.isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={editorState.isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {editorState.isSaving ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              disabled={!canEdit || editorState.isLocked}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ── System Metadata Extension ─────────────────────────── */}
      <div className="p-4 border rounded-lg bg-card/50">
        <h3 className="text-sm font-semibold text-foreground mb-3">System Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Linked Project <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={linkedProject}
              onChange={(e) => setLinkedProject(e.target.value)}
              readOnly={!editorState.isEditing}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                !editorState.isEditing ? 'bg-muted/50' : 'bg-white'
              } ${editorState.errors.linked_project ? 'border-red-500' : 'border-input'}`}
              placeholder="Enter project name or ID"
            />
            {editorState.errors.linked_project && (
              <p className="text-xs text-red-500">{editorState.errors.linked_project}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Coverage Month <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={coverageMonth}
              onChange={(e) => setCoverageMonth(e.target.value)}
              readOnly={!editorState.isEditing}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                !editorState.isEditing ? 'bg-muted/50' : 'bg-white'
              } ${editorState.errors.coverage_month ? 'border-red-500' : 'border-input'}`}
            />
            {editorState.errors.coverage_month && (
              <p className="text-xs text-red-500">{editorState.errors.coverage_month}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Document Body ───────────────────────────────────────── */}
      {editorState.isEditing && schema ? (
        <div className="space-y-4 p-4 border rounded-lg bg-white">
          {schema.fields.map((field) => {
            if (field.type === 'heading') {
              return (
                <h3 key={field.key} className="text-lg font-semibold text-foreground pt-4 border-b pb-2">
                  {field.label}
                </h3>
              );
            }

            return (
              <EditableSchemaField
                key={field.key}
                field={field}
                value={editData[field.key] ?? editData.formData?.[field.key]}
                onChange={handleFieldChange}
                readOnly={field.readOnly || false}
                error={editorState.errors[field.key]}
              />
            );
          })}
        </div>
      ) : (
        <SchemaDrivenRecordView
          formCode={formCode}
          data={initialData}
          showMeta={true}
        />
      )}

      {/* ── Version History Panel ───────────────────────────────── */}
      {showVersions && (
        <div className="border rounded-lg bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Version History
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No versions yet</p>
            )}
            {versions.map((v) => (
              <div key={v.versionId} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Version {v.versionNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      v.changeType === 'create' ? 'bg-green-500/10 text-green-600' :
                      v.changeType === 'edit' ? 'bg-blue-500/10 text-blue-600' :
                      v.changeType === 'copy' ? 'bg-purple-500/10 text-purple-600' :
                      'bg-gray-500/10 text-gray-600'
                    }`}>
                      {v.changeType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By {v.changedBy || 'Unknown'} on {new Date(v.changedAt).toLocaleDateString()}
                  </p>
                  {v.changeReason && (
                    <p className="text-xs text-muted-foreground italic">{v.changeReason}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRestoreVersion(v.versionId)}
                  disabled={!canEdit}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-accent disabled:opacity-50"
                >
                  <Copy className="w-3 h-3" />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
```

---

## Phase 4: Integration & Routing

### Task 4.1: Create editor page/route
**Objective:** Mount the DocumentEditor in the app

**File:** `src/pages/RecordEditorPage.tsx` (NEW)

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DocumentEditor } from '../components/editor/DocumentEditor';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const RecordEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadRecord = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setRecord(data);
      }
      
      setLoading(false);
    };

    loadRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error || 'Record not found'}</p>
        <button
          onClick={() => navigate('/records')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Records
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/records')}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-semibold">{record.form_code} — {record.serial}</h1>
      </div>

      <DocumentEditor
        recordId={record.id}
        formCode={record.form_code}
        initialData={record}
        onSaved={() => {
          // Optionally refresh or show toast
          window.location.reload();
        }}
      />
    </div>
  );
};

export default RecordEditorPage;
```

### Task 4.2: Add route
**Objective:** Wire up the editor page in the router

**File:** `src/App.tsx` (MODIFY)

Add import and route:
```typescript
import RecordEditorPage from './pages/RecordEditorPage';

// In routes:
<Route path="/records/:id/edit" element={<RecordEditorPage />} />
```

### Task 4.3: Add "Edit" button to record list
**Objective:** Navigate to editor from record browser

**File:** `src/components/records/RecordBrowser.tsx` or wherever records are listed

Add an edit button/link to each record row:
```typescript
<Link
  to={`/records/${record.id}/edit`}
  className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-accent"
>
  <Edit2 className="w-3 h-3" />
  Edit
</Link>
```

---

## Phase 5: CSS & Styling

### Task 5.1: Add editor-specific styles
**Objective:** Make the editor look professional

**File:** `src/App.css` (ADD to existing)

```css
/* Document Editor Styles */
.document-editor {
  --editor-bg: #ffffff;
  --editor-border: #e5e7eb;
}

.rich-text-field .ProseMirror {
  outline: none;
  min-height: inherit;
}

.rich-text-field .ProseMirror p {
  margin: 0.5em 0;
}

.rich-text-field .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.rich-text-field .ProseMirror ul,
.rich-text-field .ProseMirror ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.rich-text-field .ProseMirror h1,
.rich-text-field .ProseMirror h2,
.rich-text-field .ProseMirror h3 {
  margin: 0.75em 0 0.5em;
}

.rich-text-field .ProseMirror blockquote {
  border-left: 3px solid var(--editor-border);
  padding-left: 1em;
  margin: 0.5em 0;
  color: #6b7280;
}

/* Print styles for documents */
@media print {
  .document-editor .toolbar,
  .document-editor .version-panel {
    display: none !important;
  }
  
  .document-editor .document-body {
    border: none !important;
    padding: 0 !important;
  }
}

/* Animation for error shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
```

---

## Phase 6: Validation & Access Control

### Task 6.1: Implement field-level access control
**Objective:** Prevent editing restricted fields based on user role

**File:** `src/hooks/useFieldAccess.ts` (NEW)

```typescript
import { useMemo } from 'react';
import { useAuth } from './useAuth';

export type FieldAccess = 'read' | 'write' | 'none';

export function useFieldAccess(formCode: string) {
  const { user, role } = useAuth();

  const getFieldAccess = useMemo(() => {
    return (fieldKey: string, fieldReadOnly?: boolean): FieldAccess => {
      // If field is explicitly read-only in schema
      if (fieldReadOnly) return 'read';

      // Admin can edit everything
      if (role === 'admin') return 'write';

      // QA Manager can edit most fields except audit-related
      if (role === 'qa_manager') {
        const restrictedFields = ['audit_result', 'approval_status', 'final_decision'];
        if (restrictedFields.includes(fieldKey)) return 'read';
        return 'write';
      }

      // Regular users can only edit non-restricted fields
      const userEditable = ['name', 'description', 'notes', 'comments', 'attachments'];
      if (userEditable.includes(fieldKey)) return 'write';

      return 'read';
    };
  }, [role]);

  return { getFieldAccess };
}
```

### Task 6.2: Add form validation rules
**Objective:** Client-side validation before saving

**File:** `src/lib/validation.ts` (NEW)

```typescript
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateForm(
  data: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.required && (!value || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    if (value && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${field} must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = `${field} format is invalid`;
      }
    }

    if (rule.custom && value !== undefined && value !== '') {
      const customError = rule.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
```

---

## Phase 7: Testing & Verification

### Task 7.1: Test the full edit-save cycle
**Objective:** Verify data persists correctly

**Steps:**
1. Open a record in edit mode
2. Modify a field value
3. Click Save
4. Verify version is created in `record_versions`
5. Verify `records` table updated with new `form_data`
6. Check `edit_count` incremented
7. Verify `linked_project` and `coverage_month` saved

### Task 7.2: Test version history
**Objective:** Verify version tracking works

**Steps:**
1. Edit and save a record 3 times
2. Open version history panel
3. Verify 3 versions shown
4. Click "Restore" on version 1
5. Verify new version 4 created with "copy" type
6. Verify data matches version 1

### Task 7.3: Test access control
**Objective:** Verify role-based restrictions

**Steps:**
1. Login as regular user
2. Try to edit record created by admin
3. Verify lock/unlock behavior
4. Login as admin
5. Verify can edit all records

---

## Execution Summary

**Estimated Time:** 2-3 days
**Priority Order:**
1. Phase 1 (Database) — Must be done first
2. Phase 2 (Backend hooks) — Required by frontend
3. Phase 3 (Editor components) — Core feature
4. Phase 4 (Integration) — Wire it up
5. Phase 5 (Styling) — Polish
6. Phase 6 (Validation) — Security
7. Phase 7 (Testing) — Verification

**Subagent Split:**
- **Subagent A:** Phase 1 + 2 (Database + Backend)
- **Subagent B:** Phase 3 + 4 + 5 (Frontend Editor + Integration + Styling)
- **Subagent C:** Phase 6 + 7 (Validation + Testing)

---

**Ready to execute. Shall I dispatch subagents to implement this plan?**