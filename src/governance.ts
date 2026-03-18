/**
 * Governance-layer protocol objects and helpers.
 *
 * This module is protocol-facing. It defines:
 * - governance object shapes
 * - canonical unsigned payload serialization
 * - signing helpers
 * - verification helpers
 *
 * It does not define runtime storage, vault behavior, or SDK ergonomics.
 */

import { derivePublicKey, signPayload, verifySignature } from './crypto.js';
import { deriveRootAgentId } from './identity.js';

export type GovernanceProtocolVersion = 'v1.0';

export interface GovernanceIdentityRef {
    agent_id: string;
    public_key: string;
    key_version: number;
}

export interface AuthorityIdentity {
    cbio_protocol: GovernanceProtocolVersion;
    kind: 'authority_identity';
    authority: GovernanceIdentityRef;
}

export interface IssuedAgentIdentity {
    cbio_protocol: GovernanceProtocolVersion;
    kind: 'issued_agent_identity';
    agent: GovernanceIdentityRef;
    authority: GovernanceIdentityRef;
    issuance: {
        issued_at: string;
        expires_at?: string;
        sequence: number;
    };
    capabilities?: string[];
    metadata?: Record<string, string>;
    authority_signature: string;
}

export interface DelegationCertificate {
    cbio_protocol: GovernanceProtocolVersion;
    kind: 'delegation_certificate';
    issuer: GovernanceIdentityRef;
    delegate: GovernanceIdentityRef;
    delegation: {
        issued_at: string;
        expires_at?: string;
        capabilities: string[];
        constraints?: Record<string, string>;
        sequence: number;
    };
    issuer_signature: string;
}

export interface RevocationRecord {
    cbio_protocol: GovernanceProtocolVersion;
    kind: 'revocation_record';
    issuer: GovernanceIdentityRef;
    target: {
        kind: 'issued_agent_identity' | 'delegation_certificate';
        subject_agent_id: string;
        sequence: number;
    };
    revocation: {
        revoked_at: string;
        reason?: string;
    };
    issuer_signature: string;
}

export interface AuthorityChain {
    cbio_protocol: GovernanceProtocolVersion;
    kind: 'authority_chain';
    authority_root: AuthorityIdentity;
    issued_agent: IssuedAgentIdentity;
    delegations?: DelegationCertificate[];
    revocations?: RevocationRecord[];
}

export type GovernanceObject =
    | AuthorityIdentity
    | IssuedAgentIdentity
    | DelegationCertificate
    | RevocationRecord
    | AuthorityChain;

export type UnsignedIssuedAgentIdentity = Omit<IssuedAgentIdentity, 'authority_signature'>;
export type UnsignedDelegationCertificate = Omit<DelegationCertificate, 'issuer_signature'>;
export type UnsignedRevocationRecord = Omit<RevocationRecord, 'issuer_signature'>;
export type SignableGovernanceObject =
    | UnsignedIssuedAgentIdentity
    | UnsignedDelegationCertificate
    | UnsignedRevocationRecord;

interface DelegationLookupEntry {
    issuerAgentId: string;
}

function sortOptionalRecord(record?: Record<string, string>): Record<string, string> | undefined {
    if (!record) return undefined;
    const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function serializeCanonical(value: unknown): string {
    return JSON.stringify(value);
}

export function createIdentityRef(publicKey: string, keyVersion = 1): GovernanceIdentityRef {
    return {
        agent_id: deriveRootAgentId(publicKey),
        public_key: publicKey,
        key_version: keyVersion,
    };
}

export function createAuthorityIdentity(authority: GovernanceIdentityRef): AuthorityIdentity {
    return {
        cbio_protocol: 'v1.0',
        kind: 'authority_identity',
        authority,
    };
}

export function canonicalizeGovernanceObjectForSigning(object: SignableGovernanceObject): string {
    switch (object.kind) {
        case 'issued_agent_identity':
            return serializeCanonical(omitUndefined({
                cbio_protocol: object.cbio_protocol,
                kind: object.kind,
                agent: object.agent,
                authority: object.authority,
                issuance: omitUndefined({
                    issued_at: object.issuance.issued_at,
                    expires_at: object.issuance.expires_at,
                    sequence: object.issuance.sequence,
                }),
                capabilities: object.capabilities,
                metadata: sortOptionalRecord(object.metadata),
            }));
        case 'delegation_certificate':
            return serializeCanonical(omitUndefined({
                cbio_protocol: object.cbio_protocol,
                kind: object.kind,
                issuer: object.issuer,
                delegate: object.delegate,
                delegation: omitUndefined({
                    issued_at: object.delegation.issued_at,
                    expires_at: object.delegation.expires_at,
                    capabilities: object.delegation.capabilities,
                    constraints: sortOptionalRecord(object.delegation.constraints),
                    sequence: object.delegation.sequence,
                }),
            }));
        case 'revocation_record':
            return serializeCanonical(omitUndefined({
                cbio_protocol: object.cbio_protocol,
                kind: object.kind,
                issuer: object.issuer,
                target: object.target,
                revocation: omitUndefined({
                    revoked_at: object.revocation.revoked_at,
                    reason: object.revocation.reason,
                }),
            }));
        default: {
            const exhaustive: never = object;
            throw new Error(`Unsupported governance object: ${String(exhaustive)}`);
        }
    }
}

export function signIssuedAgentIdentity(
    authorityPrivateKey: string,
    object: UnsignedIssuedAgentIdentity
): IssuedAgentIdentity {
    const derivedAuthorityPublicKey = derivePublicKey(authorityPrivateKey);
    if (derivedAuthorityPublicKey !== object.authority.public_key) {
        throw new Error('Authority signer does not match authority public key.');
    }
    return {
        ...object,
        authority_signature: signPayload(authorityPrivateKey, canonicalizeGovernanceObjectForSigning(object)),
    };
}

export function signDelegationCertificate(
    issuerPrivateKey: string,
    object: UnsignedDelegationCertificate
): DelegationCertificate {
    const derivedIssuerPublicKey = derivePublicKey(issuerPrivateKey);
    if (derivedIssuerPublicKey !== object.issuer.public_key) {
        throw new Error('Delegation signer does not match issuer public key.');
    }
    return {
        ...object,
        issuer_signature: signPayload(issuerPrivateKey, canonicalizeGovernanceObjectForSigning(object)),
    };
}

export function signRevocationRecord(
    issuerPrivateKey: string,
    object: UnsignedRevocationRecord
): RevocationRecord {
    const derivedIssuerPublicKey = derivePublicKey(issuerPrivateKey);
    if (derivedIssuerPublicKey !== object.issuer.public_key) {
        throw new Error('Revocation signer does not match issuer public key.');
    }
    return {
        ...object,
        issuer_signature: signPayload(issuerPrivateKey, canonicalizeGovernanceObjectForSigning(object)),
    };
}

export function verifyGovernanceIdentityRef(identity: GovernanceIdentityRef): boolean {
    return deriveRootAgentId(identity.public_key) === identity.agent_id;
}

export function verifyAuthorityIdentity(identity: AuthorityIdentity): boolean {
    return identity.cbio_protocol === 'v1.0'
        && identity.kind === 'authority_identity'
        && verifyGovernanceIdentityRef(identity.authority);
}

function isExpired(expiresAt?: string, now = Date.now()): boolean {
    if (!expiresAt) return false;
    const ts = Date.parse(expiresAt);
    return Number.isFinite(ts) && ts < now;
}

function delegationLookupKey(delegateAgentId: string, sequence: number): string {
    return `${delegateAgentId}:${sequence}`;
}

export function verifyIssuedAgentIdentity(object: IssuedAgentIdentity, now = Date.now()): boolean {
    if (object.cbio_protocol !== 'v1.0' || object.kind !== 'issued_agent_identity') return false;
    if (!verifyGovernanceIdentityRef(object.agent)) return false;
    if (!verifyGovernanceIdentityRef(object.authority)) return false;
    if (isExpired(object.issuance.expires_at, now)) return false;
    const unsigned: UnsignedIssuedAgentIdentity = {
        cbio_protocol: object.cbio_protocol,
        kind: object.kind,
        agent: object.agent,
        authority: object.authority,
        issuance: object.issuance,
        capabilities: object.capabilities,
        metadata: object.metadata,
    };
    return verifySignature(
        object.authority.public_key,
        object.authority_signature,
        canonicalizeGovernanceObjectForSigning(unsigned)
    );
}

export function verifyDelegationCertificate(object: DelegationCertificate, now = Date.now()): boolean {
    if (object.cbio_protocol !== 'v1.0' || object.kind !== 'delegation_certificate') return false;
    if (!verifyGovernanceIdentityRef(object.issuer)) return false;
    if (!verifyGovernanceIdentityRef(object.delegate)) return false;
    if (isExpired(object.delegation.expires_at, now)) return false;
    const unsigned: UnsignedDelegationCertificate = {
        cbio_protocol: object.cbio_protocol,
        kind: object.kind,
        issuer: object.issuer,
        delegate: object.delegate,
        delegation: object.delegation,
    };
    return verifySignature(
        object.issuer.public_key,
        object.issuer_signature,
        canonicalizeGovernanceObjectForSigning(unsigned)
    );
}

export function verifyRevocationRecord(object: RevocationRecord): boolean {
    if (object.cbio_protocol !== 'v1.0' || object.kind !== 'revocation_record') return false;
    if (!verifyGovernanceIdentityRef(object.issuer)) return false;
    const unsigned: UnsignedRevocationRecord = {
        cbio_protocol: object.cbio_protocol,
        kind: object.kind,
        issuer: object.issuer,
        target: object.target,
        revocation: object.revocation,
    };
    return verifySignature(
        object.issuer.public_key,
        object.issuer_signature,
        canonicalizeGovernanceObjectForSigning(unsigned)
    );
}

export function verifyAuthorityChain(chain: AuthorityChain, now = Date.now()): boolean {
    if (chain.cbio_protocol !== 'v1.0' || chain.kind !== 'authority_chain') return false;
    if (!verifyAuthorityIdentity(chain.authority_root)) return false;
    if (chain.authority_root.authority.agent_id !== chain.issued_agent.authority.agent_id) return false;
    if (chain.authority_root.authority.public_key !== chain.issued_agent.authority.public_key) return false;
    if (!verifyIssuedAgentIdentity(chain.issued_agent, now)) return false;

    const delegations = chain.delegations ?? [];
    const delegationTargets = new Map<string, DelegationLookupEntry>();
    let currentAuthorityAgentId = chain.issued_agent.agent.agent_id;
    for (const delegation of delegations) {
        if (!verifyDelegationCertificate(delegation, now)) return false;
        if (delegation.issuer.agent_id !== currentAuthorityAgentId) return false;
        const key = delegationLookupKey(delegation.delegate.agent_id, delegation.delegation.sequence);
        if (delegationTargets.has(key)) return false;
        delegationTargets.set(key, {
            issuerAgentId: delegation.issuer.agent_id,
        });
        currentAuthorityAgentId = delegation.delegate.agent_id;
    }

    const revocations = chain.revocations ?? [];
    for (const revocation of revocations) {
        if (!verifyRevocationRecord(revocation)) return false;
        if (revocation.target.kind === 'issued_agent_identity') {
            const isIssuedAgentTarget =
                revocation.target.subject_agent_id === chain.issued_agent.agent.agent_id
                && revocation.target.sequence === chain.issued_agent.issuance.sequence;
            if (!isIssuedAgentTarget) return false;
            if (revocation.issuer.agent_id !== chain.issued_agent.authority.agent_id) return false;
            continue;
        }

        const delegationTarget = delegationTargets.get(
            delegationLookupKey(revocation.target.subject_agent_id, revocation.target.sequence)
        );
        if (!delegationTarget) return false;
        if (revocation.issuer.agent_id !== delegationTarget.issuerAgentId) return false;
    }

    const issuedAgentRevoked = revocations.some((revocation) =>
        revocation.target.kind === 'issued_agent_identity'
        && revocation.target.subject_agent_id === chain.issued_agent.agent.agent_id
        && revocation.target.sequence === chain.issued_agent.issuance.sequence
    );
    if (issuedAgentRevoked) return false;

    for (const delegation of delegations) {
        const delegationRevoked = revocations.some((revocation) =>
            revocation.target.kind === 'delegation_certificate'
            && revocation.target.subject_agent_id === delegation.delegate.agent_id
            && revocation.target.sequence === delegation.delegation.sequence
        );
        if (delegationRevoked) return false;
    }

    return true;
}
