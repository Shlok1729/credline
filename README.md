# CredLine 🔐

**Privacy-preserving credit scoring and lending on Flare.**

> Built for the [Flare Summer Signal Hackathon](https://dorahacks.io/) — Confidential Compute Apps bounty.

---

## What is CredLine?

CredLine lets a borrower **prove their creditworthiness without revealing their financial history**. A user's on-chain activity is scored privately inside a Trusted Execution Environment (TEE) on Flare. Only the resulting credential (a score tier) is written on-chain, and that credential unlocks better borrowing terms in a FXRP-collateralized lending pool.

**The problem:** In traditional DeFi lending, you either post massive collateral (because you're anonymous) or reveal your entire financial history to prove you're trustworthy.

**Our solution:** A private "credit check" that runs inside secure hardware. The raw data goes in, a single number (300–850) comes out. Nothing else ever leaves the enclave.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│  1. Connect wallet                                          │
│  2. Submit financial history (mock data for demo)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FLARE TEE ENCLAVE (Go)                         │
│  • Receives raw inputs (age, tx count, volume, activity)    │
│  • Computes credit score (300–850)                          │
│  • ⚠️  DESTROYS raw inputs after scoring                    │
│  • Signs result with TEE attestation key                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Only the score exits
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             COSTON2 BLOCKCHAIN                              │
│  CredRegistry.sol    → Stores score (300–850) per address   │
│  LendingPoolLite.sol → Reads score, adjusts borrow terms   │
│  MockFXRP.sol        → Demo ERC-20 for the lending pool     │
└─────────────────────────────────────────────────────────────┘
```

## Scoring Formula

| Factor | Max Points | Calculation |
|--------|-----------|-------------|
| Account Age | 150 | `min(days / 365 × 100, 150)` |
| Monthly Volume | 200 | `min(log₁₀(volume + 1) × 50, 200)` |
| Active Months | 150 | `min(months / 12 × 100, 150)` |
| Tx Count | 50 | `min(txCount / 100 × 50, 50)` |

**Base = 300**, final score clamped to **300–850**.

## Lending Tiers

| Tier | Score | Collateral Required | Borrow Cap |
|------|-------|-------------------|------------|
| Excellent | ≥ 750 | 120% | 2.0× |
| Good | ≥ 650 | 140% | 1.5× |
| Standard | < 650 | 180% | 1.0× |

## Project Structure

```
credline/
├── contracts/              # Foundry (Solidity)
│   ├── src/
│   │   ├── CredRegistry.sol
│   │   ├── LendingPoolLite.sol
│   │   ├── MockFXRP.sol
│   │   └── interfaces/IERC20.sol
│   ├── test/               # 37 passing tests
│   ├── script/Deploy.s.sol
│   └── foundry.toml
├── tee-extension/          # Flare TEE Extension (Go)
│   └── go/
│       ├── internal/
│       │   ├── config/     # OPType/OPCommand constants
│       │   └── extension/  # Scoring logic + privacy enforcement
│       └── pkg/types/      # ScoreRequest/ScoreResponse
├── frontend/               # Next.js + Wagmi + Viem
│   └── src/app/
│       ├── page.tsx        # Main dashboard
│       ├── providers.tsx   # Wagmi/Coston2 config
│       └── globals.css     # Dark theme design system
└── mock-data/              # Sample user profiles
```

## Tech Stack

- **TEE:** Go, Flare Confidential Compute (FCC) extension scaffold
- **Contracts:** Solidity 0.8.27, Foundry
- **Frontend:** Next.js 16, TypeScript, Wagmi v3, Viem
- **Network:** Flare Coston2 Testnet

## Quick Start

```bash
# 1. Smart contract tests
cd contracts
forge install foundry-rs/forge-std --no-git
forge test

# 2. Frontend
cd frontend
npm install
npm run dev
# → http://localhost:3000

# 3. Deploy contracts to Coston2
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Privacy Guarantee

The TEE enclave:
1. **Receives** raw financial data (account age, tx count, volume, active months)
2. **Computes** a credit score using a deterministic formula
3. **Zeros out** all raw input variables before the payload exits
4. **Signs** only the final score (300–850) with the TEE attestation key
5. **Writes** the score to `CredRegistry.sol` — the only data that touches the blockchain

No AI, no external APIs, no data storage. Pure deterministic math inside hardware-isolated memory.

## Team

Built by a 3-person team for the Flare Summer Signal Hackathon 2025.

## License

MIT
