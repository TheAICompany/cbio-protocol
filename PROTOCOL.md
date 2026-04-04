# Claw-biometric Protocol

Normative specification for Claw-biometric (c-bio).

If any document in this repository conflicts with this file on protocol shape or
verification semantics, this file is the source of truth.

CBIO defines a unified identity protocol for both humans and agents. A relying
party recognizes one stable subject identifier format. Labels such as
`species` or `kind` are descriptive metadata only; they do not create separate
identity systems.

The protocol answers three questions:

1. who are you
2. have you authenticated recently
3. did you sign this exact request

These questions are represented as three protocol layers:

- stable identity
- time-bounded session JWT
- single-request proof

Stable identity may additionally include an optional parent link so a subject
can be traced upward to an earlier subject. This supports identity provenance,
not authorization.

Authorization remains a local decision of the receiving system.

## Cryptographic Primitives

The following are normative:

- generation of a new Ed25519 keypair
- derivation of a public key from a private key
- generation of a detached Ed25519 signature over a payload
- verification of a detached Ed25519 signature against a payload
- deterministic derivation of `subject_id` from a public key

### Subject identifier (`subject_id`)

`subject_id` is the canonical stable identifier for a protocol subject. It is
derived deterministically from the subject public key and conventionally
prefixed `sub_`. Distinct accepted public keys MUST map to distinct `subject_id`
values under this derivation.

Derivation procedure:

1. decode the public key bytes
2. compute the SHA-256 hash of those bytes
3. encode the hash using base64url without padding
4. prepend the literal prefix `sub_`

## Layer 1: Stable Identity

### Object: `IdentityDescriptor`

Required fields:

- `cbio_protocol`: string, fixed value `v1.0`
- `kind`: string, fixed value `identity_descriptor`
- `subject`: object
- `subject.subject_id`: string
- `subject.public_key`: string
- `subject.key_version`: integer

Optional fields:

- `subject.species`: string
- `subject.kind_label`: string
- `subject.parent`: object
- `subject.parent.subject_id`: string
- `subject.parent.public_key`: string
- `subject.parent.key_version`: integer
- `subject.parent_signature`: string
- `subject.metadata`: object whose keys and values are strings

`IdentityDescriptor` binds a stable identifier to a public key. It answers only
the question "who is this subject".

Normative notes:

- `species` and `kind_label` are descriptive labels only.
- `subject.parent`, when present, declares the direct parent subject from which
  this subject is derived for traceability purposes.
- `subject.parent_signature`, when present, is a detached signature produced by
  the parent subject over the unsigned `IdentityDescriptor` payload.
- A relying party MUST NOT treat `species` or `kind_label` as an authorization
  decision supplied by the protocol.
- Human and agent subjects share the same identifier format and verification
  rules.
- Parent linkage provides provenance only. Acceptance of any ancestry chain
  remains a local trust decision of the receiver.

## Layer 2: Session JWT

Layer 2 answers the question "has this subject authenticated recently".

The session token format for this layer is JWT. A valid CBIO session token MUST
be a signed JWT carrying at least the following claims:

- `iss`: string, issuer identifier
- `sub`: string, the authenticated `subject_id`
- `aud`: string or array of strings, intended audience
- `iat`: number, issued-at time in seconds since Unix epoch
- `exp`: number, expiration time in seconds since Unix epoch
- `jti`: string, unique token identifier

Optional claims:

- `sid`: string, issuer-defined session identifier
- `amr`: array of strings, authentication methods
- `cbio_species`: string
- `cbio_kind`: string
- `cbio`: object for issuer-defined CBIO extension fields

Normative notes:

- The presence of a valid session JWT means the issuer asserts that the subject
  authenticated recently enough for the token lifetime.
- Session acceptance, renewal, revocation, storage, and local conversion into
  cookies or framework sessions remain local concerns.
- Claim names other than the registered JWT claims above are application
  profile choices unless this specification later standardizes them.

### Issuer Keys

Session JWT verification depends on issuer key distribution.

Minimum conventions:

- `iss` identifies the JWT issuer
- if the JWT header contains `kid`, verifiers SHOULD use it to select the
  matching verification key
- an issuer SHOULD publish its active verification keys as a JWKS
- a verifier MAY obtain issuer keys by direct configuration or by fetching the
  issuer JWKS

This specification does not require a discovery protocol. It only requires that
the verifier and issuer share a consistent mapping from `iss` and optional
`kid` to the correct verification key.

## Layer 3: Request Proof

### Object: `RequestProof`

Required fields:

- `cbio_protocol`: string, fixed value `v1.0`
- `kind`: string, fixed value `request_proof`
- `subject`: object
- `subject.subject_id`: string
- `subject.public_key`: string
- `subject.key_version`: integer
- `request`: object
- `request.action`: string
- `request.issued_at`: string
- `request.nonce`: string
- `signature`: string

Optional fields:

- `request.resource`: string
- `request.session_id`: string
- `request.audience`: string
- `request.metadata`: object whose keys and values are strings

`RequestProof` answers the question "did this subject sign this exact request".

Normative notes:

- `action`, `resource`, `audience`, and `metadata` are opaque to the protocol.
- A receiver interprets those fields under local rules.
- `request.session_id`, when present, binds the request to a previously issued
  session JWT without changing local authorization semantics.

## Canonical Serialization

Signed objects defined in this specification use deterministic unsigned payload
serialization.

Rules:

1. remove the signature field before serialization
2. serialize fields in canonical schema order
3. omit fields that are `undefined`
4. preserve array order exactly
5. sort keys lexicographically for metadata objects
6. encode as UTF-8 JSON with no insignificant whitespace

Only the resulting byte sequence is normative.

## Verification Model

Verifiers validate key-to-identifier binding, session JWT integrity, and
request proof integrity.

For each embedded subject reference:

1. derive `subject_id` from the public key
2. compare it to the declared `subject_id`
3. reject on mismatch

For an `IdentityDescriptor`:

1. validate the embedded subject reference
2. if `subject.parent` is present, validate the embedded parent subject
   reference
3. if `subject.parent` is present, canonicalize the unsigned payload and verify
   `subject.parent_signature` using the declared parent public key
4. if `subject.parent` is absent, no parent-link verification step applies

For a session JWT:

1. verify the JWT signature using issuer key material
2. validate `iss`, `sub`, `aud`, `iat`, `exp`, and `jti`
3. enforce the token validity interval using `iat` and `exp`
4. treat `sub` as the authenticated `subject_id`

For a `RequestProof`:

1. validate the embedded subject reference
2. canonicalize the unsigned payload
3. verify the subject signature
4. check freshness inputs such as `issued_at` or `nonce` if the receiver
   requires them
5. if `request.session_id` is present, the receiver MAY require a valid matching
   session JWT

Successful verification means:

- the subject identity is internally consistent
- the signed payload has not been tampered with
- the relevant signer signed the exact payload presented
- when a parent link is present, the declared parent signed the child identity
  payload

Successful verification does not mean:

- the receiver must accept the subject
- the receiver must accept the session
- the receiver must accept the request
- the receiver must trust the declared parent chain
- the subject is authorized to perform any action under receiver policy

## Artifact and Lifecycle Expectations

Transport envelopes SHOULD expose protocol version, object kind, subject
identity, signed payload, signature, and relevant timestamps.

Replay windows, nonce retention, session storage, JWT issuance, rate limits,
quotas, and allow/deny policy are outside this specification.

## Stability and Conformance

Independent implementations MUST be able to reach the same verification result
for the same inputs. Therefore:

- object shapes and signature inputs must remain explicit and versioned
- `species`, `kind_label`, action names, audience values, and metadata are
  opaque bytes for protocol purposes
- conformance tests and test vectors belong to the protocol surface

If a behavior is not specified precisely enough for independent reproduction, it
is not yet a stable protocol fact.
