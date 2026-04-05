import * as crypto from 'node:crypto';

function createSubjectRef(publicKey) {
    return `cbio:v1:sub:ed25519:spki-b64u:${publicKey}`;
}

// --- Logic from src/crypto.ts ---
function generateIdentityKeys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });
    return {
        publicKey: publicKey.toString('base64url'),
        privateKey: privateKey.toString('base64url'),
    };
}

function createIdentity() {
    const { privateKey, publicKey } = generateIdentityKeys();
    return {
        privateKey,
        publicKey,
        subjectRef: createSubjectRef(publicKey),
    };
}

// --- Verification ---
console.log('Testing createIdentity()...');
try {
    const identity = createIdentity();
    console.log('Result:', identity);
    
    if (!identity.privateKey || !identity.publicKey || !identity.subjectRef) {
        throw new Error('Missing fields');
    }
    
    console.log('✅ Standalone verification passed!');
} catch (e) {
    console.error('❌ Standalone verification failed:', e);
    process.exit(1);
}
