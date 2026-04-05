import { createLocalJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose';
import { extractPublicKeyFromSubjectString } from './subject-ref.js';
import type {
    CreateIssuerJwkOptions,
    IssuerJwk,
    IssuerJwks,
    SessionJwtClaims,
    VerifySessionJwtWithJwksOptions,
} from './types.js';

function toEpochSeconds(value: number | Date | undefined): number | undefined {
    if (value === undefined) return undefined;
    return value instanceof Date ? Math.floor(value.getTime() / 1000) : value;
}

function normalizeAllowedAlgorithms(value: string[] | undefined): string[] {
    return value ?? ['EdDSA', 'RS256'];
}

function validateDecodedSessionJwtClaims(claims: SessionJwtClaims): boolean {
    if (typeof claims.iss !== 'string' || claims.iss.length === 0) return false;
    if (typeof claims.sub !== 'string' || claims.sub.length === 0) return false;
    if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat > claims.exp) return false;
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

export function decodeSessionJwtClaims(token: string): SessionJwtClaims {
    const claims = decodeJwt(token) as SessionJwtClaims;
    if (!validateDecodedSessionJwtClaims(claims)) {
        throw new TypeError('token does not contain valid CBIO session JWT claims');
    }
    return claims;
}

export function createIssuerJwk(options: CreateIssuerJwkOptions): IssuerJwk {
    if (options.algorithm === 'EdDSA') {
        if (!options.x) {
            throw new TypeError('EdDSA issuer JWK requires x');
        }
        return {
            kid: options.keyId,
            alg: 'EdDSA',
            use: 'sig',
            kty: 'OKP',
            crv: 'Ed25519',
            x: options.x,
        };
    }
    if (!options.n || !options.e) {
        throw new TypeError('RS256 issuer JWK requires n and e');
    }
    return {
        kid: options.keyId,
        alg: 'RS256',
        use: 'sig',
        kty: 'RSA',
        n: options.n,
        e: options.e,
    };
}

export function createIssuerJwks(keys: CreateIssuerJwkOptions[]): IssuerJwks {
    return { keys: keys.map((key) => createIssuerJwk(key)) };
}

export async function verifySessionJwtWithJwks(
    token: string,
    options: VerifySessionJwtWithJwksOptions
): Promise<boolean> {
    const header = decodeProtectedHeader(token);
    if (header.typ !== 'JWT' || typeof header.alg !== 'string' || header.alg.length === 0) {
        return false;
    }
    const allowedAlgorithms = normalizeAllowedAlgorithms(options.allowedAlgorithms);
    if (!allowedAlgorithms.includes(header.alg)) {
        return false;
    }

    const now = toEpochSeconds(options.now);
    try {
        const verifyResult = await jwtVerify(token, createLocalJWKSet(options.jwks), {
            algorithms: allowedAlgorithms,
            issuer: options.expectedIssuer,
            audience: options.expectedAudience,
            currentDate: now !== undefined ? new Date(now * 1000) : undefined,
        });
        const claims = verifyResult.payload as SessionJwtClaims;
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
