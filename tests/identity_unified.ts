/**
 * Unified identity generation acceptance test.
 * Runs directly from source using node --experimental-strip-types
 */

import {
    createIdentity,
    deriveSubjectId,
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
    generateIdentityKeys,
    serializeIdentityDescriptorPayload,
} from '../src/index.js';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';

async function testCreateIdentity() {
    console.log('--- 1. testCreateIdentity ---');
    const identity = createIdentity();
    
    assert.ok(identity.privateKey, 'identity must have a privateKey');
    assert.ok(identity.publicKey, 'identity must have a publicKey');
    assert.ok(identity.subjectId, 'identity must have a subjectId');
    assert.strictEqual(identity.keyVersion, 1, 'identity must default keyVersion to 1');
    
    console.log('Subject ID:', identity.subjectId);
    assert.ok(identity.subjectId.startsWith('sub_'), 'subjectId must use sub_ prefix');
    
    const derivedId = deriveSubjectId(identity.publicKey);
    assert.strictEqual(identity.subjectId, derivedId, 'subjectId must match derivedId from publicKey');
    
    console.log('✅ createIdentity: successful and consistent');
}

async function testProtocolObjects() {
    console.log('--- 2. testProtocolObjects ---');
    const subject = createIdentity();
    assert.ok(subject.subjectId.startsWith('sub_'), 'subjectId must use sub_ prefix');
    assert.strictEqual(subject.subjectId, deriveSubjectId(subject.publicKey));

    const issuerKeys = generateIdentityKeys();
    const parent = createIdentity();
    const descriptor = createIdentityDescriptor({
        publicKey: subject.publicKey,
        species: 'agent',
        kindLabel: 'worker',
        metadata: { z: 'last', a: 'first' },
        parent: createSubjectReference(parent.publicKey),
        parentPrivateKey: parent.privateKey,
    });

    assert.ok(verifyIdentityDescriptor(descriptor), 'identity descriptor should verify');
    assert.match(
        serializeIdentityDescriptorPayload(descriptor),
        /"metadata":\{"a":"first","z":"last"\}/,
        'metadata must be serialized in lexical order',
    );

    const issuerRef = createSubjectReference(issuerKeys.publicKey!);
    const sessionJwt = await createSessionJwt({
        issuer: issuerRef.subject_id,
        subjectId: subject.subjectId,
        audience: 'api.example.com',
        issuedAt: 1_775_219_200,
        expiresAt: 1_775_222_800,
        tokenId: 'jti_123',
        issuerPrivateKey: issuerKeys.privateKey,
        sessionId: 'sess_123',
        authenticationMethods: ['biometric'],
        species: 'agent',
        kind: 'worker',
        cbio: { metadata: { a: 'first', z: 'last' } },
    });

    const claims = decodeSessionJwtClaims(sessionJwt);
    assert.strictEqual(claims.sub, subject.subjectId, 'session JWT should carry the subject_id');
    assert.strictEqual(claims.iss, issuerRef.subject_id, 'session JWT should carry the issuer');

    assert.ok(
        await verifySessionJwt(sessionJwt, {
            issuerPublicKey: issuerKeys.publicKey!,
            now: 1_775_221_000,
            expectedIssuer: issuerRef.subject_id,
            expectedAudience: 'api.example.com',
            expectedSubjectId: subject.subjectId,
            allowedAlgorithms: ['EdDSA'],
        }),
        'session JWT should verify inside validity window',
    );

    const proof = createRequestProof({
        subject: createSubjectReference(subject.publicKey),
        request: {
            action: 'vault.read',
            issued_at: '2026-04-04T00:00:00.000Z',
            nonce: 'nonce_123',
            audience: 'api.example.com',
            session_id: 'sess_123',
            metadata: { z: 'last', a: 'first' },
        },
        privateKey: subject.privateKey,
    });

    assert.ok(
        verifyRequestProof(proof, {
            now: '2026-04-04T00:00:30.000Z',
            maxAgeMs: 60_000,
        }),
        'request proof should verify within age limit',
    );

    const rsaKeys = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const rs256Jwt = await createSessionJwt({
        issuer: 'issuer.example',
        subjectId: subject.subjectId,
        audience: 'api.example.com',
        issuedAt: 1_775_219_200,
        expiresAt: 1_775_222_800,
        tokenId: 'jti_rs256',
        issuerPrivateKey: rsaKeys.privateKey,
        algorithm: 'RS256',
        keyId: 'kid_rs256_v1',
    });
    assert.ok(
        await verifySessionJwt(rs256Jwt, {
            issuerPublicKey: rsaKeys.publicKey,
            now: 1_775_221_000,
            expectedIssuer: 'issuer.example',
            expectedAudience: 'api.example.com',
            expectedSubjectId: subject.subjectId,
            allowedAlgorithms: ['RS256'],
        }),
        'session JWT should verify with RS256 when configured',
    );

    const eddsaJwk = await createIssuerJwk({
        algorithm: 'EdDSA',
        keyId: 'kid_eddsa_v1',
        publicKey: issuerKeys.publicKey!,
    });
    assert.strictEqual(eddsaJwk.kid, 'kid_eddsa_v1');
    assert.strictEqual(eddsaJwk.alg, 'EdDSA');

    const jwks = await createIssuerJwks([
        {
            publicKey: issuerKeys.publicKey!,
            algorithm: 'EdDSA',
            keyId: 'kid_eddsa_v1',
        },
        {
            publicKey: rsaKeys.publicKey,
            algorithm: 'RS256',
            keyId: 'kid_rs256_v1',
        },
    ]);
    assert.ok(
        await verifySessionJwtWithJwks(rs256Jwt, {
            jwks,
            now: 1_775_221_000,
            expectedIssuer: 'issuer.example',
            expectedAudience: 'api.example.com',
            expectedSubjectId: subject.subjectId,
            allowedAlgorithms: ['RS256'],
        }),
        'session JWT should verify against local JWKS',
    );
}

async function run() {
    console.log('=== Unified Identity Acceptance (TS Source) ===');
    try {
        await testCreateIdentity();
        await testProtocolObjects();
        console.log('\n=== All unified identity tests passed ===');
    } catch (e) {
        console.error('❌', e);
        process.exit(1);
    }
}

run();
