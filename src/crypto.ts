/**
 * Protocol crypto primitives. Pure math layer.
 * Zero dependency on errors, vault, or runtime. Node crypto + buffer only.
 */

import { generateKeyPairSync, sign, verify, randomBytes, createPrivateKey, createPublicKey } from 'node:crypto';
import { Buffer } from 'node:buffer';

export interface KeyPair {
    publicKey?: string;
    privateKey: string;
}

export function generateIdentityKeys(): KeyPair {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });
    return {
        publicKey: publicKey.toString('base64url'),
        privateKey: privateKey.toString('base64url'),
    };
}

export function signPayload(privateKey: string, payload: string): string {
    const privKeyDer = Buffer.from(privateKey, 'base64url');
    const dataBuffer = Buffer.from(payload);
    const signature = sign(null, dataBuffer, {
        key: privKeyDer,
        format: 'der',
        type: 'pkcs8'
    });
    return signature.toString('base64url');
}

export function derivePublicKey(privateKey: string): string {
    const privKeyDer = Buffer.from(privateKey, 'base64url');
    const keyObject = createPrivateKey({
        key: privKeyDer,
        format: 'der',
        type: 'pkcs8'
    });
    const pubKeyObject = createPublicKey(keyObject);
    const pubKeyDer = pubKeyObject.export({
        type: 'spki',
        format: 'der'
    });
    return Buffer.from(pubKeyDer as Buffer).toString('base64url');
}

export function verifySignature(publicKey: string, signature: string, nonce: string): boolean {
    const publicKeyDer = Buffer.from(publicKey, 'base64url');
    const signatureBuffer = Buffer.from(signature, 'base64url');
    const dataBuffer = Buffer.from(nonce);
    return verify(
        null,
        dataBuffer,
        { key: publicKeyDer, format: 'der', type: 'spki' },
        signatureBuffer
    );
}

export function generateNonce(): string {
    return randomBytes(16).toString('base64url');
}
