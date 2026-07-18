# Contracts

- **soldeer** manages on-chain Solidity dependencies (OpenZeppelin, forge-std) that get compiled and deployed — pinned in `foundry.toml` / `soldeer.lock`.
- **pnpm** manages off-chain JS dev tooling only (solhint); run `pnpm install` then `pnpm lint`.

## Lock-and-mint flow

The token is locked (taken into custody) by the source bridge on chain A, a message is
carried across by an ERC-7786 gateway on each chain, and the destination bridge mints the
equivalent ERC-7802 token on chain B. The gateways are separate contracts on separate
chains: chain A's gateway only sends, chain B's gateway only delivers. The off-chain
relayer is the transport between them.

```mermaid
sequenceDiagram
    participant U as User (chain A)
    participant SB as SourceBridge (BridgeERC20)
    participant TA as MockToken (ERC20)
    participant GWA as Gateway A (ERC-7786)
    participant R as Relayer (off-chain)
    participant GWB as Gateway B (ERC-7786)
    participant DB as DestBridge (BridgeERC7802)
    participant TB as WrappedToken7802

    note over U,GWA: Chain A
    U->>TA: approve(SourceBridge, amount)
    U->>SB: crosschainTransfer(to, amount)
    SB->>TA: safeTransferFrom(user, SourceBridge, amount)
    note right of SB: THE LOCK (custody)
    SB->>GWA: sendMessage(counterpart, payload)
    GWA-->>R: emit MessageSent(...)

    R->>GWB: deliver(DestBridge, id, sender, payload)

    note over GWB,TB: Chain B
    GWB->>DB: receiveMessage(id, sender, payload)
    DB->>TB: crosschainMint(to, amount)
    note right of DB: THE MINT
```
