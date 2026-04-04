/**
 * Protocol identity and signed object primitives. Pure math layer.
 */

import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { SignJWT, createLocalJWKSet, decodeJwt, decodeProtectedHeader, exportJWK, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { generateIdentityKeys, signPayload, verifySignature } from './crypto.js';

export interface SubjectIdentity {
    privateKey: string;
    publicKey: string;
    subjectId: string;
    keyVersion: number;
}

export interface SubjectReference {
    subject_id: string;
    public_key: string;
    key_version: number;
    species?: string;
    kind_label?: string;
}

export interface ParentSubjectReference {
    subject_id: string;
    public_key: string;
    key_version: number;
}

export interface IdentityDescriptor {
    cbio_protocol: 'v1.0';
    kind: 'identity_descriptor';
    subject: SubjectReference & {
        parent?: ParentSubjectReference;
        parent_signature?: string;
        metadata?: Record<string, string>;
    };
}

export interface SessionJwtClaims {
    iss: string;
    sub: string;
    aud: string | string[];
    iat: number;
    exp: number;
    jti: string;
    sid?: string;
    amr?: string[];
    cbio_species?: string;
    cbio_kind?: string;
    cbio?: Record<string, unknown>;
}

export interface IssuerJwk {
    kid: string;
    alg: 'EdDSA' | 'RS256';
    use: 'sig';
    kty: 'OKP' | 'RSA';
    crv?: 'Ed25519';
    x?: string;
    n?: string;
    e?: string;
}

export interface IssuerJwks {
    keys: IssuerJwk[];
}

export interface RequestProof {
    cbio_protocol: 'v1.0';
    kind: 'request_proof';
    subject: SubjectReference;
    request: {
        action: string;
        issued_at: string;
        nonce: string;
        resource?: string;
        session_id?: string;
        audience?: string;
        metadata?: Record<string, string>;
    };
    signature: string;
}

export interface CreateIdentityDescriptorOptions {
    publicKey: string;
    keyVersion?: number;
    species?: string;
    kindLabel?: string;
    metadata?: Record<string, string>;
    parent?: ParentSubjectReference;
    parentPrivateKey?: string;
}

export interface CreateSessionJwtOptions {
    issuer: string;
    subjectId: string;
    audience: string | string[];
    issuedAt: number;
    expiresAt: number;
    tokenId: string;
    issuerPrivateKey: string;
    algorithm?: 'EdDSA' | 'RS256';
    keyId?: string;
    sessionId?: string;
    authenticationMethods?: string[];
    species?: string;
    kind?: string;
    cbio?: Record<string, unknown>;
}

export interface VerifySessionJwtOptions {
    issuerPublicKey: string;
    now?: number | Date;
    expectedIssuer?: string;
    expectedAudience?: string;
    expectedSubjectId?: string;
    allowedAlgorithms?: string[];
}

export interface CreateIssuerJwkOptions {
    algorithm: 'EdDSA' | 'RS256';
    keyId: string;
    publicKey?: string;
    x?: string;
    n?: string;
    e?: string;
}

export interface VerifySessionJwtWithJwksOptions {
    jwks: IssuerJwks;
    now?: number | Date;
    expectedIssuer?: string;
    expectedAudience?: string;
    expectedSubjectId?: string;
    allowedAlgorithms?: string[];
}

export interface CreateRequestProofOptions {
    subject: SubjectReference;
    request: RequestProof['request'];
    privateKey: string;
}

export interface VerifyRequestProofOptions {
    now?: string | Date;
    maxAgeMs?: number;
}

const SUBJECT_ID_PREFIX = 'sub_';
const CBIO_PROTOCOL_VERSION = 'v1.0';
const DEFAULT_KEY_VERSION = 1;

function hashPublicKeyToId(publicKey: string, prefix: string): string {
    const rawKey = Buffer.from(publicKey, 'base64url');
    const hash = crypto.createHash('sha256').update(rawKey).digest('base64url');
    return prefix + hash;
}

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
    if (!subject.subject_id || !subject.public_key || !Number.isInteger(subject.key_version)) {
        return false;
    }
    return deriveSubjectId(subject.public_key) === subject.subject_id;
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

export function deriveSubjectId(publicKey: string): string {
    return hashPublicKeyToId(publicKey, SUBJECT_ID_PREFIX);
}

export function createIdentity(): SubjectIdentity {
    const { privateKey, publicKey } = generateIdentityKeys();
    return {
        privateKey,
        publicKey: publicKey!,
        subjectId: deriveSubjectId(publicKey!),
        keyVersion: DEFAULT_KEY_VERSION,
    };
}

export function createSubjectReference(publicKey: string, options?: {
    keyVersion?: number;
    species?: string;
    kindLabel?: string;
}): SubjectReference {
    return {
        subject_id: deriveSubjectId(publicKey),
        public_key: publicKey,
        key_version: options?.keyVersion ?? DEFAULT_KEY_VERSION,
        species: options?.species,
        kind_label: options?.kindLabel,
    };
}

export function serializeIdentityDescriptorPayload(descriptor: IdentityDescriptor): string {
    return canonicalStringify({
        cbio_protocol: descriptor.cbio_protocol,
        kind: descriptor.kind,
        subject: {
            subject_id: descriptor.subject.subject_id,
            public_key: descriptor.subject.public_key,
            key_version: descriptor.subject.key_version,
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
            subject_id: proof.subject.subject_id,
            public_key: proof.subject.public_key,
            key_version: proof.subject.key_version,
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
            subject_id: deriveSubjectId(options.publicKey),
            public_key: options.publicKey,
            key_version: options.keyVersion ?? DEFAULT_KEY_VERSION,
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
        .setSubject(options.subjectId)
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
            subject: options.expectedSubjectId,
            audience: options.expectedAudience,
            currentDate: new Date(nowSeconds * 1000),
        });

        return validateDecodedSessionJwtClaims(verifyResult.payload as Partial<SessionJwtClaims>);
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
            subject: options.expectedSubjectId,
            audience: options.expectedAudience,
            currentDate: new Date(nowSeconds * 1000),
        });

        return validateDecodedSessionJwtClaims(verifyResult.payload as Partial<SessionJwtClaims>);
    } catch {
        return false;
    }
}

export function createRequestProof(options: CreateRequestProofOptions): RequestProof {
    const proof: RequestProof = {
        cbio_protocol: CBIO_PROTOCOL_VERSION,
        kind: 'request_proof',
        subject: {
            subject_id: options.subject.subject_id,
            public_key: options.subject.public_key,
            key_version: options.subject.key_version,
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
