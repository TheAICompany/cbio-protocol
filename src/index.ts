/**
 * Package entry: identity derivation and cryptographic primitives.
 * Pure math layer. Zero dependency on CbioAgent, vault, or errors.
 */

export {
    deriveSubjectId,
    createIdentity,
    createSubjectReference,
    createIdentityDescriptor,
    verifyIdentityDescriptor,
    createSessionJwt,
    decodeSessionJwtClaims,
    verifySessionJwt,
    createIssuerJwk,
    createIssuerJwks,
    verifySessionJwtWithJwks,
    createRequestProof,
    verifyRequestProof,
    serializeIdentityDescriptorPayload,
    serializeRequestProofPayload,
} from './identity.js';
export type {
    SubjectIdentity,
    SubjectReference,
    ParentSubjectReference,
    IdentityDescriptor,
    SessionJwtClaims,
    IssuerJwk,
    IssuerJwks,
    RequestProof,
    CreateIdentityDescriptorOptions,
    CreateSessionJwtOptions,
    CreateIssuerJwkOptions,
    CreateRequestProofOptions,
    VerifySessionJwtOptions,
    VerifySessionJwtWithJwksOptions,
    VerifyRequestProofOptions,
} from './identity.js';
export {
    generateNonce,
    signPayload,
    verifySignature,
    generateIdentityKeys,
    derivePublicKey,
} from './crypto.js';
export type { KeyPair } from './crypto.js';
