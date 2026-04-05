/**
 * Protocol identity and signed object primitives for the Node reference SDK.
 */

import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { SignJWT, createLocalJWKSet, decodeJwt, decodeProtectedHeader, exportJWK, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { generateIdentityKeys, signPayload, verifySignature } from './crypto.js';
import { createSubjectRef, extractPublicKeyFromSubjectString, parseSubjectRef } from './subject-ref.js';
import type {
    CreateIdentityDescriptorOptions,
    CreateIssuerJwkOptions,
    CreateRequestProofOptions,
    CreateSessionJwtOptions,
    IdentityDescriptor,
    IssuerJwk,
    IssuerJwks,
    ParentSubjectReference,
    RequestProof,
    SessionJwtClaims,
    SubjectIdentity,
    SubjectReference,
    VerifyRequestProofOptions,
    VerifySessionJwtOptions,
    VerifySessionJwtWithJwksOptions,
} from './types.js';

const CBIO_PROTOCOL_VERSION = 'v1.0';
function createPrivateKeyFromBase64Url(privateKey: string): crypto.KeyObject {
    return crypto.createPrivateKey({
        key: Buffer.from(privateKey, 'base64url'),
        format: 'der',
        type: 'pkcs8',
    });
}

function createPublicKeyFromBase64Url(publicKey: string): crypto.KeyObject {
    return crypto.createPublicKey({
        key: Buffer.from(publicKey, 'base64url'),
        format: 'der',
        type: 'spki',
    });
}

async function createVerificationKey(publicKey: string, algorithm: string): Promise<crypto.KeyObject | CryptoKey> {
    return algorithm === 'EdDSA'
        ? createPublicKeyFromBase64Url(publicKey)
        : importSPKI(publicKey, algorithm);
}

function assertMetadata(metadata: Record<string, string> | undefined, fieldName: string): void {
    if (!metadata) return;
    for (const [key, value] of Object.entries(metadata)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
            throw new TypeError(`${fieldName} must contain only string keys and string values`);
        }
    }
}

function sortMetadata(metadata: Record<string, string> | undefined): Record<string, string> | undefined {
    if (!metadata) return undefined;
    assertMetadata(metadata, 'metadata');
    const entries = Object.entries(metadata).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries);
}

function toIsoString(value: string | Date, fieldName: string): string {
    if (value instanceof Date) {
        const iso = value.toISOString();
        if (Number.isNaN(Date.parse(iso))) {
            throw new TypeError(`${fieldName} must be a valid ISO-8601 timestamp`);
        }
        return iso;
    }
    if (Number.isNaN(Date.parse(value))) {
        throw new TypeError(`${fieldName} must be a valid ISO-8601 timestamp`);
    }
    return value;
}

function toEpochSeconds(value: number | Date, fieldName: string): number {
    if (value instanceof Date) {
        const seconds = Math.floor(value.getTime() / 1000);
        if (!Number.isFinite(seconds)) {
            throw new TypeError(`${fieldName} must be a valid Date`);
        }
        return seconds;
    }
    if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(`${fieldName} must be a non-negative integer number of seconds`);
    }
    return value;
}

function normalizeObject(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeObject(item));
    }
    if (value && typeof value === 'object') {
        const normalizedEntries: Array<[string, unknown]> = [];
        for (const [key, child] of Object.entries(value)) {
            if (child !== undefined) {
                normalizedEntries.push([key, normalizeObject(child)]);
            }
        }
        return Object.fromEntries(normalizedEntries);
    }
    return value;
}

function canonicalStringify(value: unknown): string {
    return JSON.stringify(normalizeObject(value));
}

function normalizeAudience(audience: string | string[]): string | string[] {
    if (typeof audience === 'string') {
        return audience;
    }
    if (!Array.isArray(audience) || audience.length === 0 || audience.some((value) => typeof value !== 'string')) {
        throw new TypeError('audience must be a string or non-empty array of strings');
    }
    return audience;
}

function validateSubjectReference(subject: SubjectReference | ParentSubjectReference): boolean {
    if (!subject.public_key) {
        return false;
    }
    try {
        createPublicKeyFromBase64Url(subject.public_key);
        if ('subject_ref' in subject && subject.subject_ref !== undefined) {
            if (parseSubjectRef(subject.subject_ref).publicKey !== subject.public_key) {
                return false;
            }
        }
        return true;
    } catch {
        return false;
    }
}

function validateDecodedSessionJwtClaims(claims: Partial<SessionJwtClaims>): claims is SessionJwtClaims {
    if (typeof claims.iss !== 'string' || claims.iss.length === 0) return false;
    if (typeof claims.sub !== 'string' || claims.sub.length === 0) return false;
    const issuedAt = claims.iat;
    const expiresAt = claims.exp;
    if (typeof issuedAt !== 'number' || typeof expiresAt !== 'number') return false;
    if (!Number.isInteger(issuedAt) || !Number.isInteger(expiresAt) || issuedAt > expiresAt) return false;
    if (typeof claims.jti !== 'string' || claims.jti.length === 0) return false;
    if (typeof claims.aud !== 'string') {
        if (!Array.isArray(claims.aud) || claims.aud.length === 0 || claims.aud.some((value) => typeof value !== 'string')) {
            return false;
        }
    }
    if (claims.amr && (!Array.isArray(claims.amr) || claims.amr.some((value) => typeof value !== 'string'))) {
        return false;
    }
    if (claims.sid !== undefined && typeof claims.sid !== 'string') return false;
    if (claims.cbio_species !== undefined && typeof claims.cbio_species !== 'string') return false;
    if (claims.cbio_kind !== undefined && typeof claims.cbio_kind !== 'string') return false;
    if (claims.cbio !== undefined && (claims.cbio === null || Array.isArray(claims.cbio) || typeof claims.cbio !== 'object')) {
        return false;
    }
    return true;
}

export function createIdentity(): SubjectIdentity {
    const { privateKey, publicKey } = generateIdentityKeys();
    return {
        privateKey,
        publicKey: publicKey!,
        subjectRef: createSubjectRef(publicKey!),
    };
}

export { createSubjectRef };

export function createSubjectReference(publicKey: string, options?: {
    species?: string;
    kindLabel?: string;
}): SubjectReference {
    return {
        public_key: publicKey,
        subject_ref: createSubjectRef(publicKey),
        species: options?.species,
        kind_label: options?.kindLabel,
    };
}

export function serializeIdentityDescriptorPayload(descriptor: IdentityDescriptor): string {
    return canonicalStringify({
        cbio_protocol: descriptor.cbio_protocol,
        kind: descriptor.kind,
        subject: {
            public_key: descriptor.subject.public_key,
            subject_ref: descriptor.subject.subject_ref,
            species: descriptor.subject.species,
            kind_label: descriptor.subject.kind_label,
            parent: descriptor.subject.parent,
            metadata: sortMetadata(descriptor.subject.metadata),
        },
    });
}

export function serializeRequestProofPayload(proof: RequestProof): string {
    return canonicalStringify({
        cbio_protocol: proof.cbio_protocol,
        kind: proof.kind,
        subject: {
            public_key: proof.subject.public_key,
            subject_ref: proof.subject.subject_ref,
            species: proof.subject.species,
            kind_label: proof.subject.kind_label,
        },
        request: {
            action: proof.request.action,
            issued_at: proof.request.issued_at,
            nonce: proof.request.nonce,
            resource: proof.request.resource,
            session_id: proof.request.session_id,
            audience: proof.request.audience,
            metadata: sortMetadata(proof.request.metadata),
        },
    });
}

export function createIdentityDescriptor(options: CreateIdentityDescriptorOptions): IdentityDescriptor {
    const descriptor: IdentityDescriptor = {
        cbio_protocol: CBIO_PROTOCOL_VERSION,
        kind: 'identity_descriptor',
        subject: {
            public_key: options.publicKey,
            subject_ref: createSubjectRef(options.publicKey),
            species: options.species,
            kind_label: options.kindLabel,
            parent: options.parent,
            metadata: sortMetadata(options.metadata),
        },
    };

    if (options.parent) {
        if (!options.parentPrivateKey) {
            throw new TypeError('parentPrivateKey is required when parent is present');
        }
        descriptor.subject.parent_signature = signPayload(
            options.parentPrivateKey,
            serializeIdentityDescriptorPayload(descriptor),
        );
    }

    return descriptor;
}

export function verifyIdentityDescriptor(descriptor: IdentityDescriptor): boolean {
    if (descriptor.cbio_protocol !== CBIO_PROTOCOL_VERSION || descriptor.kind !== 'identity_descriptor') {
        return false;
    }
    if (!validateSubjectReference(descriptor.subject)) {
        return false;
    }
    if (!descriptor.subject.parent) {
        return descriptor.subject.parent_signature === undefined;
    }
    if (!validateSubjectReference(descriptor.subject.parent)) {
        return false;
    }
    if (!descriptor.subject.parent_signature) {
        return false;
    }
    return verifySignature(
        descriptor.subject.parent.public_key,
        descriptor.subject.parent_signature,
        serializeIdentityDescriptorPayload(descriptor),
    );
}

export async function createSessionJwt(options: CreateSessionJwtOptions): Promise<string> {
    const issuedAt = toEpochSeconds(options.issuedAt, 'issuedAt');
    const expiresAt = toEpochSeconds(options.expiresAt, 'expiresAt');
    if (issuedAt > expiresAt) {
        throw new TypeError('issuedAt must be less than or equal to expiresAt');
    }

    const algorithm = options.algorithm ?? 'EdDSA';
    const signer = algorithm === 'EdDSA'
        ? (
            options.issuerPrivateKey.includes('-----BEGIN')
                ? await importPKCS8(options.issuerPrivateKey, algorithm)
                : createPrivateKeyFromBase64Url(options.issuerPrivateKey)
        )
        : await importPKCS8(options.issuerPrivateKey, algorithm);
    const payload = new SignJWT({
        sid: options.sessionId,
        amr: options.authenticationMethods,
        cbio_species: options.species,
        cbio_kind: options.kind,
        cbio: options.cbio,
    })
        .setProtectedHeader({ alg: algorithm, typ: 'JWT', kid: options.keyId })
        .setIssuer(options.issuer)
        .setSubject(options.subjectRef ?? createSubjectRef(options.subjectPublicKey))
        .setAudience(normalizeAudience(options.audience))
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt)
        .setJti(options.tokenId);

    return payload.sign(signer);
}

export function decodeSessionJwtClaims(token: string): SessionJwtClaims {
    const claims = decodeJwt(token) as Partial<SessionJwtClaims>;
    if (!validateDecodedSessionJwtClaims(claims)) {
        throw new TypeError('Session JWT claims are invalid');
    }
    return claims;
}

export async function verifySessionJwt(token: string, options: VerifySessionJwtOptions): Promise<boolean> {
    try {
        const header = decodeProtectedHeader(token);
        if (header.typ !== 'JWT' || typeof header.alg !== 'string' || header.alg.length === 0) {
            return false;
        }
        const allowedAlgorithms = options.allowedAlgorithms ?? ['EdDSA', 'RS256'];
        if (!allowedAlgorithms.includes(header.alg)) {
            return false;
        }

        const nowSeconds = toEpochSeconds(options.now ?? Math.floor(Date.now() / 1000), 'now');
        const verificationKey = await createVerificationKey(options.issuerPublicKey, header.alg);
        const verifyResult = await jwtVerify(token, verificationKey, {
            algorithms: allowedAlgorithms,
            issuer: options.expectedIssuer,
            audience: options.expectedAudience,
            currentDate: new Date(nowSeconds * 1000),
        });
        const claims = verifyResult.payload as Partial<SessionJwtClaims>;
        if (!validateDecodedSessionJwtClaims(claims)) {
            return false;
        }
        const actualSubjectPublicKey = extractPublicKeyFromSubjectString(claims.sub);
        if (options.expectedSubjectPublicKey && actualSubjectPublicKey !== options.expectedSubjectPublicKey) {
            return false;
        }
        if (options.expectedSubjectRef && claims.sub !== options.expectedSubjectRef) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export async function createIssuerJwk(options: CreateIssuerJwkOptions): Promise<IssuerJwk> {
    if (options.algorithm === 'EdDSA') {
        if (options.x) {
            return {
                kid: options.keyId,
                alg: 'EdDSA',
                use: 'sig',
                kty: 'OKP',
                crv: 'Ed25519',
                x: options.x,
            };
        }
        if (!options.publicKey) {
            throw new TypeError('publicKey or x is required for EdDSA issuer JWK creation');
        }
        const verificationKey = await createVerificationKey(options.publicKey, options.algorithm);
        const jwk = await exportJWK(verificationKey);
        if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
            throw new TypeError('Failed to derive EdDSA JWK fields from public key');
        }
        return {
            kid: options.keyId,
            alg: 'EdDSA',
            use: 'sig',
            kty: 'OKP',
            crv: 'Ed25519',
            x: jwk.x,
        };
    }

    if (options.n && options.e) {
        return {
            kid: options.keyId,
            alg: 'RS256',
            use: 'sig',
            kty: 'RSA',
            n: options.n,
            e: options.e,
        };
    }
    if (!options.publicKey) {
        throw new TypeError('publicKey or n/e is required for RS256 issuer JWK creation');
    }
    const verificationKey = await createVerificationKey(options.publicKey, options.algorithm);
    const jwk = await exportJWK(verificationKey);
    if (jwk.kty !== 'RSA' || typeof jwk.n !== 'string' || typeof jwk.e !== 'string') {
        throw new TypeError('Failed to derive RS256 JWK fields from public key');
    }
    return {
        kid: options.keyId,
        alg: 'RS256',
        use: 'sig',
        kty: 'RSA',
        n: jwk.n,
        e: jwk.e,
    };
}

export async function createIssuerJwks(keys: CreateIssuerJwkOptions[]): Promise<IssuerJwks> {
    return {
        keys: await Promise.all(keys.map((key) => createIssuerJwk(key))),
    };
}

export async function verifySessionJwtWithJwks(
    token: string,
    options: VerifySessionJwtWithJwksOptions,
): Promise<boolean> {
    try {
        const header = decodeProtectedHeader(token);
        if (header.typ !== 'JWT' || typeof header.alg !== 'string' || header.alg.length === 0) {
            return false;
        }
        const allowedAlgorithms = options.allowedAlgorithms ?? ['EdDSA', 'RS256'];
        if (!allowedAlgorithms.includes(header.alg)) {
            return false;
        }

        const nowSeconds = toEpochSeconds(options.now ?? Math.floor(Date.now() / 1000), 'now');
        const verifyResult = await jwtVerify(token, createLocalJWKSet(options.jwks), {
            algorithms: allowedAlgorithms,
            issuer: options.expectedIssuer,
            audience: options.expectedAudience,
            currentDate: new Date(nowSeconds * 1000),
        });
        const claims = verifyResult.payload as Partial<SessionJwtClaims>;
        if (!validateDecodedSessionJwtClaims(claims)) {
            return false;
        }
        const actualSubjectPublicKey = extractPublicKeyFromSubjectString(claims.sub);
        if (options.expectedSubjectPublicKey && actualSubjectPublicKey !== options.expectedSubjectPublicKey) {
            return false;
        }
        if (options.expectedSubjectRef && claims.sub !== options.expectedSubjectRef) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export function createRequestProof(options: CreateRequestProofOptions): RequestProof {
    const proof: RequestProof = {
        cbio_protocol: CBIO_PROTOCOL_VERSION,
        kind: 'request_proof',
        subject: {
            public_key: options.subject.public_key,
            subject_ref: options.subject.subject_ref ?? createSubjectRef(options.subject.public_key),
            species: options.subject.species,
            kind_label: options.subject.kind_label,
        },
        request: {
            action: options.request.action,
            issued_at: toIsoString(options.request.issued_at, 'request.issued_at'),
            nonce: options.request.nonce,
            resource: options.request.resource,
            session_id: options.request.session_id,
            audience: options.request.audience,
            metadata: sortMetadata(options.request.metadata),
        },
        signature: '',
    };

    proof.signature = signPayload(
        options.privateKey,
        serializeRequestProofPayload(proof),
    );
    return proof;
}

export function verifyRequestProof(
    proof: RequestProof,
    options?: VerifyRequestProofOptions,
): boolean {
    if (proof.cbio_protocol !== CBIO_PROTOCOL_VERSION || proof.kind !== 'request_proof') {
        return false;
    }
    if (!validateSubjectReference(proof.subject)) {
        return false;
    }
    const issuedAt = Date.parse(proof.request.issued_at);
    if (Number.isNaN(issuedAt)) {
        return false;
    }
    if (options?.maxAgeMs !== undefined) {
        const now = Date.parse(toIsoString(options.now ?? new Date(), 'now'));
        if (issuedAt > now || now - issuedAt > options.maxAgeMs) {
            return false;
        }
    }
    return verifySignature(
        proof.subject.public_key,
        proof.signature,
        serializeRequestProofPayload(proof),
    );
}
