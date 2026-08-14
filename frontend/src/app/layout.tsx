import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import InitialLoader from '../components/InitialLoader';
import TargetCursor from '../components/TargetCursor';

export const metadata: Metadata = {
  title: 'CredLine — Privacy-Preserving Credit on Flare',
  description: 'A privacy-preserving credit scoring and lending unlock system built on Flare Confidential Compute (FCC).',
  openGraph: {
    title: 'CredLine — Privacy-Preserving Credit on Flare',
    description: 'A privacy-preserving credit scoring and lending unlock system built on Flare Confidential Compute (FCC).',
    url: 'https://credline.vercel.app',
    siteName: 'CredLine',
    images: [
      {
        url: '/credlogo.jpeg',
        width: 1200,
        height: 630,
        alt: 'CredLine Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CredLine — Privacy-Preserving Credit on Flare',
    description: 'A privacy-preserving credit scoring and lending unlock system built on Flare Confidential Compute (FCC).',
    images: ['/credlogo.jpeg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TargetCursor 
          spinDuration={2}
          hideDefaultCursor
          parallaxOn
          hoverDuration={0.2}
          cursorColor="#ffffff"
          cursorColorOnTarget="#B497CF"
        />
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
