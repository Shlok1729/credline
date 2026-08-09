'use client';

import { useAccount, useDisconnect } from 'wagmi';
import StaggeredMenu from '../../components/StaggeredMenu';
import StrokeText from '../../components/StrokeText';
import { RefreshCw, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
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


      <div className="page-container scroll-reveal" style={{ paddingTop: '10rem', paddingBottom: '6rem', minHeight: '100vh', maxWidth: '900px', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem' }}>

        <header style={{ textAlign: 'center', marginBottom: '6rem' }}>
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Welcome to</span>
            <StrokeText
              text="CredLine."
              strokeColor="#FF2E93"
              fillColor="#FFFFFF"
              strokeWidth={1.5}
              drawDuration={1.6}
              fillDelay={0.2}
              stagger={0.05}
              ease="power2.out"
              trigger="scroll"
              fillMode="wipe"
              fontSize={80}
              fontWeight={800}
              letterSpacing={-2}
              reverse={false}
              style={{ maxWidth: '1000px', margin: '0 auto' }}
            />
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            The bridge between your real-world financial reputation and trustless, capital-efficient DeFi borrowing.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginBottom: '6rem' }}>

          <div className="card" style={{ padding: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 46, 147, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: '2rem', border: '1px solid rgba(255, 46, 147, 0.2)' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: 'white', letterSpacing: '-0.02em' }}>Absolute Privacy</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.125rem' }}>
              We believe your financial data belongs to you. Using Flare Confidential Compute (FCC), your bank statements and income history are processed inside a highly secure Trusted Execution Environment (TEE). We never see your data, and we never store it.
            </p>
          </div>

          <div className="card" style={{ padding: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 138, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)', marginBottom: '2rem', border: '1px solid rgba(255, 138, 0, 0.2)' }}>
              <Zap size={28} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: 'white', letterSpacing: '-0.02em' }}>Capital Efficiency</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.125rem' }}>
              Traditional DeFi requires massive overcollateralization (often 150-180%). By cryptographically proving your real-world financial health off-chain, CredLine drops your collateral requirements dramatically, freeing up your assets for other yields.
            </p>
          </div>

        </section>

        <section style={{
          background: 'linear-gradient(to bottom right, rgba(255,46,147,0.05), rgba(255,138,0,0.05))',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '32px',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'white' }}>How it actually works</h2>
          <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 2, textAlign: 'left' }}>
            <p><strong style={{ color: 'white', marginRight: '0.5rem' }}>1.</strong> You connect your bank or upload statements locally.</p>
            <p><strong style={{ color: 'white', marginRight: '0.5rem' }}>2.</strong> The TEE securely processes the data and generates a <strong style={{ color: 'var(--accent-orange)' }}>credit score</strong>.</p>
            <p><strong style={{ color: 'white', marginRight: '0.5rem' }}>3.</strong> The TEE signs the score and mints an ECDSA-verified attestation on-chain.</p>
            <p><strong style={{ color: 'white', marginRight: '0.5rem' }}>4.</strong> Smart contracts read your attestation and instantly lower your collateral ratio.</p>
          </div>

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
              Try the Demo Now
            </button>
          </Link>
        </section>

      </div>
    </>
  );
}
