'use client';

import { useAccount, useDisconnect } from 'wagmi';
import StaggeredMenu from '../components/StaggeredMenu';
import StrokeText from '../components/StrokeText';
import { RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const addr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  return (
    <>
      <StaggeredMenu
        isFixed={true}
        position="right"
        items={[
          { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
          { label: 'About', ariaLabel: 'Learn about us', link: '/about' }
        ]}
        displayItemNumbering={true}
        menuButtonColor="#ffffff"
        openMenuButtonColor="#000000"
        changeMenuColorOnOpen={true}
        colors={['#B497CF', '#5227FF']}
        logoUrl=""
        logoNode={
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div className="logo" style={{ cursor: 'pointer' }}>
              <div className="logo-icon">C</div>
              <div className="logo-text">CredLine</div>
            </div>
          </Link>
        }
        accentColor="#5227FF"
        customContent={
          isConnected && address ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="wallet-chip" onClick={() => {
                // Mock reset action
              }} style={{ background: 'rgba(0, 0, 0, 0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }}>
                <RefreshCw size={14} /> Reset Demo
              </button>
              <button className="wallet-chip" onClick={() => disconnect()} style={{ background: 'rgba(0, 0, 0, 0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }}>
                <span className="wallet-dot" />
                {addr}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="page-container scroll-reveal" style={{ paddingTop: '12rem', paddingBottom: '6rem', minHeight: '100vh', maxWidth: '900px', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', color: 'var(--accent)', opacity: 0.8 }}>
            <Search size={64} strokeWidth={1.5} />
          </div>
          
          <h1 style={{ fontSize: 'clamp(4rem, 8vw, 8rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <StrokeText
              text="404"
              strokeColor="#FF2E93"
              fillColor="#FFFFFF"
              strokeWidth={2}
              drawDuration={1.2}
              fillDelay={0.4}
              stagger={0.1}
              ease="power2.out"
              trigger="scroll"
              fillMode="wipe"
              fontSize={120}
              fontWeight={800}
              letterSpacing={-4}
              reverse={false}
              style={{ maxWidth: '1000px', margin: '0 auto' }}
            />
          </h1>
          
          <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            The page you're looking for was not found or has been moved.
          </p>
        </header>

        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{ 
            padding: '1.25rem 3rem', 
            fontSize: '1.125rem', 
            background: 'linear-gradient(135deg, var(--accent), var(--accent-orange))', 
            border: 'none', 
            borderRadius: '16px', 
            color: '#fff', 
            fontWeight: 700, 
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255, 46, 147, 0.4)',
            transition: 'transform 0.2s'
          }}>
            Return Home
          </button>
        </Link>
      </div>
    </>
  );
}
