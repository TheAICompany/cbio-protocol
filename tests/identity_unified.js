/**
 * Unified identity generation acceptance test.
 * Covers: createIdentity() and protocol object helpers
 */

import {
    createIdentity,
    createSubjectRef,
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
    isValidSubjectRef,
    parseSubjectRef,
} from '../dist/index.js';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';

async function testCreateIdentity() {
    console.log('--- 1. testCreateIdentity ---');
    const identity = createIdentity();
    
    assert.ok(identity.privateKey, 'identity must have a privateKey');
    assert.ok(identity.publicKey, 'identity must have a publicKey');
    assert.ok(identity.subjectRef, 'identity must have a subjectRef');
    assert.ok(isValidSubjectRef(identity.subjectRef), 'subjectRef must be valid');
    assert.strictEqual(parseSubjectRef(identity.subjectRef).publicKey, identity.publicKey, 'subjectRef must round-trip');
    
    console.log('Public Key:', identity.publicKey);
    
    console.log('✅ createIdentity: successful and consistent');
}

async function testProtocolObjects() {
    console.log('--- 2. testProtocolObjects ---');
    const subject = createIdentity();

    const issuerKeys = generateIdentityKeys();
    const parent = createIdentity();
    const descriptor = createIdentityDescriptor({
        publicKey: subject.publicKey,
        parent: createSubjectReference(parent.publicKey),
        parentPrivateKey: parent.privateKey,
    });
    assert.ok(verifyIdentityDescriptor(descriptor), 'identity descriptor should verify');
    assert.strictEqual(descriptor.subject.subject_ref, createSubjectRef(subject.publicKey), 'identity descriptor should carry subject_ref');

    const sessionJwt = await createSessionJwt({
        issuer: 'issuer.example',
        subjectPublicKey: subject.publicKey,
        subjectRef: subject.subjectRef,
        audience: 'api.example.com',
        issuedAt: 1775219200,
        expiresAt: 1775222800,
        tokenId: 'jti_123',
        issuerPrivateKey: issuerKeys.privateKey,
    });
    const claims = decodeSessionJwtClaims(sessionJwt);
    assert.strictEqual(claims.sub, subject.subjectRef, 'session JWT should decode subject_ref');
    assert.ok(
        await verifySessionJwt(sessionJwt, {
            issuerPublicKey: issuerKeys.publicKey,
            now: 1775221000,
            expectedIssuer: 'issuer.example',
            expectedAudience: 'api.example.com',
            expectedSubjectPublicKey: subject.publicKey,
            expectedSubjectRef: subject.subjectRef,
            allowedAlgorithms: ['EdDSA'],
        }),
        'session JWT should verify',
    );

    const proof = createRequestProof({
        subject: createSubjectReference(subject.publicKey),
        request: {
            action: 'vault.read',
            issued_at: '2026-04-04T00:00:00.000Z',
            nonce: 'nonce_123',
        },
        privateKey: subject.privateKey,
    });
    assert.ok(
        verifyRequestProof(proof, {
            now: '2026-04-04T00:00:30.000Z',
            maxAgeMs: 60_000,
        }),
        'request proof should verify',
    );
    assert.strictEqual(proof.subject.subject_ref, subject.subjectRef, 'request proof should carry subject_ref');

    const rsaKeys = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const rs256Jwt = await createSessionJwt({
        issuer: 'issuer.example',
        subjectPublicKey: subject.publicKey,
        subjectRef: subject.subjectRef,
        audience: 'api.example.com',
        issuedAt: 1775219200,
        expiresAt: 1775222800,
        tokenId: 'jti_rs256',
        issuerPrivateKey: rsaKeys.privateKey,
        algorithm: 'RS256',
        keyId: 'kid_rs256_v1',
    });
    assert.ok(
        await verifySessionJwt(rs256Jwt, {
            issuerPublicKey: rsaKeys.publicKey,
            now: 1775221000,
            expectedIssuer: 'issuer.example',
            expectedAudience: 'api.example.com',
            expectedSubjectPublicKey: subject.publicKey,
            expectedSubjectRef: subject.subjectRef,
            allowedAlgorithms: ['RS256'],
        }),
        'session JWT should verify with RS256 when configured',
    );

    const eddsaJwk = await createIssuerJwk({
        algorithm: 'EdDSA',
        keyId: 'kid_eddsa_v1',
        publicKey: issuerKeys.publicKey,
    });
    assert.strictEqual(eddsaJwk.kid, 'kid_eddsa_v1');
    assert.strictEqual(eddsaJwk.alg, 'EdDSA');

    const jwks = await createIssuerJwks([
        {
            publicKey: issuerKeys.publicKey,
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
            now: 1775221000,
            expectedIssuer: 'issuer.example',
            expectedAudience: 'api.example.com',
            expectedSubjectPublicKey: subject.publicKey,
            expectedSubjectRef: subject.subjectRef,
            allowedAlgorithms: ['RS256'],
        }),
        'session JWT should verify against local JWKS',
    );

    const invalidClaimsJwt = await new SignJWT({
        cbio: [],
    })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'kid_rs256_v1' })
        .setIssuer('issuer.example')
        .setSubject(subject.subjectRef)
        .setAudience('api.example.com')
        .setIssuedAt(1_775_219_200)
        .setExpirationTime(1_775_222_800)
        .setJti('jti_invalid_claims')
        .sign(await importPKCS8(rsaKeys.privateKey, 'RS256'));
    assert.ok(
        !(await verifySessionJwtWithJwks(invalidClaimsJwt, {
            jwks,
            now: 1_775_221_000,
            expectedIssuer: 'issuer.example',
            expectedAudience: 'api.example.com',
            expectedSubjectPublicKey: subject.publicKey,
            expectedSubjectRef: subject.subjectRef,
            allowedAlgorithms: ['RS256'],
        })),
        'local JWKS verification should reject invalid session claims',
    );
}

async function run() {
    console.log('=== Unified Identity Acceptance ===');
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
