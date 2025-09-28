import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import React from 'react';

type MatchMediaResult = {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: () => void;
  removeEventListener: () => void;
  addListener: () => void;
  removeListener: () => void;
  dispatchEvent: () => boolean;
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MatchMediaResult => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

const googleMapsStub = {
  Map: function Map() {},
  event: {
    addListener: () => ({}),
    removeListener: () => {},
  },
};

(globalThis as Record<string, unknown>).google = {
  maps: googleMapsStub,
};

const cookieStore: { value: string } = { value: '' };

Object.defineProperty(document, 'cookie', {
  configurable: true,
  get: jest.fn(() => cookieStore.value),
  set: jest.fn((value: string) => {
    cookieStore.value = value;
  }),
});

jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      const { src, alt, fill, priority, ...rest } = props as { src?: string; alt?: string; fill?: boolean; priority?: boolean } & Record<string, unknown>;
      return React.createElement('img', { src, alt, ...rest });
    },
  };
});

jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode } & Record<string, unknown>>(
      ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
    ),
  };
});

jest.mock('next/font/google', () => {
  return {
    __esModule: true,
    Geist: () => ({ className: 'geist-sans', variable: 'geist-sans' }),
    Geist_Mono: () => ({ className: 'geist-mono', variable: 'geist-mono' }),
  };
});
