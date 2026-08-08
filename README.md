# CredLine — Privacy-Preserving DeFi Lending

**Built for the Flare Summer Signal Hackathon**

CredLine solves one of the biggest problems in DeFi: massive over-collateralization. By using **Flare Confidential Compute (TEE)**, CredLine allows users to generate an on-chain credit score based on their off-chain private financial data (like Web2 bank history or centralized exchange activity) *without* exposing that private data to the public blockchain.

With an excellent on-chain credit score, users can borrow crypto with significantly lower collateral requirements.

---

## 🚀 Features Built So Far

We have built a complete end-to-end MVP that runs on the **Flare Coston2 Testnet**.

### 1. Smart Contracts (Solidity)
- **`CredRegistry.sol`**: An on-chain registry that stores a user's credit score tier. It employs ECDSA signature verification to ensure it **only accepts scores signed by the authorized TEE enclave**.
- **`LendingPoolLite.sol`**: A working lending pool that accepts **C2FLR** as collateral and lends out **WNat** (dynamically fetched from the `FlareContractRegistry`). It dynamically reads the user's score from the `CredRegistry` to adjust their borrowing terms:
  - **Excellent (≥750):** 120% collateral ratio, 2x borrow cap limit
  - **Good (≥650):** 140% collateral ratio, 1.5x borrow cap limit
  - **Standard (<650):** 180% collateral ratio (Default)

### 2. The TEE Enclave (Go)
- Scaffolded a Go-based Trusted Execution Environment (TEE) application designed to run in Google Cloud Confidential Space via Flare's FCE tooling.
- The enclave logic securely ingests private financial metrics (Account Age, Transaction Count, Monthly Volume), processes a credit score algorithm, and securely signs the result.
- Integrated with `tee-proxy` using `MODE=0` local simulation.

### 3. Frontend Web3 Dashboard (Next.js + React)
- **Premium Dark Mode UI**: A fully responsive, modern dashboard built with vanilla CSS.
- **Real TEE Integration**: The frontend hits the local TEE proxy at `/direct` to compute the score securely before submitting the TEE's signature on-chain.
- **Data Source Simulation**: A sleek dropdown that simulates pulling private data from Web2 sources, showing the user exactly what private data is being analyzed before being sent to the enclave.
- **Live Borrowing Experience**: 
  - Interactive Deposit & Borrow inputs with robust edge-case handling.
  - Auto-updates terms and maximum borrow limits based on the verified on-chain score tier.
  - Reset state button to easily demo multiple flows.

---

## 🛠 Architecture Flow

1. **Connect**: User connects their MetaMask to the CredLine frontend on Coston2.
2. **Private Input**: User selects a Web2 data source (simulating an OAuth flow like Plaid).
3. **TEE Compute**: The private data is securely processed inside the TEE proxy/enclave. 
4. **Mint Credential**: The resulting credit score and TEE signature are passed back to the frontend, which submits them to the `CredRegistry` smart contract for verification.
5. **Borrow**: The user visits the `LendingPoolLite` dashboard, deposits C2FLR, and borrows WNat at their newly unlocked, highly favorable rates.

---

## 💻 How to Run Locally

### 1. Start the Local TEE Simulation
You must have Docker running on your machine.
```bash
cd tee-extension
docker compose up -d
```
*This starts the TEE proxy on port 6674.*

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser. Ensure your MetaMask is on the Coston2 Testnet.
