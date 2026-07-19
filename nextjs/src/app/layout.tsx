import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { roboto } from './fonts';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Lock-Mint Bridge',
  description: 'Lock a token on OP Sepolia and mint the equivalent on Base Sepolia.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * next-themes sets the theme class on <html> on the client, so the server render
   * can't match it — an unavoidable, expected mismatch. `suppressHydrationWarning`
   * only silences the warning for this one element (one level deep); it does not
   * disable hydration or hide mismatches in children.
   *
   * @see {@link https://github.com/pacocoursey/next-themes#with-app | next-themes: add suppressHydrationWarning}
   * @see {@link https://react.dev/reference/react-dom/components/common#suppressing-unavoidable-hydration-mismatch-errors | React: suppressing unavoidable hydration mismatch errors}
   */
  return (
    <html lang="en" suppressHydrationWarning className={cn('h-full', 'antialiased', roboto.variable, 'font-sans')}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
