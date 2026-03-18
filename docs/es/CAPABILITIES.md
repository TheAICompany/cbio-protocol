# Gobernanza de capacidades CBIO

Este documento define la **Matriz de capacidades** y el modelo de gobernanza del protocolo Claw-biometric (CBIO). La gobernanza se logra mediante **Autonomía de identidad** y **Capacidades delegadas**.

---

## 1. Identidad sobre roles

En CBIO v1.0 no hay "roles" fijos (como Admin o User). Cada entidad es una **Identidad** de primera clase con sus propias claves criptográficas y vault.

Diferentes comportamientos operativos se logran delegando **Capacidades** específicas a un handle de identidad (CbioAgent).

| Entidad | Handle | Alcance | Responsabilidad principal |
| :--- | :--- | :--- | :--- |
| **Authority** | `CbioIdentity` | **Raíz** | Configuración raíz, emisión y auditoría global. |
| **Delegate** | `CbioAgent` | **Alcance** | Automatización, interacción de red y lógica específica de tareas. |

---

## 2. Matriz de capacidades

Un handle `CbioAgent` puede poseer dinámicamente las siguientes capacidades mediante certificado de protocolo firmado o asignación explícita en tiempo de ejecución:

| Capacidad | Método asociado | Nivel de riesgo | Descripción |
| :--- | :--- | :--- | :--- |
| `vault:fetch` | `fetchWithAuth()` | Bajo | Autenticar solicitudes de red usando secretos almacenados. |
| `vault:list` | `listSecretNames()` | Bajo | Enumerar nombres de secretos disponibles para este handle. |
| `vault:acquire` | `fetchAndAddSecret()` | Medio | Adquirir y provisionar nuevas credenciales de terceros. |
| `admin:secrets` | `agent.admin.xxx()` | Alto | Gestión completa de secretos (añadir/eliminar/actualizar). |
| `admin:issue` | `issueManagedAgent()` | **CRÍTICO** | Emitir y gobernar una nueva identidad hija. |

---

## 3. Bucles de gobernanza

El SDK proporciona mecanismos integrados para gestionar el ciclo de vida de estas capacidades delegadas.

### 3.1 Introspección (método `can`)
Los agentes pueden realizar **comprobaciones previas** para garantizar estabilidad y planificación determinista:
- `agent.can(capability)`: Devuelve `boolean`. Úsalo para adaptar estrategia antes de una acción.
- `agent.permissions`: Vista de solo lectura de los límites aplicados actualmente.

### 3.2 Sincronización automática con Authority
Si una identidad posee un certificado **IssuedAgentIdentity** válido, el SDK deriva automáticamente los permisos en tiempo de ejecución del campo `capabilities` del certificado. No se requiere sincronización manual entre la "concesión legal" (certificado) y la "protección física" (bloqueo en tiempo de ejecución).

### 3.3 Revocación
Una autoridad puede revocar permanentemente una identidad delegada en la red:
- `identity.admin.revokeManagedAgent(pubKey)`: Emite un **RevocationRecord** firmado.

---

## 4. Mejores prácticas

1. **Verificar antes de actuar**: Los agentes autónomos deben usar `can()` para consultar sus propios límites y proporcionar fallbacks elegantes.
2. **Privilegio mínimo**: Otorgar solo las capacidades atómicas requeridas para un subproceso específico.
3. **Visibilidad de auditoría**: Usar periódicamente `getManagedAgentCapabilities()` para auditar delegaciones activas.
