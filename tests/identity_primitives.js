/**
 * Protocol primitives acceptance test.
 * Covers: deterministic public-key derivation.
 */

import { generateIdentityKeys, derivePublicKey } from '../dist/index.js';
import assert from 'node:assert';

async function testDerivePublicKey() {
    console.log('--- 1. derivePublicKey ---');
    const keys = generateIdentityKeys();
    if (!keys.publicKey) throw new Error('Missing public key');
    
    console.log('Public Key (base64url):', keys.publicKey);

    const derivedPublicKey = derivePublicKey(keys.privateKey);
    assert.strictEqual(derivedPublicKey, keys.publicKey, 'public key derivation must be deterministic');

    console.log('✅ derivePublicKey: deterministic and correctly derived');
}

async function run() {
    console.log('=== Protocol Primitives Acceptance ===');
    try {
        await testDerivePublicKey();
        console.log('\n=== All protocol primitives passed ===');
    } catch (e) {
        console.error('❌', e);
        process.exit(1);
    }
}

run();
