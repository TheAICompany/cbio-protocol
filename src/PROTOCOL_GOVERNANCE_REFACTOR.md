# Claw-biometric Protocol Governance Refactor

This note explains why the protocol needs a governance-layer refactor and what
shape that refactor should take.

It is intentionally not just an implementation checklist. The goal is to make
the correct model explicit so that future code changes stay aligned with the
actual protocol direction.

## The Correct Model

Claw-biometric should be modeled as an identity-first system.

That means:

- a root authority exists
- the root authority is itself an agent identity
- the root authority has no parent
- the root authority can issue child agent identities
- each child agent is a first-class identity from birth
- each identity is expected to have its own vault
- governance is about relationships between identities, not role handles over
  one shared vault

In plain language:

first there is an identity, then there is that identity's bag.

Not:

first there is a bag, then there are multiple roles touching the same bag.

## Why The Current Protocol Is Not Enough

The current protocol has solid identity primitives:

- key generation
- public key derivation
- deterministic agent id derivation
- possession proofs
- sealed vault transport

Those primitives are still correct and should remain the mathematical base.

But the current protocol is centered on proving that a key corresponds to an
identity. It is not centered on proving governed identity relationships.

Today the protocol can answer:

- what public key corresponds to this identity?
- can this signer prove possession of the matching private key?

It cannot yet answer, in a canonical way:

- who issued this agent identity?
- what authority relationship exists between parent and child?
- is this delegation still valid?
- has this identity been revoked or superseded?
- what chain of authority should a verifier trust?

That gap matters because the correct model is not just isolated identities. It
is a governed identity tree, and later possibly a governed identity graph.

## Tree First, Graph Later

The simplest correct near-term mental model is an authority tree:

- the root agent has no parent
- every non-root agent has a parent authority
- authority flows through issuance and delegation

Long term, the protocol may evolve into an authority graph if it supports:

- multi-party issuance
- overlapping authorities
- cross-delegation
- multisig-style governance

But the first protocol refactor should target the tree model cleanly.

## What Stays

These primitives remain the canonical base layer:

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(rootPublicKey)`

These are not the problem. They are the cryptographic foundation.

## What Must Change

### 1. The protocol center of gravity

The protocol should stop being organized primarily around a single exported
identity package and a local runtime story.

It should be organized around:

- identity primitives
- governance objects
- verification rules for authority relationships

### 2. Governance must become protocol-visible

The protocol needs canonical or near-canonical objects for:

- issued agent identities
- authority relationships
- delegation
- revocation
- authority chain validation

Without these, the runtime can simulate the right model, but the protocol
cannot assert it across implementations.

### 3. Runtime storage conventions must not masquerade as protocol facts

Concepts like child secret-name prefixes, vault filenames, or parent-vault
storage tricks are runtime details.

They may be useful implementation choices, but they are not protocol objects.

The protocol should talk about:

- public identities
- signatures
- issuer relationships
- capability scope
- time bounds
- validity and revocation

Not:

- local secret names
- internal storage prefixes
- filesystem naming conventions

## Refactor Direction

The recommended direction is:

### Keep as canonical base

- core crypto primitives
- deterministic identity derivation
- possession proof

### Reframe as non-protocol runtime helper

- sealed vault blob helpers

Sealed vault transport may still be useful for operational portability, but it
must not be mistaken for the protocol model.

### Add as governance-layer objects

- `AuthorityIdentity`
- `IssuedAgentIdentity`
- `DelegationCertificate`
- `RevocationRecord`
- `AuthorityChain`

These may begin as experimental protocol objects, but the protocol should
clearly state that this is the direction of travel.

## Verification Goal

After the refactor, the protocol should be able to prove not only:

"this signer holds the private key for this identity"

but also:

"this identity was issued by this authority, under these conditions, and is
still valid according to this authority chain."

That is the shift from identity proof to governed identity proof.

## Implementation Reading Guide

If you are refactoring the protocol module, use this order:

1. Preserve the mathematical primitives.
2. Separate runtime conventions from protocol commitments.
3. Introduce governance objects as explicit protocol types.
4. Define canonical serialization and signature payload rules.
5. Define verification rules before expanding runtime helpers.
6. Only then wire runtime issuance and recovery flows onto the new objects.

## Non-Goal

The goal is not to defend the current runtime API shape.

The goal is to make the protocol faithfully represent the correct model:

- every agent is a first-class identity
- authority relationships are explicit
- governance is verifiable
- runtime is an implementation layer over those facts
