import { useEffect, useCallback } from 'react';

export interface Hotkey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const hotkey of hotkeys) {
      const ctrlMatch = hotkey.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = hotkey.alt ? event.altKey : !event.altKey;
      
      // Check key match (case insensitive)
      const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase() ||
                       event.code.toLowerCase() === hotkey.key.toLowerCase();
      
      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        hotkey.handler();
        return;
      }
    }
  }, [hotkeys]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common keyboard shortcuts for QMS
export const commonHotkeys = {
  save: { key: 's', ctrl: true, description: 'Save current form' },
  search: { key: 'k', ctrl: true, description: 'Open search' },
  newRecord: { key: 'n', ctrl: true, description: 'Create new record' },
  refresh: { key: 'r', ctrl: true, description: 'Refresh data' },
  export: { key: 'e', ctrl: true, description: 'Export data' },
  escape: { key: 'Escape', description: 'Close modal/dialog' },
};

// Helper to create hotkey config
export function createHotkey(
  key: string,
  handler: () => void,
  options: Partial<Omit<Hotkey, 'key'>> = {}
): HotkeyConfig {
  return { key, handler, ...options };
}