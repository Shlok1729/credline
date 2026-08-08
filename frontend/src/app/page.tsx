'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import {
  Shield, Lock, Activity, Wallet, RefreshCw, CheckCircle, Zap
} from 'lucide-react';

/* ── Mock profiles ──────────────────────────────── */
const mockProfiles = [
  { label: 'Alice — Long-time active user', accountAgeDays: 1095, totalTransactions: 847, monthlyVolumeUsd: 12500, activeMonths: 30 },
  { label: 'Bob — Moderate user',           accountAgeDays: 548,  totalTransactions: 234, monthlyVolumeUsd: 3200,  activeMonths: 14 },
  { label: 'Charlie — New user',            accountAgeDays: 90,   totalTransactions: 23,  monthlyVolumeUsd: 500,   activeMonths: 3  },
  { label: 'Diana — High volume but new',   accountAgeDays: 180,  totalTransactions: 156, monthlyVolumeUsd: 45000, activeMonths: 5  },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [selectedProfile, setSelectedProfile] = useState(mockProfiles[0]);
  const [scoreStatus, setScoreStatus] = useState<'idle' | 'computing' | 'minting' | 'done'>('idle');
  const [score, setScore] = useState<{ tier: string; value: number } | null>(null);
  const [collateral, setCollateral] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');

  /* ── Score simulation ─────────────────────────── */
  const handleComputeScore = () => {
    setScoreStatus('computing');
    setTimeout(() => {
      setScoreStatus('minting');
      setTimeout(() => {
        const p = selectedProfile;
        let val = 550, tier = 'Standard';
        if (p.accountAgeDays > 1000)        { val = 820; tier = 'Excellent'; }
        else if (p.accountAgeDays > 500)    { val = 710; tier = 'Good'; }
        else if (p.monthlyVolumeUsd > 10000){ val = 680; tier = 'Fair'; }
        setScore({ value: val, tier });
        setScoreStatus('done');
      }, 3000);
    }, 4000);
  };

  const tierClass = (t: string) =>
    t === 'Excellent' ? 'excellent' : t === 'Good' ? 'good' : 'standard';

  const currentStep = scoreStatus === 'idle' ? 1
    : scoreStatus === 'computing' ? 2
    : scoreStatus === 'minting' ? 3
    : 4;

  const addr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  /* ─────────────────────────────────────────────── */
  return (
    <>
      {/* ── Navbar ──────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="logo">
            <div className="logo-icon">C</div>
            <span className="logo-text">CredLine</span>
          </div>
          {isConnected && (
            <button className="wallet-chip" onClick={() => disconnect()}>
              <span className="wallet-dot" />
              {addr}
            </button>
          )}
        </div>
      </nav>

      {/* ── Page ────────────────────────────────── */}
      <div className="page-container">

        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">
            <Zap size={12} /> Flare Confidential Compute
          </div>
          <h1>
            Privacy-Preserving<br />
            <span className="gradient-text">Credit &amp; Lending</span>
          </h1>
          <p className="hero-subtitle">
            Your on-chain history is scored privately inside a Trusted Execution
            Environment. Only the resulting credential is written on-chain — unlocking
            better DeFi borrowing terms.
          </p>
        </section>

        {!isConnected ? (
          /* ── Connect Wallet ─────────────────────── */
          <div className="connect-card">
            <div className="connect-icon">
              <Wallet size={32} />
            </div>
            <h2>Connect Wallet</h2>
            <p>Link your MetaMask to Coston2 testnet to begin the privacy-preserving scoring flow.</p>
            <button
              className="btn btn-primary full-width"
              onClick={() => connect({ connector: connectors[0] })}
            >
              <Wallet size={18} />
              Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            {/* ── Step Progress Bar ──────────────── */}
            <div className="steps-bar">
              <div className={`step-item ${currentStep >= 1 ? (currentStep > 1 ? 'done' : 'active') : ''}`}>
                <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
                <span className="step-text">Connect</span>
              </div>
              <div className={`step-line ${currentStep > 1 ? 'done' : ''}`} />
              <div className={`step-item ${currentStep >= 2 ? (currentStep > 2 ? 'done' : 'active') : ''}`}>
                <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
                <span className="step-text">TEE Compute</span>
              </div>
              <div className={`step-line ${currentStep > 2 ? 'done' : ''}`} />
              <div className={`step-item ${currentStep >= 3 ? (currentStep > 3 ? 'done' : 'active') : ''}`}>
                <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
                <span className="step-text">Mint Credential</span>
              </div>
              <div className={`step-line ${currentStep > 3 ? 'done' : ''}`} />
              <div className={`step-item ${currentStep >= 4 ? 'active' : ''}`}>
                <div className="step-number">4</div>
                <span className="step-text">Borrow</span>
              </div>
            </div>

            {/* ── Two-Column Dashboard ──────────── */}
            <div className="dashboard-grid">
              {/* LEFT: Identity & Score */}
              <div className="card">
                <div className="card-header">
                  <div className="card-header-left">
                    <div className="card-header-icon pink">
                      <Shield size={16} />
                    </div>
                    <span className="card-title">Identity &amp; Score</span>
                  </div>
                  <button className="btn-ghost" onClick={() => disconnect()}>Disconnect</button>
                </div>
                <div className="card-body">
                  {/* Profile picker */}
                  <div className="select-group">
                    <label className="select-label">Mock History Profile</label>
                    <select
                      className="select-field"
                      value={selectedProfile.label}
                      onChange={(e) => {
                        const p = mockProfiles.find(x => x.label === e.target.value);
                        if (p) setSelectedProfile(p);
                        setScoreStatus('idle');
                        setScore(null);
                      }}
                      disabled={scoreStatus !== 'idle'}
                    >
                      {mockProfiles.map(p => (
                        <option key={p.label} value={p.label}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Private data */}
                  <div className="private-panel">
                    <div className="private-label">
                      <Lock size={10} /> Private inputs — never touch the chain
                    </div>
                    <div className="private-grid">
                      <div className="private-item">
                        <div className="private-item-label">Account Age</div>
                        <div className="private-item-value">{selectedProfile.accountAgeDays} days</div>
                      </div>
                      <div className="private-item">
                        <div className="private-item-label">Tx Count</div>
                        <div className="private-item-value">{selectedProfile.totalTransactions.toLocaleString()}</div>
                      </div>
                      <div className="private-item">
                        <div className="private-item-label">Monthly Vol</div>
                        <div className="private-item-value">${selectedProfile.monthlyVolumeUsd.toLocaleString()}</div>
                      </div>
                      <div className="private-item">
                        <div className="private-item-label">Active Months</div>
                        <div className="private-item-value">{selectedProfile.activeMonths}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action / status */}
                  {scoreStatus === 'idle' && (
                    <button className="btn btn-primary full-width" onClick={handleComputeScore}>
                      <Lock size={16} /> Compute Score in TEE
                    </button>
                  )}

                  {scoreStatus === 'computing' && (
                    <div className="tee-status computing">
                      <div className="tee-icon spin"><RefreshCw size={28} color="var(--accent)" /></div>
                      <div className="tee-title">TEE Enclave Processing…</div>
                      <div className="tee-subtitle">Analyzing data privately. Raw inputs will be destroyed.</div>
                    </div>
                  )}

                  {scoreStatus === 'minting' && (
                    <div className="tee-status minting">
                      <div className="tee-icon pulse"><Activity size={28} color="var(--warning)" /></div>
                      <div className="tee-title">Minting On-Chain Credential…</div>
                      <div className="tee-subtitle">Signing result and broadcasting to Coston2.</div>
                    </div>
                  )}

                  {scoreStatus === 'done' && score && (
                    <div className="score-result">
                      <div className="score-number">{score.value}</div>
                      <div className={`score-tier ${tierClass(score.tier)}`}>{score.tier} Tier</div>
                      <div className="score-badge">
                        <span className="score-badge-dot" />
                        Verified by Flare TEE
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Lending Pool */}
              <div className="card">
                <div className="card-header">
                  <div className="card-header-left">
                    <div className="card-header-icon orange">
                      <Activity size={16} />
                    </div>
                    <span className="card-title">Borrowing Dashboard</span>
                  </div>
                </div>
                <div className="card-body">
                  {/* Terms */}
                  <div className="terms-panel">
                    <div className="terms-header">Your Lending Terms</div>
                    <div className="terms-row">
                      <span className="terms-label">Score Tier</span>
                      <span className={`terms-value ${score ? 'improved' : ''}`}>
                        {score ? score.tier : 'None (Standard)'}
                      </span>
                    </div>
                    <div className="terms-row">
                      <span className="terms-label">Required Collateral</span>
                      <span className={`terms-value ${score?.tier === 'Excellent' || score?.tier === 'Good' ? 'improved' : ''}`}>
                        {score?.tier === 'Excellent' ? '120%' : score?.tier === 'Good' ? '140%' : '180%'}
                      </span>
                    </div>
                    <div className="terms-row">
                      <span className="terms-label">Borrow Multiplier</span>
                      <span className={`terms-value ${score?.tier === 'Excellent' || score?.tier === 'Good' ? 'improved' : ''}`}>
                        {score?.tier === 'Excellent' ? '2.0×' : score?.tier === 'Good' ? '1.5×' : '1.0×'}
                      </span>
                    </div>
                  </div>

                  {/* Deposit */}
                  <div className="input-group">
                    <div className="input-label">
                      <span className="input-label-text">Deposit Collateral (C2FLR)</span>
                    </div>
                    <div className="input-row">
                      <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={collateral}
                        onChange={e => setCollateral(e.target.value)}
                      />
                      <button className="btn btn-secondary btn-sm">Deposit</button>
                    </div>
                  </div>

                  {/* Borrow */}
                  <div className="input-group mb-0">
                    <div className="input-label">
                      <span className="input-label-text">Borrow (FXRP)</span>
                      <span className="input-label-hint">Max: —</span>
                    </div>
                    <div className="input-row">
                      <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={borrowAmount}
                        onChange={e => setBorrowAmount(e.target.value)}
                      />
                      <button className="btn btn-orange btn-sm">Borrow</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="footer">
        <p className="footer-text">
          Built for the Flare Summer Signal Hackathon · Powered by{' '}
          <span className="footer-brand">Flare Confidential Compute</span>
        </p>
      </footer>
    </>
  );
}
