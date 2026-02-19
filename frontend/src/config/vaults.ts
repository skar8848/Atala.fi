// Known Euler V2 vault addresses on Avalanche
// These are discovered from the EVK Factory deployment events
// We'll expand this list as we discover more vaults

export interface VaultMeta {
  address: `0x${string}`;
  label?: string;
}

// Curated list of known vaults - will be expanded via on-chain discovery
export const KNOWN_VAULTS: VaultMeta[] = [
  // These addresses should be populated from on-chain discovery
  // For now we use the factory to discover vaults dynamically
];

// EVK Factory event signature for vault creation
export const VAULT_CREATED_EVENT =
  "event VaultCreated(address indexed vault, address indexed asset, address indexed creator)" as const;
