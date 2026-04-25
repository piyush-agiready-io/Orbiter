'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { useEffect, useRef } from 'react';
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
  mentionUsers?: { id: string; name: string }[];
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  if (!editor) return null;

  const items = [
    { icon: <TextB size={16} weight="bold" />, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: <TextItalic size={16} />, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { icon: <TextStrikethrough size={16} />, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike') },
    { type: 'divider' as const },
    { icon: <TextHOne size={16} />, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { icon: <TextHTwo size={16} />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { icon: <TextHThree size={16} />, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
    { type: 'divider' as const },
    { icon: <ListBullets size={16} />, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { icon: <ListNumbers size={16} />, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    { type: 'divider' as const },
    { icon: <Code size={16} />, action: () => editor.chain().focus().toggleCode().run(), isActive: editor.isActive('code') },
    { icon: <CodeBlock size={16} />, action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: editor.isActive('codeBlock') },
    { icon: <Quotes size={16} />, action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote') },
    { icon: <Minus size={16} />, action: () => editor.chain().focus().setHorizontalRule().run(), isActive: false },
    { type: 'divider' as const },
    { icon: <ArrowCounterClockwise size={16} />, action: () => editor.chain().focus().undo().run(), isActive: false },
    { icon: <ArrowClockwise size={16} />, action: () => editor.chain().focus().redo().run(), isActive: false },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-default px-3 py-1.5">
      {items.map((item, i) => {
        if ('type' in item && item.type === 'divider') {
          return <div key={`divider-${i}`} className="mx-1 h-5 w-px bg-[var(--color-border-subtle)]" />;
        }
        const btn = item as { icon: React.ReactNode; action: () => void; isActive: boolean };
        return (
          <Button key={i} variant="ghost" size="icon-xs" onClick={btn.action} className={btn.isActive ? 'bg-muted text-primary' : 'text-secondary'}>
            {btn.icon}
          </Button>
        );
      })}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMentionSuggestion(users: { id: string; name: string }[]): any {
  return {
    items: ({ query }: { query: string }) => {
      return users
        .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6);
    },
    render: () => {
      let popup: HTMLDivElement | null = null;
      let selectedIndex = 0;
      let items: { id: string; name: string }[] = [];
      let commandFn: ((item: { id: string; name: string }) => void) | null = null;

      function updatePopup() {
        if (!popup) return;
        popup.innerHTML = items
          .map(
            (item, i) =>
              `<button class="mention-item ${i === selectedIndex ? 'is-selected' : ''}" data-index="${i}">${item.name}</button>`,
          )
          .join('');
        popup.querySelectorAll('.mention-item').forEach((btn) => {
          btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const index = parseInt((btn as HTMLElement).dataset.index ?? '0');
            if (commandFn && items[index]) commandFn(items[index]);
          });
        });
      }

      return {
        onStart: (props: any) => {
          items = props.items ?? [];
          commandFn = props.command;
          selectedIndex = 0;
          popup = document.createElement('div');
          popup.className = 'mention-popup';
          document.body.appendChild(popup);
          updatePopup();
          const rect = props.clientRect?.();
          if (rect && popup) {
            popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
            popup.style.left = `${rect.left + window.scrollX}px`;
          }
        },
        onUpdate: (props: any) => {
          items = props.items ?? [];
          commandFn = props.command;
          selectedIndex = 0;
          updatePopup();
          const rect = props.clientRect?.();
          if (rect && popup) {
            popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
            popup.style.left = `${rect.left + window.scrollX}px`;
          }
        },
        onKeyDown: (props: any) => {
          if (props.event.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % items.length; updatePopup(); return true; }
          if (props.event.key === 'ArrowUp') { selectedIndex = (selectedIndex - 1 + items.length) % items.length; updatePopup(); return true; }
          if (props.event.key === 'Enter') { if (commandFn && items[selectedIndex]) commandFn(items[selectedIndex]); return true; }
          if (props.event.key === 'Escape') { popup?.remove(); popup = null; return true; }
          return false;
        },
        onExit: () => { popup?.remove(); popup = null; },
      };
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function DocEditor({ content, onChange, editable = true, mentionUsers = [] }: DocEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: createMentionSuggestion(mentionUsers),
      }),
    ],
    content: content && Object.keys(content).length > 0 ? content : undefined,
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none px-6 py-4 outline-none min-h-[400px] text-primary [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_code]:rounded-sm [&_code]:bg-subtle [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_pre]:rounded-lg [&_pre]:bg-subtle [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_blockquote]:border-l-2 [&_blockquote]:border-default [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-secondary [&_hr]:my-4 [&_hr]:border-default [&_.mention]:rounded-sm [&_.mention]:bg-accent-muted [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:text-accent [&_.mention]:font-medium',
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
    <>
      <style>{`
        .mention-popup {
          position: absolute;
          z-index: 50;
          width: 220px;
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border-subtle);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          padding: 4px;
          max-height: 240px;
          overflow-y: auto;
        }
        .mention-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 13px;
          color: var(--color-text-primary);
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .mention-item:hover, .mention-item.is-selected {
          background: var(--color-bg-subtle);
        }
      `}</style>
      <div className="overflow-hidden rounded-lg border border-default bg-surface">
        {editable && <MenuBar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
