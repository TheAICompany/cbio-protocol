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

For `IdentityDescriptor` and `RequestProof`, `public_key` denotes the subject
verification key encoded as base64url over SPKI DER bytes.

### Subject Reference (`subject_ref`)

`subject_ref` is the self-describing exchange form of a subject public key.

Version `v1` uses the following string format:

```text
cbio:v1:sub:ed25519:spki-b64u:<key>
```

Where:

- `cbio` is the fixed protocol prefix
- `v1` is the protocol version
- `sub` identifies the subject reference type
- `ed25519` is the key algorithm
- `spki-b64u` is the key encoding
- `<key>` is the subject public key encoded as base64url over SPKI DER bytes

Normative notes:

- `subject_ref` is a portable wrapper around `public_key`, not a separate
  identity system.
- A verifier that understands `subject_ref` MUST be able to recover the exact
  `public_key` value from it.
- A protocol object MAY carry `public_key`, `subject_ref`, or both, as long as
  the representation used is sufficient for verification and any duplicated
  values are consistent.

## Layer 1: Stable Identity

### Object: `IdentityDescriptor`

Required fields:

- `cbio_protocol`: string, fixed value `v1.0`
- `kind`: string, fixed value `identity_descriptor`
- `subject`: object
- `subject.public_key`: string

Optional fields:

- `subject.subject_ref`: string
- `subject.species`: string
- `subject.kind_label`: string
- `subject.parent`: object
- `subject.parent.subject_ref`: string
- `subject.parent.public_key`: string
- `subject.parent_signature`: string
- `subject.metadata`: object whose keys and values are strings

`IdentityDescriptor` binds a stable identifier to a public key. It answers only
the question "who is this subject".

Normative notes:

- `species` and `kind_label` are descriptive labels only.
- `subject.subject_ref`, when present, MUST decode to the same public key as
  `subject.public_key`.
- `subject.parent`, when present, declares the direct parent subject from which
  this subject is derived for traceability purposes.
- `subject.parent.subject_ref`, when present, MUST decode to the same public key
  as `subject.parent.public_key`.
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
- `sub`: string, the authenticated subject reference or subject public key
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
- `sub` SHOULD use `subject_ref` when the issuer wants a self-describing subject
  string. A deployment MAY use raw `public_key` instead if both sides already
  agree on the field semantics.
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
- if a verifier is configured with a direct issuer public key instead of JWKS,
  that key SHOULD be supplied in a format acceptable to the verifier runtime,
  such as PEM/SPKI text for RSA or base64url SPKI DER for Ed25519

This specification does not require a discovery protocol. It only requires that
the verifier and issuer share a consistent mapping from `iss` and optional
`kid` to the correct verification key.

## Layer 3: Request Proof

### Object: `RequestProof`

Required fields:

- `cbio_protocol`: string, fixed value `v1.0`
- `kind`: string, fixed value `request_proof`
- `subject`: object
- `subject.public_key`: string
- `request`: object
- `request.action`: string
- `request.issued_at`: string
- `request.nonce`: string
- `signature`: string

Optional fields:

- `subject.subject_ref`: string
- `request.resource`: string
- `request.session_id`: string
- `request.audience`: string
- `request.metadata`: object whose keys and values are strings

`RequestProof` answers the question "did this subject sign this exact request".

Normative notes:

- `action`, `resource`, `audience`, and `metadata` are opaque to the protocol.
- `subject.subject_ref`, when present, MUST decode to the same public key as
  `subject.public_key`.
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

1. validate that `public_key` is syntactically well-formed key material
2. if `subject_ref` is present, parse it and compare the embedded key material
   to `public_key`
3. validate the declared subject key material
4. reject on mismatch or invalid encoding

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
4. if `sub` is a `subject_ref`, parse it and recover the authenticated public
   key
5. otherwise treat `sub` as the authenticated subject public key

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
