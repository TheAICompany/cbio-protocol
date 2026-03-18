/**
 * Protocol primitives acceptance test.
 * Covers: deterministic root identity derivation.
 */

import { generateIdentityKeys, deriveRootAgentId } from '../dist/index.js';
import assert from 'node:assert';

async function testDeriveRootIdentity() {
    console.log('--- 1. deriveRootAgentId ---');
    const keys = generateIdentityKeys();
    if (!keys.publicKey) throw new Error('Missing public key');
    
    console.log('Public Key (base64url):', keys.publicKey);
    
    const rootId = deriveRootAgentId(keys.publicKey);
    console.log('Derived Root Agent ID:', rootId);
    
    assert.ok(rootId.startsWith('agt_'), 'root_agent_id must use agt_ prefix');
    
    const rootIdAgain = deriveRootAgentId(keys.publicKey);
    assert.strictEqual(rootId, rootIdAgain, 'root_agent_id derivation must be deterministic');
    
    console.log('✅ deriveRootAgentId: deterministic and correctly prefixed');
}

async function run() {
    console.log('=== Protocol Primitives Acceptance ===');
    try {
        await testDeriveRootIdentity();
        console.log('\n=== All protocol primitives passed ===');
    } catch (e) {
        console.error('❌', e);
        process.exit(1);
    }
}

run();
