import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

const storageState: Record<string, string> = {};
const storage: Storage = {
  getItem: (key: string) => (key in storageState ? storageState[key] : null),
  setItem: (key: string, value: string) => {
    storageState[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storageState[key];
  },
  clear: () => {
    Object.keys(storageState).forEach((key) => delete storageState[key]);
  },
  key: (index: number) => Object.keys(storageState)[index] ?? null,
  get length() {
    return Object.keys(storageState).length;
  }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true
});

Object.defineProperty(window, 'localStorage', {
  value: storage,
  configurable: true
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  window.scrollTo = vi.fn();
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();

  const { useAuthStore } = await import('@stores/auth.store');
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    authInitialized: true
  });
});

afterAll(() => {
  server.close();
});
