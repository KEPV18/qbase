import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock localStorage — a real, working store.
//
// The old mock answered every read with null and threw every write away,
// so a test could not exercise anything that keeps state: the value
// stored, the shape of a key, or the fact that a key was written at all.
// Worse, the code under test then took its "storage is unavailable"
// branch — and the test still passed.  A silent no-op hides the very
// thing it is meant to check.
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear: () => { store.clear(); },
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => { store.delete(key); },
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
  };
}
Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', { value: memoryStorage(), configurable: true });

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost', origin: 'http://localhost' },
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = () => {};