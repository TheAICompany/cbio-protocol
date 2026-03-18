# Gouvernance des capacités CBIO

Ce document définit la **Matrice des capacités** et le modèle de gouvernance du protocole Claw-biometric (CBIO). La gouvernance est atteinte par **l'Autonomie d'identité** et les **Capacités déléguées**.

---

## 1. Identité plutôt que rôles

Dans CBIO v3.0, il n'y a pas de « rôles » fixes (comme Admin ou User). Chaque entité est une **Identité** de première classe avec ses propres clés cryptographiques et vault.

Différents comportements opérationnels sont atteints en déléguant des **Capacités** spécifiques à un handle d'identité (CbioAgent).

| Entité | Handle | Portée | Responsabilité principale |
| :--- | :--- | :--- | :--- |
| **Authority** | `CbioIdentity` | **Racine** | Configuration racine, émission et audit global. |
| **Delegate** | `CbioAgent` | **Portée** | Automatisation, interaction réseau et logique spécifique aux tâches. |

---

## 2. Matrice des capacités

Un handle `CbioAgent` peut posséder dynamiquement les capacités suivantes via certificat de protocole signé ou attribution explicite en temps d'exécution :

| Capacité | Méthode associée | Niveau de risque | Description |
| :--- | :--- | :--- | :--- |
| `vault:fetch` | `fetchWithAuth()` | Faible | Authentifier les requêtes réseau en utilisant les secrets stockés. |
| `vault:list` | `listSecretNames()` | Faible | Énumérer les noms de secrets disponibles pour ce handle. |
| `vault:acquire` | `fetchAndAddSecret()` | Moyen | Acquérir et provisionner de nouvelles credentials tierces. |
| `admin:secrets` | `agent.admin.xxx()` | Élevé | Gestion complète des secrets (ajouter/supprimer/mettre à jour). |
| `admin:issue` | `issueManagedAgent()` | **CRITIQUE** | Émettre et gouverner une nouvelle identité enfant. |

---

## 3. Boucles de gouvernance

Le SDK fournit des mécanismes intégrés pour gérer le cycle de vie de ces capacités déléguées.

### 3.1 Introspection (méthode `can`)
Les agents peuvent effectuer des **contrôles préalables** pour assurer la stabilité et une planification déterministe :
- `agent.can(capability)` : Retourne `boolean`. Utiliser pour adapter la stratégie avant une action.
- `agent.permissions` : Vue en lecture seule des limites actuellement appliquées.

### 3.2 Synchronisation automatique avec Authority
Si une identité possède un certificat **IssuedAgentIdentity** valide, le SDK dérive automatiquement les permissions en temps d'exécution du champ `capabilities` du certificat. Aucune synchronisation manuelle n'est requise entre la « concession légale » (certificat) et la « garde physique » (verrou d'exécution).

### 3.3 Révocation
Une autorité peut révoquer définitivement une identité déléguée sur le réseau :
- `identity.admin.revokeManagedAgent(pubKey)` : Émet un **RevocationRecord** signé.

---

## 4. Bonnes pratiques

1. **Vérifier avant d'agir** : Les agents autonomes doivent utiliser `can()` pour interroger leurs propres limites et fournir des replis élégants.
2. **Privilège minimum** : Accorder uniquement les capacités atomiques requises pour un sous-processus spécifique.
3. **Visibilité d'audit** : Utiliser périodiquement `getManagedAgentCapabilities()` pour auditer les délégations actives.
