import type { SubjectRefParts } from './types.js';

const SUBJECT_REF_PREFIX = 'cbio';
const SUBJECT_REF_VERSION = 'v1';
const SUBJECT_REF_TYPE = 'sub';
const SUBJECT_REF_ALGORITHM = 'ed25519';
const SUBJECT_REF_ENCODING = 'spki-b64u';
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function assertBase64Url(value: string, field: string): void {
    if (!value || !BASE64URL_PATTERN.test(value)) {
        throw new TypeError(`${field} must be base64url`);
    }
}

export function createSubjectRef(publicKey: string): string {
    assertBase64Url(publicKey, 'public_key');
    return [
        SUBJECT_REF_PREFIX,
        SUBJECT_REF_VERSION,
        SUBJECT_REF_TYPE,
        SUBJECT_REF_ALGORITHM,
        SUBJECT_REF_ENCODING,
        publicKey,
    ].join(':');
}

export function parseSubjectRef(subjectRef: string): SubjectRefParts {
    const parts = subjectRef.split(':');
    if (parts.length !== 6) {
        throw new TypeError('subject_ref must have 6 colon-delimited parts');
    }
    const [protocol, version, type, algorithm, encoding, publicKey] = parts;
    if (protocol !== SUBJECT_REF_PREFIX) {
        throw new TypeError('subject_ref must start with cbio');
    }
    if (version !== SUBJECT_REF_VERSION) {
        throw new TypeError('unsupported subject_ref version');
    }
    if (type !== SUBJECT_REF_TYPE) {
        throw new TypeError('subject_ref must use sub type');
    }
    if (algorithm !== SUBJECT_REF_ALGORITHM) {
        throw new TypeError('unsupported subject_ref algorithm');
    }
    if (encoding !== SUBJECT_REF_ENCODING) {
        throw new TypeError('unsupported subject_ref encoding');
    }
    assertBase64Url(publicKey, 'subject_ref public_key');
    return {
        protocol,
        version,
        type,
        algorithm,
        encoding,
        publicKey,
    };
}

export function isValidSubjectRef(subjectRef: string): boolean {
    try {
        parseSubjectRef(subjectRef);
        return true;
    } catch {
        return false;
    }
}

export function extractPublicKeyFromSubjectString(value: string): string {
    if (value.startsWith(`${SUBJECT_REF_PREFIX}:${SUBJECT_REF_VERSION}:${SUBJECT_REF_TYPE}:`)) {
        return parseSubjectRef(value).publicKey;
    }
    return value;
}
