# 📅 Integração com Google Calendar - Noiton 2.0

## Funcionalidades Implementadas

### ✅ O que foi adicionado:

1. **Solicitação automática de permissões** - Ao fazer login, o app solicita permissões para acessar o calendário
2. **Eventos automáticos de tarefas** - Quando uma tarefa é criada, um evento é criado no calendário
3. **Lembretes de prazo** - Para tarefas com data de vencimento, são criados:
   - Lembrete 1 dia antes do prazo
   - Evento no dia do prazo
4. **Suporte a tarefas recorrentes** - Eventos especiais para tarefas que se repetem
5. **Configurações de calendário** - Seção nas configurações para gerenciar permissões
6. **Módulo nativo Android** - Integração direta com o calendário do Android

## 🚀 Como funciona:

### No Login:
- Após login bem-sucedido, o app solicita permissões do calendário de forma amigável
- O usuário pode aceitar ou recusar (funcionalidade continuará funcionando sem calendário)

### Ao Criar Tarefa:
1. **Tarefa simples**: Cria evento "✅ Tarefa Criada: [Nome da Tarefa]"
2. **Tarefa com prazo**: 
   - Cria evento de criação
   - Cria lembrete 1 dia antes: "⏰ Lembrete: [Nome da Tarefa]"
   - Cria evento no dia do prazo: "📅 Prazo: [Nome da Tarefa]"
3. **Tarefa recorrente**: Cria evento especial: "🔄 Tarefa Recorrente: [Nome da Tarefa]"

### Ao Editar Tarefa:
- Se adicionou/alterou prazo: cria novos eventos de prazo
- Se tornou recorrente: cria evento de recorrência
- Eventos são marcados como "(Atualizada)" para diferenciação

## 🔧 Arquivos Modificados:

### Permissões Android:
- `android/app/src/main/AndroidManifest.xml` - Adicionadas permissões READ_CALENDAR e WRITE_CALENDAR

### Código Nativo Android:
- `android/app/src/main/java/com/noiton2_frontend/CalendarModule.java` - Módulo para integração direta
- `android/app/src/main/java/com/noiton2_frontend/CalendarPackage.java` - Package provider
- `android/app/src/main/java/com/noiton2_frontend/MainApplication.java` - Registro do módulo

### Serviços TypeScript:
- `services/googleCalendarService.ts` - Serviço principal de integração com calendário

### Componentes React Native:
- `components_ivan/auth/LoginScreen.tsx` - Solicitação de permissões no login
- `components_ivan/tarefa/cadTarefa.tsx` - Integração na criação de tarefas
- `components_ivan/tarefa/editTarefa.tsx` - Integração na edição de tarefas
- `components_ivan/configuracoes/ConfiguracoesScreen.tsx` - Configurações de calendário

## 📱 Como usar:

### Para o usuário:
1. **Login**: Aceite as permissões de calendário quando solicitadas
2. **Criar tarefa**: Tarefas serão automaticamente sincronizadas
3. **Configurações**: Acesse "Configurações" > "Google Calendar" para:
   - Verificar status das permissões
   - Reconfigurar permissões
   - Abrir o app de calendário

### Tipos de eventos criados:
- **✅ Tarefa Criada**: Confirmação de criação (30 minutos)
- **⏰ Lembrete**: 1 dia antes do prazo (30 minutos)
- **📅 Prazo**: No dia do vencimento (1 hora, às 9:00)
- **🔄 Tarefa Recorrente**: Notificação de configuração (30 minutos)

## 🛠️ Funcionamento Técnico:

### Estratégia de Fallback:
1. **Primeira tentativa**: Módulo nativo Android (integração direta)
2. **Segunda tentativa**: Intent do Android para abrir calendário
3. **Terceira tentativa**: URL scheme para Google Calendar

### Tratamento de Erros:
- Erros de calendário não interrompem o funcionamento do app
- Logs são registrados para debugging
- Usuário é informado apenas em casos críticos

## ⚠️ Observações Importantes:

1. **Compatibilidade**: Funciona apenas no Android (iOS requer implementação separada)
2. **Permissões**: Usuário pode revogar permissões nas configurações do Android
3. **Apps de Calendário**: Requer pelo menos um app de calendário instalado (Google Calendar recomendado)
4. **Duplicação**: Cada criação/edição gera novos eventos (não há sincronização bidirecional)

## 🔄 Próximos Passos Possíveis:

1. **Sincronização bidirecional**: Detectar mudanças no calendário
2. **Customização**: Permitir usuário escolher tipos de eventos
3. **iOS Support**: Implementar para iOS usando EventKit
4. **Filtros**: Permitir desabilitar tipos específicos de eventos
5. **Calendários específicos**: Permitir escolher qual calendário usar

## 🎯 Resultado:

A integração foi implementada de forma **não-invasiva** e **opcional**, mantendo a estabilidade do app existente. O usuário tem controle total sobre quando e como usar a funcionalidade, e o app continua funcionando normalmente mesmo sem as permissões de calendário.