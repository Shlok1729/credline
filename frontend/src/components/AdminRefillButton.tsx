'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

const REFILL_HELPER_ADDRESS = '0x852CFE6B62807af83A18484aD5D2e90c818C2b3E';

const REFILL_HELPER_ABI = [
  {
    "type": "function",
    "name": "refill",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  }
] as const;

export default function AdminRefillButton() {
  const [step, setStep] = useState<'idle' | 'refilling' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { 
    data: txHash, 
    writeContract,
    error: txError
  } = useWriteContract();
  
  const { isSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleRefill = async () => {
    setStep('refilling');
    setErrorMsg('');
    try {
      writeContract({
        address: REFILL_HELPER_ADDRESS,
        abi: REFILL_HELPER_ABI,
        functionName: 'refill',
        value: parseEther('20'), // Refill 20 C2FLR -> WNat
      });
    } catch (e) {
      setStep('error');
      setErrorMsg('Failed to initiate transaction');
    }
  };

  useEffect(() => {
    if ((txError || isReceiptError) && step === 'refilling') {
      setStep('error');
      setErrorMsg('Transaction failed or rejected');
    }
  }, [txError, isReceiptError, step]);

  useEffect(() => {
    if (isSuccess && step === 'refilling') {
      setStep('success');
      setTimeout(() => setStep('idle'), 4000);
    }
  }, [isSuccess, step]);

  return (
    <div style={{ 
      marginTop: '2rem', 
      marginBottom: '3rem',
      padding: '1.5rem', 
      borderRadius: '16px', 
      background: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'left',
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: 'var(--accent-orange)', color: '#000', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Judge Tools
        </span>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Testnet Liquidity Faucet
        </h3>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
        Because CredLine is built on a single, global smart contract, the pool's WNat reserves can run dry if multiple people are testing the app simultaneously. <strong style={{color: 'var(--text-primary)'}}>If your borrow transactions fail</strong>, it means the pool is empty. Use this button to instantly refill the global liquidity pool with 20 WNat.
      </p>

      <button 
        className={`btn ${step === 'error' ? 'btn-orange' : 'btn-secondary'} cursor-target`}
        onClick={step === 'error' ? () => setStep('idle') : handleRefill}
        disabled={step === 'refilling' || step === 'success'}
        style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', width: '100%' }}
      >
        {step === 'idle' && 'Refill Pool Liquidity (-20 C2FLR)'}
        {step === 'refilling' && 'Refilling Pool (1/1)...'}
        {step === 'success' && 'Pool Refilled Successfully!'}
        {step === 'error' && `Error: ${errorMsg} (Click to reset)`}
      </button>
    </div>
  );
}
