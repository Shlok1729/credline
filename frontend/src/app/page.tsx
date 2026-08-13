'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Shield, Lock, Activity, Wallet, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { TEE_SIGNER_ADDRESS, CRED_REGISTRY_ADDRESS, LENDING_POOL_ADDRESS, WNAT_ADDRESS, CredRegistryABI, LendingPoolLiteABI } from './contracts';
import AdminRefillButton from '../components/AdminRefillButton';
import StrokeText from '../components/StrokeText';

import StaggeredMenu from '../components/StaggeredMenu';

// Deployed Addresses on Coston2
const CRED_REGISTRY = '0x76d2788D3915B48d4F066a2902e29ECCAfac19dC' as const;
const LENDING_POOL = '0x8Ab1Ab0D45F2139CBFd3390A60D484629Bb857dd' as const;

/* ── Data Source Profiles ──────────────────────────────── */
const dataSourceProfiles = [
  { label: 'Chase Bank — Primary Checking (...4921)', accountAgeDays: 1095, totalTransactions: 847, monthlyVolumeUsd: 12500, activeMonths: 30 },
  { label: 'Wells Fargo — Business Acct (...8832)', accountAgeDays: 548, totalTransactions: 234, monthlyVolumeUsd: 3200, activeMonths: 14 },
  { label: 'Bank of America — Savings (...1109)', accountAgeDays: 90, totalTransactions: 23, monthlyVolumeUsd: 500, activeMonths: 3 },
  { label: 'Coinbase — Crypto Exchange (...77A1)', accountAgeDays: 180, totalTransactions: 156, monthlyVolumeUsd: 45000, activeMonths: 5 },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [selectedProfile, setSelectedProfile] = useState(dataSourceProfiles[0]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [scoreStatus, setScoreStatus] = useState<'idle' | 'computing' | 'minting'>('idle');
  const [collateral, setCollateral] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [showSuccessGlow, setShowSuccessGlow] = useState(false);

  // Wagmi Hooks for On-Chain Data
  const { data: positionData, refetch: refetchPosition } = useReadContract({
    address: LENDING_POOL,
    abi: LendingPoolLiteABI,
    functionName: 'getPosition',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 }
  });

  const { writeContract, data: txHash, isPending: isTxPending, error: txError, isError: isTxError } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess, error: confirmError, isError: isConfirmError } = useWaitForTransactionReceipt({ hash: txHash });

  const userCollateral = positionData?.[0] ? formatEther(positionData[0]) : '0';
  const userBorrowed = positionData?.[1] ? formatEther(positionData[1]) : '0';
  const maxBorrow = positionData?.[2] ? formatEther(positionData[2]) : '0';
  const onChainScore = positionData?.[3] ?? 0;
  const onChainTier = positionData?.[4] ?? 'Standard';

  // Reset status if score appears on-chain
  useEffect(() => {
    if (onChainScore > 0 && scoreStatus !== 'idle') {
      setScoreStatus('idle');
      // Trigger success glow animation
      setShowSuccessGlow(true);
      setTimeout(() => setShowSuccessGlow(false), 2000); // Remove class after 2 seconds
    }
  }, [onChainScore, scoreStatus]);

  // Reset status if transaction fails
  useEffect(() => {
    if ((isTxError || isConfirmError) && scoreStatus !== 'idle') {
      setScoreStatus('idle');
    }
  }, [isTxError, isConfirmError, scoreStatus]);

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

  /* ── Transactions ─────────────────────────────── */
  const handleComputeScore = async () => {
    if (isTxPending || isTxConfirming || !address) return;
    setScoreStatus('computing');

    try {
      // 1. Send raw data to Next.js API Route which acts as our TEE proxy
      const res = await fetch('/api/tee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          accountAgeDays: selectedProfile.accountAgeDays,
          totalTransactions: selectedProfile.totalTransactions,
          monthlyVolumeUsd: selectedProfile.monthlyVolumeUsd,
          activeMonths: selectedProfile.activeMonths
        })
      });

      if (!res.ok) {
        throw new Error("Failed to reach API route.");
      }
      const teeResponse = await res.json();

      // Extract data and signature from the proxy's response
      const resultData = teeResponse.data || teeResponse.result?.data || teeResponse.resultData;
      const signature = teeResponse.signature || teeResponse.result?.signature;

      if (!resultData || !signature) {
        throw new Error("Invalid response from TEE Enclave: missing data or signature");
      }

      // Decode the score from the original JSON payload returned inside resultData
      const decodedJsonString = Buffer.from(resultData.replace('0x', ''), 'hex').toString('utf8');
      const parsedData = JSON.parse(decodedJsonString);

      setScoreStatus('minting');

      // 2. Submit the TEE-signed result to the blockchain
      writeContract({
        address: CRED_REGISTRY,
        abi: CredRegistryABI,
        functionName: 'mintCredentialWithSignature',
        args: [
          resultData as `0x${string}`,
          signature as `0x${string}`,
          address as `0x${string}`,
          parsedData.score
        ],
      });
    } catch (err: any) {
      console.error(err);
      alert(`TEE Compute Error: ${err.message}`);
      setScoreStatus('idle');
    }
  };

  const handleDeposit = () => {
    if (!collateral || Number(collateral) <= 0 || isTxPending || isTxConfirming) return;
    writeContract({
      address: LENDING_POOL,
      abi: LendingPoolLiteABI,
      functionName: 'deposit',
      value: parseEther(collateral),
    });
    setCollateral('');
  };

  const handleBorrow = () => {
    if (!borrowAmount || Number(borrowAmount) <= 0 || isTxPending || isTxConfirming) return;
    if (Number(borrowAmount) > Number(maxBorrow)) {
      alert(`Cannot borrow more than your max limit of ${Number(maxBorrow).toFixed(2)} WNat`);
      return;
    }
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

  const currentStep = (!mounted || !isConnected) ? 1 : (onChainScore > 0 ? 4 : (scoreStatus !== 'idle' ? 3 : 2));
  const addr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  return (
    <>
      {/* ── Fixed UI Elements ─────────────────── */}
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
              <button className="wallet-chip" onClick={() => {
                setScoreStatus('idle');
                setCollateral('');
                setBorrowAmount('');
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

      {/* ── Page ────────────────────────────────── */}
      <div className="page-container" style={{ paddingTop: '5rem' }}>

        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-badge">
            <Zap size={14} /> Coston2 Testnet Live
          </div>
          <h1 style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <StrokeText
              text="Turn 180% collateral into 120%"
              strokeColor="#FF2E93"
              fillColor="#FFFFFF"
              strokeWidth={1.5}
              drawDuration={1.6}
              fillDelay={0.2}
              stagger={0.05}
              ease="power2.out"
              trigger="scroll"
              fillMode="wipe"
              fontSize={64}
              fontWeight={800}
              letterSpacing={-2}
              reverse={false}
              style={{ maxWidth: '1000px', margin: '0 auto' }}
            />
            <span className="gradient-text" style={{
              fontSize: '2.25rem',
              fontWeight: 600,
              marginTop: '1rem',
              letterSpacing: '-0.02em',
              textShadow: '0 0 30px rgba(255, 46, 147, 0.4)',
              lineHeight: 1.2
            }}>
              — without showing anyone your bank statement.
            </span>
          </h1>
          <p className="hero-subtitle">
            Powered by Flare Confidential Compute. Your private financial history is scored inside a secure Trusted Execution
            Environment. Only the final score is verified on-chain, unlocking capital-efficient DeFi borrowing.
          </p>

          {(!mounted || !isConnected) && (
            <div className="mt-2" style={{ marginTop: '2.5rem' }}>
              <button
                className="btn btn-primary cursor-target"
                style={{ padding: '1.25rem 2.5rem', fontSize: '1.125rem' }}
                onClick={() => connect({ connector: connectors[0] })}
              >
                <Wallet size={20} /> Connect Wallet to Begin
              </button>
            </div>
          )}

          {(mounted && isConnected) && (
            <div className="mt-2" style={{ marginTop: '2.5rem', opacity: 0.6 }}>
              <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scroll to continue</div>
              <div style={{ width: '2px', height: '40px', background: 'linear-gradient(to bottom, var(--accent), transparent)', margin: '0 auto' }}></div>
            </div>
          )}
        </section>



        {(mounted && isConnected) && (
          <>
            {/* PROGRESS BAR SECTION */}
            <section className="section-spacing scroll-reveal scroll-reveal-hidden">
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
            </section>

            {/* MAIN DASHBOARD (Grid) */}
            <AdminRefillButton />
            <section className="section-spacing scroll-reveal scroll-reveal-hidden">
              <div className="dashboard-grid">
                {/* IDENTITY & SCORE CARD */}
                <div className={`card ${showSuccessGlow ? 'success-burst' : ''}`}>
                  <div className="card-header">
                    <div className="card-header-left">
                      <div className="card-header-icon pink">
                        <Shield size={18} />
                      </div>
                      <span className="card-title">Identity &amp; Score Generation</span>
                    </div>
                  </div>
                  <div className="card-body">
                    {onChainScore === 0 ? (
                      <>
                        <div className="select-group">
                          <label className="select-label">Select Mock Data Source to Analyze</label>
                          <select
                            className="select-field"
                            value={selectedProfile.label}
                            onChange={(e) => {
                              const p = dataSourceProfiles.find(x => x.label === e.target.value);
                              if (p) setSelectedProfile(p);
                            }}
                            disabled={scoreStatus !== 'idle'}
                          >
                            {dataSourceProfiles.map(p => (
                              <option key={p.label} value={p.label}>{p.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="private-panel">
                          <div className="private-label">
                            <Lock size={12} /> Data to send securely to TEE
                          </div>
                          <div className="private-grid">
                            <div className="private-item">
                              <div className="private-item-label">Account Age</div>
                              <div className="private-item-value">{selectedProfile.accountAgeDays} <span style={{ fontSize: '0.6em', opacity: 0.5 }}>days</span></div>
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
                          <button className="btn btn-primary full-width cursor-target" onClick={handleComputeScore}>
                            <Lock size={18} /> Generate Score in Secure Enclave
                          </button>
                        )}

                        {scoreStatus === 'computing' && (
                          <div className="tee-status computing">
                            <div className="tee-icon spin"><RefreshCw size={32} color="var(--accent)" /></div>
                            <div className="tee-title">TEE Enclave Processing…</div>
                            <div className="tee-subtitle">Simulating off-chain secure computation</div>
                          </div>
                        )}

                        {scoreStatus === 'minting' && (
                          <div className="tee-status minting">
                            <div className="tee-icon pulse"><Activity size={32} color="var(--warning)" /></div>
                            <div className="tee-title">Sign Transaction</div>
                            <div className="tee-subtitle">Please approve the wallet popup to verify the TEE signature on-chain.</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="score-result">
                        <div className="score-number">{onChainScore}</div>
                        <div className={`score-tier ${tierClass(onChainTier)}`}>{onChainTier} Tier</div>
                        <div className="score-badge">
                          <span className="score-badge-dot" />
                          Verified On-Chain via TEE
                        </div>
                        <div style={{ marginTop: '1.25rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'inline-block' }}>
                          Profile: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedProfile.label}</strong>
                        </div>
                        {txHash && isTxSuccess && (
                          <a
                            href={`https://coston2-explorer.flare.network/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="explorer-link"
                          >
                            View on Coston2 Explorer <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* LENDING POOL CARD */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-header-left">
                      <div className="card-header-icon orange">
                        <Activity size={18} />
                      </div>
                      <span className="card-title">DeFi Lending Pool</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="terms-panel">
                      <div className="terms-header">Your Live Borrowing Terms</div>
                      <div className="terms-row">
                        <span className="terms-label">Credit Score Tier</span>
                        <span
                          className={`terms-value ${onChainScore > 0 ? 'improved' : ''}`}
                          style={{
                            color: onChainTier === 'Excellent' ? '#FF2E93' : onChainTier === 'Good' ? '#F59E0B' : '#9CA3AF',
                            textShadow: onChainTier === 'Excellent' ? '0 0 10px rgba(255,46,147,0.4)' : onChainTier === 'Good' ? '0 0 10px rgba(245,158,11,0.4)' : 'none'
                          }}
                        >
                          {onChainTier}
                        </span>
                      </div>
                      <div className="terms-row">
                        <span className="terms-label">Required Collateral</span>
                        <span className={`terms-value ${onChainTier === 'Excellent' || onChainTier === 'Good' ? 'improved' : ''}`}>
                          {onChainScore > 0 && (onChainTier === 'Excellent' || onChainTier === 'Good') && (
                            <span className="old-collateral">180%</span>
                          )}
                          {onChainScore > 0 ? (
                            <span className="collateral-drop-anim">
                              {onChainTier === 'Excellent' ? '120%' : onChainTier === 'Good' ? '140%' : '180%'}
                            </span>
                          ) : (
                            <span>180%</span>
                          )}
                        </span>
                      </div>

                      {/* Position Summary */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {(() => {
                          const borrowedNum = Number(userBorrowed);
                          const maxNum = Number(maxBorrow);
                          const usagePercent = maxNum > 0 ? (borrowedNum / maxNum) * 100 : 0;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span className="terms-label" style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Borrow Limit</span>
                                <span className="terms-value" style={{ color: 'white', fontSize: '0.8125rem' }}>
                                  {borrowedNum.toFixed(2)} <span style={{ opacity: 0.5 }}>/ {maxNum.toFixed(2)} WNat</span>
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(usagePercent, 100)}%`,
                                  background: usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#F59E0B' : '#FF2E93',
                                  transition: 'width 0.5s ease-out, background 0.3s ease'
                                }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '0.25rem' }}>
                                <span className="terms-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deposited</span>
                                <span className="terms-value" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{Number(userCollateral).toFixed(2)} C2FLR</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {isTxConfirming && (
                      <div className="tee-status computing" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                        Waiting for blockchain confirmation...
                      </div>
                    )}

                    {(isTxError || isConfirmError) && (
                      <div className="tee-status error" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Transaction Failed</div>
                        <div style={{ opacity: 0.8 }}>{(txError?.message || confirmError?.message || "An unknown error occurred").split('\n')[0]}</div>
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
                          min="0"
                          onChange={e => {
                            if (!e.target.value.includes('-')) {
                              setCollateral(e.target.value);
                            }
                          }}
                          disabled={isTxPending || isTxConfirming}
                        />
                        <button
                          className="btn btn-secondary cursor-target"
                          onClick={handleDeposit}
                          disabled={isTxPending || isTxConfirming || !collateral || Number(collateral) <= 0}
                        >
                          {(isTxPending || isTxConfirming) ? <RefreshCw size={18} className="spin" /> : 'Deposit'}
                        </button>
                      </div>
                    </div>

                    <div className="input-group mb-0">
                      <div className="input-label">
                        <span className="input-label-text">Borrow (WNat)</span>
                        <span
                          className="input-label-hint"
                          style={{ cursor: 'pointer', color: 'var(--accent-orange)' }}
                          onClick={() => setBorrowAmount(Number(maxBorrow).toFixed(2))}
                        >
                          Max Limit: {Number(maxBorrow).toFixed(2)}
                        </span>
                      </div>
                      <div className="input-row">
                        <input
                          type="number"
                          className="input-field"
                          placeholder="0.00"
                          value={borrowAmount}
                          min="0"
                          onChange={e => {
                            if (!e.target.value.includes('-')) {
                              setBorrowAmount(e.target.value);
                            }
                          }}
                          disabled={isTxPending || isTxConfirming || Number(maxBorrow) < 0.01}
                        />
                        <button
                          className="btn btn-orange cursor-target"
                          onClick={handleBorrow}
                          disabled={isTxPending || isTxConfirming || Number(maxBorrow) < 0.01 || !borrowAmount || Number(borrowAmount) <= 0}
                        >
                          {(isTxPending || isTxConfirming) ? <RefreshCw size={18} className="spin" /> : 'Borrow'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <footer className="footer">
        <p className="footer-text">Built for the Flare Summer Signal Hackathon</p>
      </footer>
    </>
  );
}
