/**
 * Protocol identity primitives. Pure math layer.
 */

import * as crypto from 'node:crypto';

const ROOT_AGENT_ID_PREFIX = 'agt_';

export function deriveRootAgentId(rootPublicKey: string): string {
    const rawKey = Buffer.from(rootPublicKey, 'base64url');
    const hash = crypto.createHash('sha256').update(rawKey).digest('base64url');
    return ROOT_AGENT_ID_PREFIX + hash;
}
