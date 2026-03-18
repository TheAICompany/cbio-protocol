# Governança de capacidades CBIO

Este documento define a **Matriz de capacidades** e o modelo de governança do protocolo Claw-biometric (CBIO). A governança é alcançada através de **Autonomia de identidade** e **Capacidades delegadas**.

---

## 1. Identidade sobre papéis

No CBIO v1.0 não há "papéis" fixos (como Admin ou User). Cada entidade é uma **Identidade** de primeira classe com suas próprias chaves criptográficas e vault.

Diferentes comportamentos operacionais são alcançados delegando **Capacidades** específicas a um handle de identidade (CbioAgent).

| Entidade | Handle | Escopo | Responsabilidade principal |
| :--- | :--- | :--- | :--- |
| **Authority** | `CbioIdentity` | **Raiz** | Configuração raiz, emissão e auditoria global. |
| **Delegate** | `CbioAgent` | **Escopo** | Automação, interação de rede e lógica específica de tarefas. |

---

## 2. Matriz de capacidades

Um handle `CbioAgent` pode possuir dinamicamente as seguintes capacidades via certificado de protocolo assinado ou atribuição explícita em tempo de execução:

| Capacidade | Método associado | Nível de risco | Descrição |
| :--- | :--- | :--- | :--- |
| `vault:fetch` | `fetchWithAuth()` | Baixo | Autenticar requisições de rede usando segredos armazenados. |
| `vault:list` | `listSecretNames()` | Baixo | Enumerar nomes de segredos disponíveis para este handle. |
| `vault:acquire` | `fetchAndAddSecret()` | Médio | Adquirir e provisionar novas credenciais de terceiros. |
| `admin:secrets` | `agent.admin.xxx()` | Alto | Gestão completa de segredos (adicionar/excluir/atualizar). |
| `admin:issue` | `issueManagedAgent()` | **CRÍTICO** | Emitir e governar uma nova identidade filha. |

---

## 3. Loops de governança

O SDK fornece mecanismos integrados para gerenciar o ciclo de vida dessas capacidades delegadas.

### 3.1 Introspecção (método `can`)
Agentes podem realizar **verificações prévias** para garantir estabilidade e planejamento determinístico:
- `agent.can(capability)`: Retorna `boolean`. Use para adaptar estratégia antes de uma ação.
- `agent.permissions`: Visão somente leitura dos limites aplicados atualmente.

### 3.2 Sincronização automática com Authority
Se uma identidade possui um certificado **IssuedAgentIdentity** válido, o SDK deriva automaticamente as permissões em tempo de execução do campo `capabilities` do certificado. Não é necessária sincronização manual entre a "concessão legal" (certificado) e a "guardança física" (bloqueio em tempo de execução).

### 3.3 Revogação
Uma autoridade pode revogar permanentemente uma identidade delegada na rede:
- `identity.admin.revokeManagedAgent(pubKey)`: Emite um **RevocationRecord** assinado.

---

## 4. Melhores práticas

1. **Verificar antes de agir**: Agentes autônomos devem usar `can()` para consultar seus próprios limites e fornecer fallbacks elegantes.
2. **Privilégio mínimo**: Conceder apenas as capacidades atômicas necessárias para um subprocesso específico.
3. **Visibilidade de auditoria**: Usar periodicamente `getManagedAgentCapabilities()` para auditar delegações ativas.
