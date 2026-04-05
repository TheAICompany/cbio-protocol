/**
 * Package entry for the CBIO protocol reference SDK.
 */

export {
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
export {
    createSubjectRef,
    parseSubjectRef,
    isValidSubjectRef,
    extractPublicKeyFromSubjectString,
} from './subject-ref.js';
export type {
    SubjectIdentity,
    SubjectRefParts,
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
} from './types.js';
export {
    generateNonce,
    signPayload,
    verifySignature,
    generateIdentityKeys,
    derivePublicKey,
} from './crypto.js';
export type { KeyPair } from './types.js';
