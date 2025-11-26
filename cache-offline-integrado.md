# 📡 Sistema Cache Offline - Integrado com Backend

## 🚀 Visão Geral

O sistema de Cache Offline foi integrado ao esquema de temas e está ativo na **HomeScreen** como um componente invisível que monitora a conectividade Wi-Fi e gerencia operações offline automaticamente. **O sistema está configurado para funcionar com seu controller backend que processa operações em lote.**

## ✨ Funcionalidades Principais

### 📱 Monitoramento Automático
- ✅ **Componente invisível** na HomeScreen
- ✅ **Detecta perda de conexão Wi-Fi** automaticamente
- ✅ **Modal de "Reconectando"** quando conexão é perdida
- ✅ **Integrado com sistema de temas** (cores adaptáveis)
- ✅ **Sincronização automática** quando Wi-Fi retorna

### 💾 Armazenamento Offline
- ✅ **Salva operações pendentes** no banco local SQLite
- ✅ **Suporte para CREATE, UPDATE, DELETE**
- ✅ **Entidades**: tarefas, comentários, categorias, workspaces, etc.
- ✅ **Sincronização em lote** com backend via `/sync/offline`

### 🔄 Integração com Backend
- ✅ **Rota**: `POST /sync/offline`
- ✅ **Formato**: Array de operações em JSON
- ✅ **Controller**: `processarSyncOffline` já implementado
- ✅ **Processamento**: Lote único com relatório de resultados

## 🔧 Como Usar

### 1. **Monitoramento Automático**

O sistema já está **ativo na HomeScreen**! Não precisa fazer nada:

```tsx
// JÁ ESTÁ INTEGRADO na HomeScreen.tsx
<CacheOffline 
  onConnectivityChange={setIsConnected}
  showReconnectingMessage={true}
/>
```

### 2. **Hook para Salvar Operações**

Use o hook `useCacheOffline` em qualquer componente:

```tsx
import useCacheOffline from '../cache/useCacheOffline';

const MeuComponente = () => {
  const { saveTarefaOffline, syncNow } = useCacheOffline();

  const criarTarefa = async () => {
    const success = await saveTarefaOffline({
      titulo: 'Minha tarefa',
      descricao: 'Descrição da tarefa',
      id_workspace: 1,
      id_usuario: 1,
    });

    if (success) {
      console.log('Tarefa salva offline!');
    }
  };
};
```

### 3. **Funções Disponíveis**

```tsx
const {
  // 🎯 Gerais
  saveOfflineOperation,     // Salvar qualquer operação
  getPendingOperations,     // Ver operações pendentes
  syncNow,                  // Forçar sincronização

  // 📝 Tarefas
  saveTarefaOffline,        // Criar tarefa offline
  updateTarefaOffline,      // Atualizar tarefa offline
  deleteTarefaOffline,      // Deletar tarefa offline

  // 💬 Comentários
  saveComentarioOffline,    // Criar comentário offline
} = useCacheOffline();
```

## 🎨 Interface do Usuário

## 🔗 Fluxo de Sincronização com Backend

### 📤 Envio de Operações (SyncModule.java)
1. **Coleta** todas as operações pendentes do SQLite local
2. **Agrupa** em um array JSON único
3. **Envia** para `http://IP:3000/sync/offline` via POST
4. **Recebe** relatório de processamento do backend
5. **Limpa** operações locais se sincronização foi bem-sucedida

### 🏗️ Processamento no Backend (Controller)
```typescript
// Seu controller já implementado recebe:
const operacoes = req.body; // Array de operações

// Cada operação tem formato:
{
  op_id: "1732567890123",
  op_type: "CREATE" | "UPDATE" | "DELETE",
  entity: "tarefa" | "comentario" | "categoria" | etc,
  payload: { /* dados da operação */ }
}

// Controller processa cada operação e retorna:
{
  message: 'Sincronização processada',
  relatorio: {
    total_operacoes: 5,
    sucessos: 4,
    falhas: 1,
    por_entidade: { tarefa: { sucessos: 3, falhas: 0 } }
  },
  resultados: [/* array com resultado de cada operação */]
}
```

### 📱 Modal de Reconexão

Quando perde Wi-Fi, aparece automaticamente:

```
┌─────────────────────────────┐
│        📡 Sem Conexão       │
│                             │
│  Aguardando reconexão com   │
│       a internet...         │
│                             │
│      🔄 Reconectando        │
│                             │
│  📝 3 operação(ões) pend.   │
│                             │
│   [Continuar Offline]       │
└─────────────────────────────┘
```

### 🎨 Cores Adaptáveis

- **Claro/Escuro**: Cores automáticas do tema ativo
- **Trello/Noiton1.0**: Suporte completo aos temas premium
- **Bordas e texto**: Seguem padrão do sistema de temas

## 📋 Estados do Sistema

| Estado | Descrição | Ação |
|--------|-----------|------|
| 🟢 **Online** | Wi-Fi conectado | Sincronização automática |
| 🟡 **Desconectando** | Perdendo conexão | Preparar modo offline |
| 🔴 **Offline** | Sem Wi-Fi | Modal + operações locais |
| 🔄 **Reconectando** | Wi-Fi retornando | Sincronização pendente |
| ✅ **Sincronizado** | Operações enviadas | Banco local limpo |

## 💡 Exemplos Práticos

### Criar Tarefa Offline
```tsx
const handleCriarTarefa = async () => {
  const success = await saveTarefaOffline({
    titulo: 'Reunião cliente',
    descricao: 'Apresentar proposta',
    id_workspace: workspaceId,
    id_usuario: userId,
    prioridade: 'ALTA',
    data_limite: '2024-12-01',
  });

  if (success) {
    Alert.alert('📝 Tarefa salva offline!');
  }
};

// Gera operação no banco local:
{
  op_id: "1732567890123",
  op_type: "CREATE",
  entity: "tarefa",
  payload: {
    titulo: 'Reunião cliente',
    descricao: 'Apresentar proposta',
    id_workspace: 1,
    id_usuario: 1,
    prioridade: 'ALTA',
    data_limite: '2024-12-01'
  }
}
```

### Atualizar Status de Tarefa
```tsx
const marcarConcluida = async (tarefaId: number) => {
  await updateTarefaOffline(tarefaId, {
    status: 'CONCLUIDA',
  });
};

// Backend processa via processarOperacaoTarefa():
// await tarefaService.atualizarTarefa(data.id_tarefa, data);
```

### Adicionar Comentário
```tsx
const adicionarComentario = async () => {
  await saveComentarioOffline({
    conteudo: 'Tarefa em andamento...',
    id_tarefa: tarefaId,
    id_usuario: userId,
  });
};

// Backend processa via processarOperacaoComentario():
// await comentarioService.criarComentario(data);
```

## 🔧 Configurações Avançadas

### Personalizar Modal
```tsx
<CacheOffline 
  onConnectivityChange={(connected) => {
    console.log('Status:', connected ? 'Online' : 'Offline');
  }}
  showReconnectingMessage={false} // Desabilitar modal
/>
```

### Verificar Status
```tsx
const { getPendingOperations } = useCacheOffline();

const verificarPendentes = async () => {
  const pending = await getPendingOperations();
  console.log(`${pending.length} operações pendentes`);
};
```

## 🔧 Entidades Suportadas no Backend

Seu controller `processarSyncOffline` já suporta estas entidades:

| Entidade | Aliases | Operações | Service Backend |
|----------|---------|-----------|-----------------|
| **tarefa** | task | CREATE, UPDATE, DELETE | `tarefaService` |
| **comentario** | comment | CREATE, UPDATE, DELETE | `comentarioService` |
| **categoria** | category | CREATE, UPDATE, DELETE | `categoriaService` |
| **workspace** | - | CREATE, UPDATE, DELETE | `workspaceService` |
| **usuario** | user | CREATE | `usuarioService` |
| **denuncia** | report | CREATE | `denunciaService` |
| **anexo** | attachment | CREATE, DELETE | `anexoTarefaService` |

## 🚀 Sistema Completamente Integrado!

**🎯 O sistema está 100% funcional e integrado com seu backend:**

- ✅ **Frontend**: Componente invisível monitora Wi-Fi na HomeScreen
- ✅ **Mobile**: SyncModule.java envia operações em lote
- ✅ **Backend**: Controller `processarSyncOffline` processa array de operações
- ✅ **Database**: Operações são aplicadas nos services correspondentes
- ✅ **Feedback**: Relatório completo de sucessos/falhas retorna ao app

**O hook `useCacheOffline` pode ser usado em qualquer tela para salvar operações offline que serão automaticamente sincronizadas quando o Wi-Fi retornar!**