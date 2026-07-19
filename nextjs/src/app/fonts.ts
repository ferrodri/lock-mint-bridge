import { Roboto } from 'next/font/google';

export const roboto = Roboto({
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  fallback: [
    'ui-sans-serif',
    'system-ui',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji'
  ],
  subsets: ['latin'],
  display: 'swap'
});
