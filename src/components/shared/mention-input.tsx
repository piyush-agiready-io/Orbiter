'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from 'boring-avatars';
import { useUsers } from '@/hooks/queries/use-users';

interface MentionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  inviteStatus?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentionIds: string[]) => void;
  placeholder?: string;
  rows?: number;
  onSubmit?: () => void;
}

export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = 'Add a comment... Use @ to mention',
  rows = 2,
  onSubmit,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionIds, setMentionIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: usersData } = useUsers();
  const allUsers: MentionUser[] = ((usersData as { users?: MentionUser[] })?.users ?? [])
    .filter((u) => u.role !== 'client' && u.inviteStatus === 'active');

  const filtered = allUsers.filter(
    (u) => !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 6);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setQuery(atMatch[1]);
      setShowDropdown(true);
      setSelectedIndex(0);

      const textarea = textareaRef.current;
      if (textarea) {
        const lineHeight = 20;
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const top = (currentLineIndex + 1) * lineHeight + 4;
        setDropdownPos({ top, left: 8 });
      }
    } else {
      setShowDropdown(false);
    }
  }, [onChange]);

  const insertMention = useCallback((user: MentionUser) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex === -1) return;

    const before = value.slice(0, atIndex);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${user.name} ${after}`;

    onChange(newValue);
    setShowDropdown(false);

    const newIds = new Set(mentionIds);
    newIds.add(user.id);
    setMentionIds(newIds);
    onMentionsChange(Array.from(newIds));

    requestAnimationFrame(() => {
      const newCursorPos = atIndex + user.name.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [value, onChange, mentionIds, onMentionsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showDropdown && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }, [showDropdown, filtered, selectedIndex, insertMention, onSubmit]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={rows}
        className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-sm text-primary placeholder:text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      />

      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 rounded-lg border border-subtle bg-surface shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] border-b border-subtle">
            Team Members
          </div>
          {filtered.map((user, i) => (
            <button
              key={user.id}
              type="button"
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
                i === selectedIndex ? 'bg-subtle' : 'hover:bg-subtle'
              }`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <Avatar
                size={24}
                variant="beam"
                name={user.name}
                colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary truncate">{user.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
