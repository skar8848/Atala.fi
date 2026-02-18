// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Addresses - All verified Euler V2 addresses on Avalanche C-Chain (43114)
library Addresses {
    // ============ Euler V2 Core ============

    /// @notice Ethereum Vault Connector - batching, sub-accounts, operators
    address constant EVC = 0xddcbe30A761Edd2e19bba930A977475265F36Fa1;

    /// @notice EVK Factory - deploys new Euler vaults
    address constant EVK_FACTORY = 0xaf4B4c18B17F6a2B32F6c398a3910bdCD7f26181;

    /// @notice Euler Earn Factory - deploys aggregator vaults
    address constant EULER_EARN_FACTORY = 0x574B00f5a0C56D370F19fa887a5545d74F52fAC2;

    /// @notice Vault Lens - batch read vault data (TVL, APY, health)
    address constant VAULT_LENS = 0x1521C9DCA248ceE906943096a5B13Fc657A020C3;

    /// @notice Oracle Router - routes price queries to correct oracle
    address constant ORACLE_ROUTER = 0x1943CeDE57adD0A35f43a95ff2Cb5b5e0e94e1C8;

    /// @notice Swap Verifier - validates swap data for liquidations
    address constant SWAP_VERIFIER = 0x2547b8E25c839E5B9037C224bb4F638750ca0418;

    // ============ Tokens ============

    /// @notice Wrapped AVAX
    address constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    /// @notice USDC (native, not bridged)
    address constant USDC = 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E;

    /// @notice USDT
    address constant USDT = 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7;

    /// @notice WETH.e (bridged)
    address constant WETH = 0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB;

    /// @notice WBTC.e (bridged)
    address constant WBTC = 0x50b7545627a5162F82A992c33b87aDc75187B218;

    /// @notice sAVAX (Benqi liquid staking)
    address constant SAVAX = 0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE;
}
