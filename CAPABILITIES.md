# CBIO Capability Governance

This document defines the **Capability Matrix** and governance model for the Claw-biometric (CBIO) protocol. Governance is achieved through **Identity Autonomy** and **Delegated Capabilities**.

---

## 1. Identity over Roles

In CBIO v1.0, there are no fixed "Roles" (like Admin or User). Every entity is a first-class **Identity** with its own cryptographic keys and vault. 

Different operational behaviors are achieved by delegating specific **Capabilities** to an identity handle (CbioAgent).

| Entity | Handle | Scope | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Authority** | `CbioIdentity` | **Root** | Root configuration, issuance, and global audit. |
| **Delegate** | `CbioAgent` | **Scoped** | Automation, network interaction, and task-specific logic. |

---

## 2. The Capability Matrix

A `CbioAgent` handle dynamically possesses the following capabilities, which can be granted via a signed protocol certificate or explicit runtime assignment:

| Capability | Associated Method | Risk Level | Description |
| :--- | :--- | :--- | :--- |
| `vault:fetch` | `fetchWithAuth()` | Low | Authenticate network requests using stored secrets. |
| `vault:list` | `listSecretNames()` | Low | Enumerate secret names available to this handle. |
| `vault:acquire`| `fetchAndAddSecret()` | Medium | Acquire and provision new third-party credentials. |
| `admin:secrets`| `agent.admin.xxx()` | High | Full management of secrets (Add/Delete/Update). |
| `admin:issue`  | `issueManagedAgent()`| **CRITICAL** | Issue and govern a new child identity. |

---

## 3. Governance Loops

The SDK provides built-in mechanisms for managing the lifecycle of these delegated capabilities.

### 3.1 Introspection (`can` method)
Agents can perform **Pre-flight Checks** to ensure stability and deterministic planning:
- `agent.can(capability)`: Returns `boolean`. Use this to adapt strategy before an action.
- `agent.permissions`: Read-only view of the currently enforced limits.

### 3.2 Authority Auto-Sync
If an identity holds a valid **IssuedAgentIdentity** certificate, the SDK automatically derives runtime permissions from the certificate's `capabilities` field. No manual synchronization is required between the "Legal Grant" (certificate) and "Physical Guard" (runtime lock).

### 3.3 Revocation
An authority can permanently revoke a delegated identity across the network:
- `identity.admin.revokeManagedAgent(pubKey)`: Issues a signed **RevocationRecord**.

---

## 4. Best Practices

1. **Verify Before Action**: Autonomous agents should use `can()` to query their own boundaries and provide graceful fallbacks.
2. **Least Privilege**: Grant only the atomic capabilities required for a specific subprocess.
3. **Audit Visibility**: Periodically use `getManagedAgentCapabilities()` to audit active delegations.
