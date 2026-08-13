'use client';

import { useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import StaggeredMenu from '../../components/StaggeredMenu';
import StrokeText from '../../components/StrokeText';
import { Lock, Zap, Clock, TrendingUp, Repeat, BarChart3, ShieldCheck, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const scoringFactors = [
  {
    icon: Clock,
    label: 'Account Age',
    weight: 'up to 150 pts',
    desc: 'Rewards long-standing accounts — 100 points per year open.',
  },
  {
    icon: TrendingUp,
    label: 'Monthly Volume',
    weight: 'up to 200 pts',
    desc: 'Logarithmically scaled so consistent activity is rewarded without letting raw whale size dominate the score.',
  },
  {
    icon: BarChart3,
    label: 'Active Months',
    weight: 'up to 150 pts',
    desc: 'Confirms the account is actually used, not just old — 100 points per 12 active months.',
  },
  {
    icon: Repeat,
    label: 'Transaction Consistency',
    weight: 'up to 50 pts',
    desc: 'Rewards real, repeated transfers over a single large deposit — 50 points per 100 transactions.',
  },
];

const flowSteps = [
  { title: 'Select account', desc: "You select an account to analyze — a live bank/exchange connection in production, a mock data source in this demo." },
  { title: 'TEE computes the score', desc: 'The enclave processes the account data and computes a credit score — the raw data never leaves it.' },
  { title: 'Signed & verified on-chain', desc: 'The TEE signs the score, and the signature is verified on-chain via ECDSA.' },
  { title: 'Terms update instantly', desc: 'The lending pool reads the verified score and lowers your collateral ratio live.' },
];

export default function AboutPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const addr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Scroll Reveal IntersectionObserver Fallback for browsers without native scroll-timeline
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof CSS !== 'undefined') {
      if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('scroll-reveal-visible');
              entry.target.classList.remove('scroll-reveal-hidden');
            }
          }
        }, { threshold: 0.15 });

        document.querySelectorAll('.scroll-reveal').forEach((el) => {
          observer.observe(el);
        });

        return () => observer.disconnect();
      }
    }
  }, []);

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
        colors={['#FF2E93', '#F97316']}
        logoUrl=""
        logoNode={
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div className="logo" style={{ cursor: 'pointer' }}>
              <div className="logo-icon">C</div>
              <div className="logo-text">CredLine</div>
            </div>
          </Link>
        }
        accentColor="#FF2E93"
        customContent={
          mounted && isConnected && address ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="wallet-chip" style={{ background: 'rgba(0, 0, 0, 0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }}>
                <span className="wallet-dot" />
                {addr}
              </button>
              <button className="wallet-chip" onClick={() => disconnect()} style={{ background: 'rgba(0, 0, 0, 0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }}>
                Disconnect
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
            The bridge between your real-world financial activity and trustless, capital-efficient DeFi borrowing.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginBottom: '4rem' }}>

          <div className="card" style={{ padding: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 46, 147, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: '2rem', border: '1px solid rgba(255, 46, 147, 0.2)' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: 'white', letterSpacing: '-0.02em' }}>Privacy by Design</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.125rem' }}>
              Your account activity is processed inside a Trusted Execution Environment (TEE) — hardware-isolated so that no one, including us, can read it while it's being scored. The raw data is never stored; only the signed final score leaves the enclave.
            </p>
          </div>

          <div className="card" style={{ padding: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 138, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)', marginBottom: '2rem', border: '1px solid rgba(255, 138, 0, 0.2)' }}>
              <Zap size={28} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: 'white', letterSpacing: '-0.02em' }}>Capital Efficiency</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.125rem' }}>
              Traditional DeFi requires massive overcollateralization (often 150–180%). By generating a verifiable score from your account activity off-chain, CredLine lowers your collateral requirement — freeing your capital for other yield.
            </p>
          </div>

        </section>

        {/* WHAT WE SCORE */}
        <section style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em', color: 'white', textAlign: 'center' }}>
            What the score actually measures
          </h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '560px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
            This is a v1 activity &amp; reputation score — built from account behavior, not a full credit history. It's designed to extend as more verified data sources are added.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {scoringFactors.map((f) => (
              <div key={f.label} style={{ padding: '1.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                <f.icon size={22} color="var(--accent-orange)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{f.label}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{f.weight}</div>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS — SCROLL FLOWCHART */}
        <section style={{
          background: 'linear-gradient(to bottom right, rgba(255,46,147,0.05), rgba(255,138,0,0.05))',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '32px',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          marginBottom: '3rem'
        }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'white' }}>How it actually works</h2>

          <div className="flow-track" style={{ maxWidth: '600px', margin: '0 auto 3rem', textAlign: 'left', position: 'relative' }}>
            <div className="flow-line" />
            <div className="flow-line-fill scroll-reveal" />

            {flowSteps.map((step, i) => (
              <div key={step.title}>
                <div
                  className="flow-step scroll-reveal scroll-reveal-hidden"
                  style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative', paddingBottom: i < flowSteps.length - 1 ? '2.5rem' : 0 }}
                >
                  <div className="flow-node" style={{
                    flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-orange))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: 'white', fontSize: '1.125rem',
                    boxShadow: '0 0 20px rgba(255, 46, 147, 0.3)', zIndex: 1, position: 'relative'
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ paddingTop: '0.5rem' }}>
                    <h4 style={{ color: 'white', fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.35rem' }}>{step.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>

                {i < flowSteps.length - 1 && (
                  <ChevronDown
                    size={18}
                    className="flow-arrow scroll-reveal scroll-reveal-hidden"
                    style={{ color: 'var(--accent-orange)', marginLeft: '13px', marginBottom: '0.5rem' }}
                  />
                )}
              </div>
            ))}
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

        {/* HONEST STATUS NOTE */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '14px', maxWidth: '700px', margin: '0 auto' }}>
          <ShieldCheck size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            This hackathon build demonstrates the full on-chain verification flow — signed score in, ECDSA-verified on-chain, collateral terms updated live. The hardware-isolated TEE deployment (Flare Confidential Compute on GCP Confidential Space) is our documented production next step.
          </p>
        </div>

      </div>
    </>
  );
}