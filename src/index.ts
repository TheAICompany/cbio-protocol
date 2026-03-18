/**
 * Protocol export. For local identity and verification primitives.
 * Pure math layer. Zero dependency on CbioAgent, vault, or errors.
 */

export { deriveRootAgentId } from './identity.js';
export type {
    GovernanceProtocolVersion,
    GovernanceIdentityRef,
    AuthorityIdentity,
    IssuedAgentIdentity,
    DelegationCertificate,
    RevocationRecord,
    AuthorityChain,
    GovernanceObject,
    UnsignedIssuedAgentIdentity,
    UnsignedDelegationCertificate,
    UnsignedRevocationRecord,
} from './governance.js';
export {
    createIdentityRef,
    createAuthorityIdentity,
    canonicalizeGovernanceObjectForSigning,
    signIssuedAgentIdentity,
    signDelegationCertificate,
    signRevocationRecord,
    verifyGovernanceIdentityRef,
    verifyAuthorityIdentity,
    verifyIssuedAgentIdentity,
    verifyDelegationCertificate,
    verifyRevocationRecord,
    verifyAuthorityChain,
} from './governance.js';
export {
    generateNonce,
    signPayload,
    verifySignature,
    generateIdentityKeys,
    derivePublicKey,
} from './crypto.js';
export type { KeyPair } from './crypto.js';
