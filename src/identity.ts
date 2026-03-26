/**
 * Protocol identity primitives. Pure math layer.
 */

import * as crypto from 'node:crypto';
import { generateIdentityKeys } from './crypto.js';

export interface RootAgentIdentity {
    privateKey: string;
    publicKey: string;
    identityId: string;
}

const ROOT_AGENT_ID_PREFIX = 'agt_';

export function deriveRootAgentId(rootPublicKey: string): string {
    const rawKey = Buffer.from(rootPublicKey, 'base64url');
    const hash = crypto.createHash('sha256').update(rawKey).digest('base64url');
    return ROOT_AGENT_ID_PREFIX + hash;
}

/**
 * Create a new root agent identity with a fresh keypair.
 * This is the unified entry point for identity generation in the protocol layer.
 */
export function createIdentity(): RootAgentIdentity {
    const { privateKey, publicKey } = generateIdentityKeys();
    const identityId = deriveRootAgentId(publicKey!);
    return {
        privateKey,
        publicKey: publicKey!,
        identityId,
    };
}
