# 3. Stellar Network Integration and Wallet Protocol

- Status: Accepted
- Deciders: Blockchain Architecture Team
- Date: 2026-08-29

## Context and Problem Statement

The application requires secure wallet authentication, Soroban smart contract calls, and asset transaction signing over the Stellar blockchain network.

## Decision Drivers

- Non-custodial security for user funds
- Multi-wallet adapter support (Freighter, Albedo)
- Network isolation (Testnet vs Mainnet configuration)

## Considered Options

- Custodial in-app Stellar key management
- Single extension support (Freighter only)
- Unified wallet abstraction provider (`@stellar/stellar-sdk` with Freighter & Albedo integration)

## Decision Outcome

Chosen option: "Unified wallet abstraction provider with Freighter and Albedo adapters via `@stellar/stellar-sdk`", ensuring non-custodial transaction signing and robust error handling.

### Positive Consequences

- Secure non-custodial user authentication
- Support for multiple browser extensions and web wallet providers
- Fallback mechanisms and network mismatch protection
