# CredLine Tech Stack Breakdown

This document is your "cheat sheet" for explaining your tech stack to hackathon judges. It breaks down every piece of technology used in the project, what it does, and why it was chosen.

---

## 1. Frontend & User Interface

### **Next.js (App Router)**
* **What it is:** A React framework built for production.
* **What it does in the project:** It serves as the foundation for the entire frontend application. We use the Next.js `App Router` (the `src/app` directory) for clean, file-based routing. It also powers our backend logic via Serverless API Routes (more on that below).
* **Why we used it:** It provides out-of-the-box performance optimizations, seamless deployment to Vercel, and allows us to have backend API logic in the same repository as our frontend.

### **React & TypeScript**
* **What they are:** React is a UI library; TypeScript is a statically typed superset of JavaScript.
* **What they do in the project:** React is used to build all the interactive components (the forms, the dashboards, the modals). TypeScript ensures our code is bug-free by enforcing strict data types (e.g., ensuring we don't accidentally pass a string when the smart contract expects a number).

### **Lucide React**
* **What it is:** A beautifully crafted, open-source icon library.
* **What it does in the project:** Provides the sleek, scalable vector icons you see throughout the dashboard (e.g., the wallet icons, the lock icons, the checkmarks).

### **CSS (Custom Animations & Glassmorphism)**
* **What it is:** Standard Cascading Style Sheets.
* **What it does in the project:** We used raw CSS to build a custom, highly premium aesthetic. Instead of relying on heavy CSS frameworks like Bootstrap, we wrote custom CSS to implement cutting-edge browser features like `animation-timeline: view()` for the scroll-reveal effects, and `backdrop-filter` for the neon glassmorphism look on the cards.

---

## 2. Web3 & Blockchain Integration

### **Wagmi**
* **What it is:** A collection of React Hooks tailored for Ethereum and EVM-compatible chains.
* **What it does in the project:** This is the bridge between our React frontend and the user's MetaMask wallet. We use Wagmi hooks (like `useAccount`, `useWriteContract`, and `useReadContract`) to let users connect their wallets, read their current loan balance from the blockchain, and send transactions to borrow money.

### **Viem**
* **What it is:** A lightweight, highly performant alternative to `ethers.js` for interacting with Ethereum.
* **What it does in the project:** Wagmi is built on top of Viem. Viem handles all the low-level data formatting, like converting human-readable numbers into BigInt format (Wei) before sending them to our smart contracts.

### **Ethers.js (v6)**
* **What it is:** A complete Ethereum library and wallet implementation.
* **What it does in the project:** We specifically used `ethers.js` inside our backend API route (`/api/tee/route.ts`). We used it to instantiate a secure Wallet using our TEE Private Key so that the server can generate a cryptographically secure ECDSA signature (`wallet.signMessage`) over the computed credit score.

---

## 3. The Backend (Trusted Execution Environment Simulation)

### **Next.js Serverless API Routes (`/api/tee`)**
* **What it is:** Backend endpoints hosted natively within the Next.js framework.
* **What it does in the project:** **This is our Mock TEE Enclave.** In a true production environment, this logic would run inside a Dockerized Go Enclave on Google Cloud Confidential Space. Because Flare requires explicit database credentials for the real TEE, we simulated the exact mathematical properties of the enclave using this serverless route. It ingests the off-chain Web2 data, computes the logarithmic credit score, signs it with a dedicated private key, and returns the signature to the frontend.
* **Why it's clever:** It allows us to prove the mathematical architecture and cryptographic flow of the application without getting bogged down in DevOps roadblocks during a hackathon.

---

## 4. Smart Contracts

### **Solidity**
* **What it is:** The programming language used for writing smart contracts on EVM chains.
* **What it does in the project:** We wrote two core contracts:
  1. **`CredRegistry.sol`**: Stores user scores and uses `ecrecover` to cryptographically verify that any submitted score was actually signed by our TEE Enclave (and not forged by a malicious user).
  2. **`LendingPoolLite.sol`**: The actual DeFi application. It accepts C2FLR as collateral, checks the user's score in the `CredRegistry`, and dynamically alters the borrowing LTV (Loan-to-Value) and borrow caps based on how good their score is.

### **Flare Coston2 Testnet**
* **What it is:** The public test network for the Flare blockchain.
* **What it does in the project:** This is where our smart contracts actually live. When a user connects MetaMask and clicks "Deposit" or "Borrow", their transaction is being verified and mined on the Coston2 blockchain.

---

## 5. Hosting & Deployment

### **Vercel**
* **What it is:** A cloud platform for static and serverless deployments, built by the creators of Next.js.
* **What it does in the project:** It hosts our entire web application on the public internet. It automatically builds our Next.js frontend and spins up AWS Lambda functions under the hood to run our `/api/tee` Serverless Route seamlessly.

---

## 6. The Production Roadmap (True Confidential Compute)

While we used a Serverless API mock for the hackathon to bypass infrastructure hurdles, the final production version of CredLine will use **Flare Confidential Compute (FCC)** on Google Cloud Confidential Space. Here is how that tech stack will work:

### **Docker & Google Cloud Confidential Space**
* **What it is:** A secure, hardware-encrypted virtual machine environment.
* **How it will be used:** The TEE enclave code is packaged into a **Docker** image. This image is deployed to a Confidential VM where the memory is hardware-encrypted. Neither Google, Flare, nor the developers of CredLine can look inside this Docker container while it is running. This provides a mathematically proven guarantee that the user's private financial data cannot be leaked.

### **Go (Golang)**
* **What it is:** A fast, strongly typed, compiled programming language.
* **How it will be used:** Instead of our Next.js TypeScript API route, the true TEE Enclave logic is written in Go (`tee-extension/go/cmd/main.go`). Go is used because it compiles down to highly efficient binaries that run perfectly inside the Dockerized Confidential Space, processing the credit scoring algorithm with maximum security and speed.

### **The Flare Indexer Database (Coston2 / Mainnet)**
* **What it is:** A highly available database maintained by Flare that constantly indexes all events happening on the Flare blockchain.
* **How it will be used:** The TEE Proxy (which sits next to the Go Enclave in Docker) must connect to this database to fetch "Signing Policies." These policies tell the TEE which cryptographic keys are currently valid and authorized by the Flare network. It ensures that the TEE is always in sync with the blockchain's state before it signs a credit score and sends it back to the user.
