import * as crypto from 'node:crypto';

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

// --- Logic from src/identity.ts ---
const SUBJECT_ID_PREFIX = 'sub_';

function deriveSubjectId(publicKey) {
    const rawKey = Buffer.from(publicKey, 'base64url');
    const hash = crypto.createHash('sha256').update(rawKey).digest('base64url');
    return SUBJECT_ID_PREFIX + hash;
}

function createIdentity() {
    const { privateKey, publicKey } = generateIdentityKeys();
    const subjectId = deriveSubjectId(publicKey);
    return {
        privateKey,
        publicKey,
        subjectId,
        keyVersion: 1,
    };
}

// --- Verification ---
console.log('Testing createIdentity()...');
try {
    const identity = createIdentity();
    console.log('Result:', identity);
    
    if (!identity.privateKey || !identity.publicKey || !identity.subjectId) {
        throw new Error('Missing fields');
    }
    
    if (!identity.subjectId.startsWith('sub_')) {
        throw new Error('Invalid prefix');
    }
    
    const secondDerivation = deriveSubjectId(identity.publicKey);
    if (secondDerivation !== identity.subjectId) {
        throw new Error('Derivation mismatch');
    }
    
    console.log('✅ Standalone verification passed!');
} catch (e) {
    console.error('❌ Standalone verification failed:', e);
    process.exit(1);
}
