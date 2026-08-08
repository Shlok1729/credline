# CredLine — Privacy-Preserving DeFi Lending

**Built for the Flare Summer Signal Hackathon**

CredLine solves one of the biggest problems in DeFi: massive over-collateralization. By using **Flare Confidential Compute (TEE)**, CredLine allows users to generate an on-chain credit score based on their off-chain private financial data (like Web2 bank history or centralized exchange activity) *without* exposing that private data to the public blockchain.

With an excellent on-chain credit score, users can borrow crypto with significantly lower collateral requirements.

---

## 🚀 Accomplishments & Improvements

We have built a complete end-to-end MVP that runs on the **Flare Coston2 Testnet**. During our development sprints, we've significantly improved the architecture and user experience:

### 1. Working End-to-End TEE Integration
- **The Problem:** We initially encountered `UnauthorizedCaller` errors from the smart contract, and the provided docker-based TEE local simulation failed to start due to missing image dependencies (`local/tee-proxy`).
- **The Solution (Honest Architecture):** For the scope of this hackathon demo, the TEE runs as a local Node.js signer (`mock-tee.js`). It accurately simulates ingesting private data and running the scoring algorithm. Crucially, the resulting score is **ECDSA-verified on-chain by CredRegistry**. To ensure the trust model remains mathematically sound, the mock TEE uses a **dedicated signing key completely separate from the contract deployer**, enforcing the rule that only the enclave identity can mint scores.
### 2. Modern Scrolling UI Overhaul
- **The Problem:** The initial dashboard was a dense, basic two-column layout that felt cramped and unpolished.
- **The Solution:** We completely transformed the application into a sleek, premium Web3 experience!
  - **Aesthetics:** Implemented a dark mode theme with neon glassmorphism, subtle gradient meshes, modern typography (`Outfit` / `Inter`), and micro-animations.
  - **Scroll-Reveal Layout:** We transitioned the tight grid into an expansive, scrolling landing-page layout. 
  - **Native Animations:** We utilized cutting-edge CSS `animation-timeline: view()` for buttery smooth reveal animations as sections enter the viewport, complete with an `IntersectionObserver` fallback for older browsers.
  - **Balanced Spacing:** After user feedback, we tightened the layout to keep the side-by-side dashboard grid for the Identity and Lending Pool cards, ensuring users don't have to scroll excessively to manage their loans, while keeping the beautiful entrance animations.

---

## 🏗 Architecture Details

### 1. Smart Contracts (Solidity)
- **`CredRegistry.sol`**: An on-chain registry that stores a user's credit score tier. It employs ECDSA signature verification to ensure it **only accepts scores signed by the authorized TEE enclave**.
- **`LendingPoolLite.sol`**: A working lending pool that accepts **C2FLR** as collateral and lends out **WNat** (dynamically fetched from the `FlareContractRegistry`). It dynamically reads the user's score from the `CredRegistry` to adjust their borrowing terms:
  - **Excellent (≥750):** 120% collateral ratio, 2x borrow cap limit
  - **Good (≥650):** 140% collateral ratio, 1.5x borrow cap limit
  - **Standard (<650):** 180% collateral ratio (Default)

### 2. The TEE Enclave (Node.js Mock)
- A local simulation (`mock-tee.js`) running on port `6674`.
- Securely ingests private financial metrics (Account Age, Transaction Count, Monthly Volume), processes a credit score algorithm, and securely signs the result with the authorized key.

### 3. Frontend Web3 Dashboard (Next.js + React)
- **Real TEE Integration**: The frontend hits the local TEE simulation at `/direct` to compute the score securely before submitting the TEE's signature on-chain via Wagmi.
- **Data Source Simulation**: A sleek dropdown that simulates pulling private data from Web2 sources, showing the user exactly what private data is being analyzed before being sent to the enclave.
- **Live Borrowing Experience**: 
  - Interactive Deposit & Borrow inputs with robust edge-case handling.
  - Auto-updates terms and maximum borrow limits based on the verified on-chain score tier.

---

## 💻 How to Run Locally

### 1. Start the Local TEE Simulation
To simulate the Flare TEE computing the score and signing the transaction:
```bash
cd tee-extension
node mock-tee.js
```
*This starts the TEE proxy on port 6674. Leave this terminal running.*

### 2. Start the Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser. Ensure your MetaMask is on the **Coston2 Testnet**.
