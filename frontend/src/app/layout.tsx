import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import InitialLoader from '../components/InitialLoader';

export const metadata: Metadata = {
  title: 'CredLine — Privacy-Preserving Credit on Flare',
  description: 'A privacy-preserving credit scoring and lending unlock system built on Flare Confidential Compute (FCC).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <InitialLoader />
        <Providers>
          <div className="app-shell">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
