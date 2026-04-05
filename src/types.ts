export interface KeyPair {
    publicKey?: string;
    privateKey: string;
}

export interface SubjectIdentity {
    privateKey: string;
    publicKey: string;
    subjectRef: string;
}

export interface SubjectReference {
    public_key: string;
    subject_ref?: string;
    species?: string;
    kind_label?: string;
}

export interface ParentSubjectReference {
    public_key: string;
    subject_ref?: string;
}

export interface SubjectRefParts {
    protocol: 'cbio';
    version: 'v1';
    type: 'sub';
    algorithm: 'ed25519';
    encoding: 'spki-b64u';
    publicKey: string;
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
    species?: string;
    kindLabel?: string;
    metadata?: Record<string, string>;
    parent?: ParentSubjectReference;
    parentPrivateKey?: string;
}

export interface CreateSessionJwtOptions {
    issuer: string;
    subjectPublicKey: string;
    subjectRef?: string;
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
    expectedSubjectPublicKey?: string;
    expectedSubjectRef?: string;
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
    expectedSubjectPublicKey?: string;
    expectedSubjectRef?: string;
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
