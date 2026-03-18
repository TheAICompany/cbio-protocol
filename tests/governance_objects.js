import assert from 'node:assert';
import {
    generateIdentityKeys,
    createIdentityRef,
    createAuthorityIdentity,
    canonicalizeGovernanceObjectForSigning,
    signIssuedAgentIdentity,
    signDelegationCertificate,
    signRevocationRecord,
    verifyAuthorityIdentity,
    verifyIssuedAgentIdentity,
    verifyDelegationCertificate,
    verifyRevocationRecord,
    verifyAuthorityChain,
} from '../src/index.js';

function nowIso() {
    return new Date().toISOString();
}

async function testGovernanceSigningAndVerification() {
    console.log('--- Governance Object Signing ---');

    const rootKeys = generateIdentityKeys();
    const childKeys = generateIdentityKeys();
    const delegateKeys = generateIdentityKeys();

    const rootRef = createIdentityRef(rootKeys.publicKey);
    const childRef = createIdentityRef(childKeys.publicKey);
    const delegateRef = createIdentityRef(delegateKeys.publicKey);

    const authorityIdentity = createAuthorityIdentity(rootRef);
    assert.ok(verifyAuthorityIdentity(authorityIdentity), 'authority identity should verify');

    const issuedUnsigned = {
        cbio_protocol: 'v3.0',
        kind: 'issued_agent_identity',
        agent: childRef,
        authority: rootRef,
        issuance: {
            issued_at: nowIso(),
            sequence: 1,
        },
        capabilities: ['vault.use', 'http.fetch'],
        metadata: {
            env: 'test',
            label: 'child-agent',
        },
    };
    const issued = signIssuedAgentIdentity(rootKeys.privateKey, issuedUnsigned);
    assert.ok(verifyIssuedAgentIdentity(issued), 'issued agent identity should verify');

    const delegationUnsigned = {
        cbio_protocol: 'v3.0',
        kind: 'delegation_certificate',
        issuer: childRef,
        delegate: delegateRef,
        delegation: {
            issued_at: nowIso(),
            capabilities: ['task.execute'],
            constraints: {
                region: 'local',
            },
            sequence: 1,
        },
    };
    const delegation = signDelegationCertificate(childKeys.privateKey, delegationUnsigned);
    assert.ok(verifyDelegationCertificate(delegation), 'delegation certificate should verify');

    const chain = {
        cbio_protocol: 'v3.0',
        kind: 'authority_chain',
        authority_root: authorityIdentity,
        issued_agent: issued,
        delegations: [delegation],
    };
    assert.ok(verifyAuthorityChain(chain), 'authority chain should verify before revocation');

    const revocationUnsigned = {
        cbio_protocol: 'v3.0',
        kind: 'revocation_record',
        issuer: childRef,
        target: {
            kind: 'delegation_certificate',
            subject_agent_id: delegateRef.agent_id,
            sequence: 1,
        },
        revocation: {
            revoked_at: nowIso(),
            reason: 'decommissioned',
        },
    };
    const revocation = signRevocationRecord(childKeys.privateKey, revocationUnsigned);
    assert.ok(verifyRevocationRecord(revocation), 'revocation record should verify');
    assert.strictEqual(
        verifyAuthorityChain({ ...chain, revocations: [revocation] }),
        false,
        'revoked delegation should invalidate chain'
    );

    console.log('✅ governance objects: signing, verification, and chain revocation');
}

async function testGovernanceTamperResistance() {
    console.log('\n--- Governance Tamper Resistance ---');

    const rootKeys = generateIdentityKeys();
    const childKeys = generateIdentityKeys();
    const rootRef = createIdentityRef(rootKeys.publicKey);
    const childRef = createIdentityRef(childKeys.publicKey);

    const issued = signIssuedAgentIdentity(rootKeys.privateKey, {
        cbio_protocol: 'v3.0',
        kind: 'issued_agent_identity',
        agent: childRef,
        authority: rootRef,
        issuance: {
            issued_at: nowIso(),
            sequence: 3,
        },
        capabilities: ['vault.use'],
    });

    assert.ok(verifyIssuedAgentIdentity(issued), 'control issued object should verify');

    const tampered = {
        ...issued,
        capabilities: ['vault.use', 'admin.all'],
    };
    assert.strictEqual(verifyIssuedAgentIdentity(tampered), false, 'tampered capabilities must fail verification');

    const payload = canonicalizeGovernanceObjectForSigning({
        cbio_protocol: issued.cbio_protocol,
        kind: issued.kind,
        agent: issued.agent,
        authority: issued.authority,
        issuance: issued.issuance,
        capabilities: issued.capabilities,
        metadata: issued.metadata,
    });
    assert.ok(typeof payload === 'string' && payload.length > 0, 'canonical payload should be non-empty');

    console.log('✅ governance objects: tamper resistance verified');
}

async function testAuthorityChainGovernanceRelationshipChecks() {
    console.log('\n--- Authority Chain Governance Relationships ---');

    const rootKeys = generateIdentityKeys();
    const childKeys = generateIdentityKeys();
    const delegateKeys = generateIdentityKeys();
    const outsiderKeys = generateIdentityKeys();

    const rootRef = createIdentityRef(rootKeys.publicKey);
    const childRef = createIdentityRef(childKeys.publicKey);
    const delegateRef = createIdentityRef(delegateKeys.publicKey);
    const outsiderRef = createIdentityRef(outsiderKeys.publicKey);

    const authorityIdentity = createAuthorityIdentity(rootRef);
    const issued = signIssuedAgentIdentity(rootKeys.privateKey, {
        cbio_protocol: 'v3.0',
        kind: 'issued_agent_identity',
        agent: childRef,
        authority: rootRef,
        issuance: {
            issued_at: nowIso(),
            sequence: 7,
        },
    });

    const validDelegation = signDelegationCertificate(childKeys.privateKey, {
        cbio_protocol: 'v3.0',
        kind: 'delegation_certificate',
        issuer: childRef,
        delegate: delegateRef,
        delegation: {
            issued_at: nowIso(),
            capabilities: ['task.execute'],
            sequence: 2,
        },
    });

    assert.ok(
        verifyAuthorityChain({
            cbio_protocol: 'v3.0',
            kind: 'authority_chain',
            authority_root: authorityIdentity,
            issued_agent: issued,
            delegations: [validDelegation],
        }),
        'control chain should verify'
    );

    const invalidDelegation = signDelegationCertificate(outsiderKeys.privateKey, {
        cbio_protocol: 'v3.0',
        kind: 'delegation_certificate',
        issuer: outsiderRef,
        delegate: delegateRef,
        delegation: {
            issued_at: nowIso(),
            capabilities: ['task.execute'],
            sequence: 2,
        },
    });
    assert.strictEqual(
        verifyAuthorityChain({
            cbio_protocol: 'v3.0',
            kind: 'authority_chain',
            authority_root: authorityIdentity,
            issued_agent: issued,
            delegations: [invalidDelegation],
        }),
        false,
        'delegation issuer must continue the authority chain'
    );

    const invalidRevocation = signRevocationRecord(outsiderKeys.privateKey, {
        cbio_protocol: 'v3.0',
        kind: 'revocation_record',
        issuer: outsiderRef,
        target: {
            kind: 'delegation_certificate',
            subject_agent_id: delegateRef.agent_id,
            sequence: validDelegation.delegation.sequence,
        },
        revocation: {
            revoked_at: nowIso(),
        },
    });
    assert.strictEqual(
        verifyAuthorityChain({
            cbio_protocol: 'v3.0',
            kind: 'authority_chain',
            authority_root: authorityIdentity,
            issued_agent: issued,
            delegations: [validDelegation],
            revocations: [invalidRevocation],
        }),
        false,
        'delegation revocation must be signed by the delegation issuer'
    );

    console.log('✅ authority chain: governance relationships enforced');
}

async function run() {
    await testGovernanceSigningAndVerification();
    await testGovernanceTamperResistance();
    await testAuthorityChainGovernanceRelationshipChecks();
    console.log('\n✨ Governance protocol objects verified!');
}

run().catch((error) => {
    console.error('\n❌ Governance protocol verification failed:');
    console.error(error);
    process.exit(1);
});
