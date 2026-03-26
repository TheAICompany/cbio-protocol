/**
 * Package entry: identity derivation and cryptographic primitives.
 * Pure math layer. Zero dependency on CbioAgent, vault, or errors.
 */

export { deriveRootAgentId, createIdentity } from './identity.js';
export type { RootAgentIdentity } from './identity.js';
export {
    generateNonce,
    signPayload,
    verifySignature,
    generateIdentityKeys,
    derivePublicKey,
} from './crypto.js';
export type { KeyPair } from './crypto.js';
