'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Shield, Lock, Activity, Wallet, RefreshCw, Zap } from 'lucide-react';
import { CredRegistryABI, LendingPoolLiteABI } from './contracts';

// Deployed Addresses on Coston2
const CRED_REGISTRY = '0x2480c000Dd95de1A1A78E3Bc7f527CEb92B9BE45' as const;
const LENDING_POOL = '0x1b4E7645240aD2230fa8474d2C1CF6f321452D8D' as const;

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
  const [scoreStatus, setScoreStatus] = useState<'idle' | 'computing' | 'minting'>('idle');
  const [collateral, setCollateral] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');

  // Wagmi Hooks for On-Chain Data
  const { data: positionData, refetch: refetchPosition } = useReadContract({
    address: LENDING_POOL,
    abi: LendingPoolLiteABI,
    functionName: 'getPosition',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 }
  });

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const userCollateral = positionData?.[0] ? formatEther(positionData[0]) : '0';
  const userBorrowed = positionData?.[1] ? formatEther(positionData[1]) : '0';
  const maxBorrow = positionData?.[2] ? formatEther(positionData[2]) : '0';
  const onChainScore = positionData?.[3] ?? 0;
  const onChainTier = positionData?.[4] ?? 'None (Standard)';

  // Reset status if score appears on-chain
  useEffect(() => {
    if (onChainScore > 0 && scoreStatus !== 'idle') {
      setScoreStatus('idle');
    }
  }, [onChainScore, scoreStatus]);

  /* ── Transactions ─────────────────────────────── */
  const handleComputeScore = () => {
    setScoreStatus('computing');
    // Simulate TEE delay before triggering the on-chain minting
    setTimeout(() => {
      setScoreStatus('minting');
      
      const p = selectedProfile;
      let val = 550; // Standard
      if (p.accountAgeDays > 1000)        val = 820; // Excellent
      else if (p.accountAgeDays > 500)    val = 710; // Good
      else if (p.monthlyVolumeUsd > 10000) val = 680; // Fair

      // The frontend wallet acts as the TEE Signer for this demo
      writeContract({
        address: CRED_REGISTRY,
        abi: CredRegistryABI,
        functionName: 'mintCredential',
        args: [address as `0x${string}`, val],
      });
    }, 2000);
  };

  const handleDeposit = () => {
    if (!collateral) return;
    writeContract({
      address: LENDING_POOL,
      abi: LendingPoolLiteABI,
      functionName: 'deposit',
      value: parseEther(collateral),
    });
    setCollateral('');
  };

  const handleBorrow = () => {
    if (!borrowAmount) return;
    writeContract({
      address: LENDING_POOL,
      abi: LendingPoolLiteABI,
      functionName: 'borrow',
      args: [parseEther(borrowAmount)],
    });
    setBorrowAmount('');
  };

  const tierClass = (t: string) =>
    t === 'Excellent' ? 'excellent' : t === 'Good' ? 'good' : 'standard';

  const currentStep = !isConnected ? 1 : (onChainScore > 0 ? 4 : (scoreStatus !== 'idle' ? 3 : 2));
  const addr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

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
        <section className="hero">
          <div className="hero-badge">
            <Zap size={12} /> Coston2 Testnet Live
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
          <div className="connect-card">
            <div className="connect-icon">
              <Wallet size={32} />
            </div>
            <h2>Connect Wallet</h2>
            <p>Link your MetaMask to Coston2 testnet to begin.</p>
            <button
              className="btn btn-primary full-width"
              onClick={() => connect({ connector: connectors[0] })}
            >
              <Wallet size={18} /> Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            {/* ── Step Progress Bar ──────────────── */}
            <div className="steps-bar">
              <div className={`step-item ${currentStep > 1 ? 'done' : 'active'}`}>
                <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
                <span className="step-text">Connect</span>
              </div>
              <div className={`step-line ${currentStep > 1 ? 'done' : ''}`} />
              <div className={`step-item ${currentStep > 2 ? 'done' : (currentStep === 2 ? 'active' : '')}`}>
                <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
                <span className="step-text">TEE Compute</span>
              </div>
              <div className={`step-line ${currentStep > 2 ? 'done' : ''}`} />
              <div className={`step-item ${currentStep > 3 ? 'done' : (currentStep === 3 ? 'active' : '')}`}>
                <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
                <span className="step-text">Mint Credential</span>
              </div>
              <div className={`step-line ${currentStep > 3 ? 'done' : ''}`} />
              <div className={`step-item ${currentStep === 4 ? 'active' : ''}`}>
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
                </div>
                <div className="card-body">
                  {onChainScore === 0 ? (
                    <>
                      <div className="select-group">
                        <label className="select-label">Mock History Profile</label>
                        <select
                          className="select-field"
                          value={selectedProfile.label}
                          onChange={(e) => {
                            const p = mockProfiles.find(x => x.label === e.target.value);
                            if (p) setSelectedProfile(p);
                          }}
                          disabled={scoreStatus !== 'idle'}
                        >
                          {mockProfiles.map(p => (
                            <option key={p.label} value={p.label}>{p.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="private-panel">
                        <div className="private-label">
                          <Lock size={10} /> Private inputs
                        </div>
                        <div className="private-grid">
                          <div className="private-item">
                            <div className="private-item-label">Account Age</div>
                            <div className="private-item-value">{selectedProfile.accountAgeDays} days</div>
                          </div>
                          <div className="private-item">
                            <div className="private-item-label">Tx Count</div>
                            <div className="private-item-value">{selectedProfile.totalTransactions}</div>
                          </div>
                          <div className="private-item">
                            <div className="private-item-label">Monthly Vol</div>
                            <div className="private-item-value">${selectedProfile.monthlyVolumeUsd}</div>
                          </div>
                        </div>
                      </div>

                      {scoreStatus === 'idle' && (
                        <button className="btn btn-primary full-width" onClick={handleComputeScore}>
                          <Lock size={16} /> Compute Score in TEE
                        </button>
                      )}

                      {scoreStatus === 'computing' && (
                        <div className="tee-status computing">
                          <div className="tee-icon spin"><RefreshCw size={28} color="var(--accent)" /></div>
                          <div className="tee-title">TEE Enclave Processing…</div>
                        </div>
                      )}

                      {scoreStatus === 'minting' && (
                        <div className="tee-status minting">
                          <div className="tee-icon pulse"><Activity size={28} color="var(--warning)" /></div>
                          <div className="tee-title">Sign Transaction</div>
                          <div className="tee-subtitle">Please approve the wallet popup to mint the score on-chain.</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="score-result">
                      <div className="score-number">{onChainScore}</div>
                      <div className={`score-tier ${tierClass(onChainTier)}`}>{onChainTier} Tier</div>
                      <div className="score-badge">
                        <span className="score-badge-dot" />
                        Verified On-Chain
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
                  <div className="terms-panel">
                    <div className="terms-header">Your Live On-Chain Terms</div>
                    <div className="terms-row">
                      <span className="terms-label">Score Tier</span>
                      <span className={`terms-value ${onChainScore > 0 ? 'improved' : ''}`}>{onChainTier}</span>
                    </div>
                    <div className="terms-row">
                      <span className="terms-label">Required Collateral</span>
                      <span className={`terms-value ${onChainTier === 'Excellent' || onChainTier === 'Good' ? 'improved' : ''}`}>
                        {onChainTier === 'Excellent' ? '120%' : onChainTier === 'Good' ? '140%' : '180%'}
                      </span>
                    </div>
                    <div className="terms-row" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                        <span className="terms-label">Deposited</span>
                        <span className="terms-value">{Number(userCollateral).toFixed(2)} C2FLR</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span className="terms-label">Borrowed</span>
                        <span className="terms-value">{Number(userBorrowed).toFixed(2)} FXRP</span>
                      </div>
                    </div>
                  </div>

                  {isTxConfirming && (
                    <div className="tee-status computing" style={{ marginBottom: '1rem', padding: '1rem' }}>
                      Waiting for blockchain confirmation...
                    </div>
                  )}

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
                      <button className="btn btn-secondary btn-sm" onClick={handleDeposit}>Deposit</button>
                    </div>
                  </div>

                  <div className="input-group mb-0">
                    <div className="input-label">
                      <span className="input-label-text">Borrow (FXRP)</span>
                      <span className="input-label-hint">Max: {Number(maxBorrow).toFixed(2)}</span>
                    </div>
                    <div className="input-row">
                      <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={borrowAmount}
                        onChange={e => setBorrowAmount(e.target.value)}
                      />
                      <button className="btn btn-orange btn-sm" onClick={handleBorrow}>Borrow</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="footer">
        <p className="footer-text">Built for the Flare Summer Signal Hackathon</p>
      </footer>
    </>
  );
}
