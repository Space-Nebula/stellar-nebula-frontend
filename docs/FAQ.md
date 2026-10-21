# Frequently Asked Questions (FAQ)

Answers to frequently asked questions about Stellar Nebula development, wallet connectivity, smart contract interactions, and local setup.

---

## General & Architecture

### What is Stellar Nebula?

Stellar Nebula is a decentralized space exploration and resource simulation game running on the Stellar blockchain with Soroban smart contracts. The frontend renders procedural 3D nebulae in Three.js and interfaces with Soroban contracts for verifiable game actions.

### What wallets are supported?

Currently, Stellar Nebula supports:

- **Freighter Browser Extension** (recommended for browser use)
- **Albedo** (web-based browser wallet, no installation required)
- **Ledger Hardware Wallets** (connected via WebUSB)

---

## Local Development & Setup

### Which Node.js version should I use?

Node.js >= 20.x is recommended and used in CI. Node 18+ is also supported.

### Why is `npm ci` failing locally?

If `npm ci` fails due to lockfile discrepancies, make sure your git working tree is clean and runs against the current repository `package-lock.json`. Use `npm install` only when updating dependencies.

### Why do Three.js canvas tests fail in Vitest?

Vitest runs in a Node/jsdom environment where native WebGL contexts are simulated through headless canvas stubs. If testing 3D components, mock the Three.js canvas renderer using the provided mocks in `src/test/mocks`.

---

## Wallet & Blockchain Interactions

### How do I get test funds on Futurenet / Testnet?

Visit the official [Stellar Laboratory](https://lab.stellar.org) and use the "Friendbot" tool to fund any newly generated public key on Testnet or Futurenet.

### Why does Freighter report "Transaction Rejected"?

Freighter prompts the user to verify transaction operations, network passphrase, and sequence number. A rejection occurs when:

1. The user manually clicks "Cancel" or "Reject".
2. The network selected in the Freighter extension popup does not match the active app network configured in `VITE_STELLAR_NETWORK`.
3. The transaction fees exceed the user's allocated balance.

### Can I run tests completely offline?

Yes! Contract calls and Horizon HTTP requests are mocked in Vitest using mock service definitions.

---

## Performance & Rendering

### The 3D scene is stuttering or running at low FPS. How can I optimize?

1. Enable Adaptive Performance mode in the application settings.
2. In your browser settings, verify that **Hardware Acceleration** is turned on.
3. Close high-GPU usage background tabs or windows.
