import React, { useState, useCallback, useEffect } from 'react';
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