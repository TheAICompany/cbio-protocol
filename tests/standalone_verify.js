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
const ROOT_AGENT_ID_PREFIX = 'agt_';

function deriveRootAgentId(rootPublicKey) {
    const rawKey = Buffer.from(rootPublicKey, 'base64url');
    const hash = crypto.createHash('sha256').update(rawKey).digest('base64url');
    return ROOT_AGENT_ID_PREFIX + hash;
}

function createIdentity() {
    const { privateKey, publicKey } = generateIdentityKeys();
    const identityId = deriveRootAgentId(publicKey);
    return {
        privateKey,
        publicKey,
        identityId,
    };
}

// --- Verification ---
console.log('Testing createIdentity()...');
try {
    const identity = createIdentity();
    console.log('Result:', identity);
    
    if (!identity.privateKey || !identity.publicKey || !identity.identityId) {
        throw new Error('Missing fields');
    }
    
    if (!identity.identityId.startsWith('agt_')) {
        throw new Error('Invalid prefix');
    }
    
    const secondDerivation = deriveRootAgentId(identity.publicKey);
    if (secondDerivation !== identity.identityId) {
        throw new Error('Derivation mismatch');
    }
    
    console.log('✅ Standalone verification passed!');
} catch (e) {
    console.error('❌ Standalone verification failed:', e);
    process.exit(1);
}
