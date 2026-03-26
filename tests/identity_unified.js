/**
 * Unified identity generation acceptance test.
 * Covers: createIdentity()
 */

import { createIdentity, deriveRootAgentId } from '../dist/index.js';
import assert from 'node:assert';

async function testCreateIdentity() {
    console.log('--- 1. testCreateIdentity ---');
    const identity = createIdentity();
    
    assert.ok(identity.privateKey, 'identity must have a privateKey');
    assert.ok(identity.publicKey, 'identity must have a publicKey');
    assert.ok(identity.identityId, 'identity must have an identityId');
    
    console.log('Identity ID:', identity.identityId);
    assert.ok(identity.identityId.startsWith('agt_'), 'identityId must use agt_ prefix');
    
    const derivedId = deriveRootAgentId(identity.publicKey);
    assert.strictEqual(identity.identityId, derivedId, 'identityId must match derivedId from publicKey');
    
    console.log('✅ createIdentity: successful and consistent');
}

async function run() {
    console.log('=== Unified Identity Acceptance ===');
    try {
        await testCreateIdentity();
        console.log('\n=== All unified identity tests passed ===');
    } catch (e) {
        console.error('❌', e);
        process.exit(1);
    }
}

run();
