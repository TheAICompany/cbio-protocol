import type {
    CreateIdentityDescriptorOptions,
    CreateRequestProofOptions,
    CreateSessionJwtOptions,
    IdentityDescriptor,
    KeyPair,
    RequestProof,
    SubjectIdentity,
    SubjectReference,
    VerifyRequestProofOptions,
    VerifySessionJwtOptions,
} from './types.js';
import { createSubjectRef, isValidSubjectRef, parseSubjectRef } from './subject-ref.js';

const NODE_ONLY_ERROR =
    'This cbio-protocol API is Node-only. Use the Node runtime entry for cryptographic key operations.';

function unsupported(name: string): never {
    throw new Error(`${name}: ${NODE_ONLY_ERROR}`);
}

export function createIdentity(): SubjectIdentity {
    unsupported('createIdentity');
}

export { createSubjectRef, parseSubjectRef, isValidSubjectRef };

export function createSubjectReference(_publicKey: string, _options?: { species?: string; kindLabel?: string }): SubjectReference {
    unsupported('createSubjectReference');
}

export function createIdentityDescriptor(_options: CreateIdentityDescriptorOptions): IdentityDescriptor {
    unsupported('createIdentityDescriptor');
}

export function verifyIdentityDescriptor(_descriptor: IdentityDescriptor): boolean {
    unsupported('verifyIdentityDescriptor');
}

export async function createSessionJwt(_options: CreateSessionJwtOptions): Promise<string> {
    unsupported('createSessionJwt');
}

export async function verifySessionJwt(_token: string, _options: VerifySessionJwtOptions): Promise<boolean> {
    unsupported('verifySessionJwt');
}

export function createRequestProof(_options: CreateRequestProofOptions): RequestProof {
    unsupported('createRequestProof');
}

export function verifyRequestProof(_proof: RequestProof, _options?: VerifyRequestProofOptions): boolean {
    unsupported('verifyRequestProof');
}

export function serializeIdentityDescriptorPayload(_descriptor: IdentityDescriptor): string {
    unsupported('serializeIdentityDescriptorPayload');
}

export function serializeRequestProofPayload(_proof: RequestProof): string {
    unsupported('serializeRequestProofPayload');
}

export function generateNonce(): string {
    unsupported('generateNonce');
}

export function signPayload(_privateKey: string, _payload: string): string {
    unsupported('signPayload');
}

export function verifySignature(_publicKey: string, _signature: string, _nonce: string): boolean {
    unsupported('verifySignature');
}

export function generateIdentityKeys(): KeyPair {
    unsupported('generateIdentityKeys');
}

export function derivePublicKey(_privateKey: string): string {
    unsupported('derivePublicKey');
}
