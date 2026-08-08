'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Shield, Lock, Activity, Wallet, RefreshCw, Zap } from 'lucide-react';
import { CredRegistryABI, LendingPoolLiteABI } from './contracts';

// Deployed Addresses on Coston2
const CRED_REGISTRY = '0xa7E1f6E25f8fFAb0532c09170bb1066c1B8d14f0' as const;
const LENDING_POOL = '0xA3F05568fE422024838e4eDdBA03EcA272F68303' as const;

/* ── Data Source Profiles ──────────────────────────────── */
const dataSourceProfiles = [
  { label: 'Chase Bank — Primary Checking (...4921)', accountAgeDays: 1095, totalTransactions: 847, monthlyVolumeUsd: 12500, activeMonths: 30 },
  { label: 'Wells Fargo — Business Acct (...8832)',   accountAgeDays: 548,  totalTransactions: 234, monthlyVolumeUsd: 3200,  activeMonths: 14 },
  { label: 'Bank of America — Savings (...1109)',     accountAgeDays: 90,   totalTransactions: 23,  monthlyVolumeUsd: 500,   activeMonths: 3  },
  { label: 'Coinbase — Crypto Exchange (...77A1)',    accountAgeDays: 180,  totalTransactions: 156, monthlyVolumeUsd: 45000, activeMonths: 5  },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [selectedProfile, setSelectedProfile] = useState(dataSourceProfiles[0]);
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

  const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
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
  const handleComputeScore = async () => {
    if (isTxPending || isTxConfirming || !address) return;
    setScoreStatus('computing');
    
    try {
      // 1. Send raw data to local TEE Enclave proxy (MODE=0 simulation)
      const res = await fetch('http://localhost:6674/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           userAddress: address,
           accountAgeDays: selectedProfile.accountAgeDays,
           totalTransactions: selectedProfile.totalTransactions,
           monthlyVolumeUsd: selectedProfile.monthlyVolumeUsd
        })
      });

      if (!res.ok) {
        throw new Error("Failed to reach TEE Proxy. Is Docker running?");
      }
      const teeResponse = await res.json();
      
      // Extract data and signature from the proxy's response
      const resultData = teeResponse.data || teeResponse.result?.data || teeResponse.resultData;
      const signature = teeResponse.signature || teeResponse.result?.signature;
      
      if (!resultData || !signature) {
        throw new Error("Invalid response from TEE Enclave: missing data or signature");
      }
      
      // Decode the score from the original JSON payload returned inside resultData
      // The Go enclave returns JSON bytes. In JS, we parse it to get the score.
      // (The smart contract will just verify the hash of the raw bytes)
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
      alert(`TEE Compute Error: ${err.message}. Make sure you ran 'docker compose up -d' in tee-extension!`);
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="wallet-chip" onClick={() => {
                setScoreStatus('idle');
                setCollateral('');
                setBorrowAmount('');
              }} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <RefreshCw size={14} /> Reset Demo
              </button>
              <button className="wallet-chip" onClick={() => disconnect()}>
                <span className="wallet-dot" />
                {addr}
              </button>
            </div>
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
                        <label className="select-label">Select Data Source to Analyze</label>
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
                        <span className="terms-value">{Number(userBorrowed).toFixed(2)} WNat</span>
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
                        disabled={isTxPending || isTxConfirming}
                      />
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={handleDeposit}
                        disabled={isTxPending || isTxConfirming || !collateral || Number(collateral) <= 0}
                      >
                        {(isTxPending || isTxConfirming) ? <RefreshCw size={14} className="spin" /> : 'Deposit'}
                      </button>
                    </div>
                  </div>

                  <div className="input-group mb-0">
                    <div className="input-label">
                      <span className="input-label-text">Borrow (WNat)</span>
                      <span 
                        className="input-label-hint" 
                        style={{ cursor: 'pointer', color: 'var(--orange)' }} 
                        onClick={() => setBorrowAmount(Number(maxBorrow).toFixed(2))}
                      >
                        Max: {Number(maxBorrow).toFixed(2)}
                      </span>
                    </div>
                    <div className="input-row">
                      <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={borrowAmount}
                        onChange={e => setBorrowAmount(e.target.value)}
                        disabled={isTxPending || isTxConfirming || Number(maxBorrow) < 0.01}
                      />
                      <button 
                        className="btn btn-orange btn-sm" 
                        onClick={handleBorrow}
                        disabled={isTxPending || isTxConfirming || Number(maxBorrow) < 0.01 || !borrowAmount || Number(borrowAmount) <= 0}
                      >
                        {(isTxPending || isTxConfirming) ? <RefreshCw size={14} className="spin" /> : 'Borrow'}
                      </button>
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
