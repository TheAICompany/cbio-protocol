/**
 * Protocol primitives acceptance test.
 * Covers: deterministic subject identity derivation.
 */

import { generateIdentityKeys, deriveSubjectId } from '../dist/index.js';
import assert from 'node:assert';

async function testDeriveSubjectIdentity() {
    console.log('--- 1. deriveSubjectId ---');
    const keys = generateIdentityKeys();
    if (!keys.publicKey) throw new Error('Missing public key');
    
    console.log('Public Key (base64url):', keys.publicKey);
    
    const subjectId = deriveSubjectId(keys.publicKey);
    console.log('Derived Subject ID:', subjectId);
    
    assert.ok(subjectId.startsWith('sub_'), 'subject_id must use sub_ prefix');
    
    const subjectIdAgain = deriveSubjectId(keys.publicKey);
    assert.strictEqual(subjectId, subjectIdAgain, 'subject_id derivation must be deterministic');
    
    console.log('✅ deriveSubjectId: deterministic and correctly prefixed');
}

async function run() {
    console.log('=== Protocol Primitives Acceptance ===');
    try {
        await testDeriveSubjectIdentity();
        console.log('\n=== All protocol primitives passed ===');
    } catch (e) {
        console.error('❌', e);
        process.exit(1);
    }
}

run();
