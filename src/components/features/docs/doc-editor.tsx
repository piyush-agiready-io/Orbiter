'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  Code,
  CodeBlock,
  Quotes,
  ArrowCounterClockwise,
  ArrowClockwise,
  TextHOne,
  TextHTwo,
  TextHThree,
  Minus,
} from '@phosphor-icons/react';

interface DocEditorProps {
  content: Record<string, unknown>;
  onChange: (json: Record<string, unknown>, plaintext: string) => void;
  editable?: boolean;
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  if (!editor) return null;

  const items = [
    {
      icon: <TextB size={16} weight="bold" />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: <TextItalic size={16} />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: <TextStrikethrough size={16} />,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
    },
    { type: 'divider' as const },
    {
      icon: <TextHOne size={16} />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <TextHTwo size={16} />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: <TextHThree size={16} />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    { type: 'divider' as const },
    {
      icon: <ListBullets size={16} />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: <ListNumbers size={16} />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      icon: <Code size={16} />,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive('code'),
    },
    {
      icon: <CodeBlock size={16} />,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
    },
    {
      icon: <Quotes size={16} />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: <Minus size={16} />,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
    },
    { type: 'divider' as const },
    {
      icon: <ArrowCounterClockwise size={16} />,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
    },
    {
      icon: <ArrowClockwise size={16} />,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-default px-3 py-1.5">
      {items.map((item, i) => {
        if ('type' in item && item.type === 'divider') {
          return (
            <div
              key={`divider-${i}`}
              className="mx-1 h-5 w-px bg-[var(--color-border-subtle)]"
            />
          );
        }
        const btn = item as { icon: React.ReactNode; action: () => void; isActive: boolean };
        return (
          <Button
            key={i}
            variant="ghost"
            size="icon-xs"
            onClick={btn.action}
            className={btn.isActive ? 'bg-muted text-primary' : 'text-secondary'}
          >
            {btn.icon}
          </Button>
        );
      })}
    </div>
  );
}

export function DocEditor({ content, onChange, editable = true }: DocEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content && Object.keys(content).length > 0 ? content : undefined,
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none px-6 py-4 outline-none min-h-[400px] text-primary [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_code]:rounded-sm [&_code]:bg-subtle [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_pre]:rounded-lg [&_pre]:bg-subtle [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_blockquote]:border-l-2 [&_blockquote]:border-default [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-secondary [&_hr]:my-4 [&_hr]:border-default',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Record<string, unknown>;
      const plaintext = editor.getText();
      onChange(json, plaintext);
    },
  });

  useEffect(() => {
    if (editor && content && Object.keys(content).length > 0) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  return (
    <div className="overflow-hidden rounded-lg border border-default bg-surface">
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
