# Configuração do Google Sign-In

## Funcionalidade Implementada ✅

Foi implementado um sistema de login com Google usando módulos nativos do Android (Java) sem bibliotecas externas npm.

### Arquivos Criados:

1. **GoogleSignInModule.java** - Módulo nativo Android para autenticação Google
2. **GoogleSignInPackage.java** - Registro do módulo no React Native
3. **googleSignInService.ts** - Serviço TypeScript para interface com o módulo nativo
4. **LoginScreen.tsx** - Atualizada com botão "Entrar com Google"

### Funcionalidades:

- ✅ Botão de login com Google na tela principal
- ✅ Módulo nativo Java para Google Sign-In
- ✅ Interface TypeScript para comunicação com módulo nativo
- ✅ Design consistente com tema dark do app
- ✅ Tratamento de erros e feedback ao usuário

## Configuração Necessária (Para Ativar Completamente)

Para ativar completamente o Google Sign-In em produção, você precisa:

### 1. Configurar o Google Developer Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Sign-In API**
4. Vá em "Credenciais" → "Criar Credenciais" → "ID do cliente OAuth 2.0"
5. Selecione "Aplicativo Android"
6. Adicione o nome do pacote: `com.noiton2_frontend`
7. Adicione a impressão digital SHA-1 do seu certificado de depuração

### 2. Obter a Impressão Digital SHA-1

Para desenvolvimento, execute:
```bash
cd android
./gradlew signingReport
```

Para produção, use o certificado de release.

### 3. Baixar google-services.json

1. No Google Cloud Console, baixe o arquivo `google-services.json`
2. Substitua o arquivo placeholder em `android/app/google-services.json`

### 4. Configurar o Backend (Opcional)

Se você quiser integrar com seu backend existente:

1. Modifique a função `fazerLoginGoogle()` em `LoginScreen.tsx`
2. Envie o token do Google para seu backend
3. Seu backend deve validar o token e criar/autenticar o usuário

## Como Testar

1. Certifique-se de que as dependências estão instaladas:
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

2. Toque no botão "🔍 Entrar com Google" na tela de login

3. **Com configuração completa**: Abrirá o fluxo de autenticação do Google

4. **Sem configuração**: Mostrará erro informativo (esperado até configurar)

## Integração com Backend

Atual: O Google Sign-In retorna dados do usuário mas ainda não integra com seu backend de autenticação.

Para integrar:
1. Modifique `fazerLoginGoogle()` para enviar dados para seu endpoint de auth
2. Seu backend deve verificar o token Google e retornar JWT do seu sistema
3. Use o mesmo fluxo de permissões (`requestAllPermissions()`) após sucesso

## Arquitetura

```
LoginScreen.tsx
    ↓
googleSignInService.ts  
    ↓
GoogleSignInModule.java (React Native Bridge)
    ↓
Google Play Services (Android)
```

## Status

- ✅ **Implementação**: Completa
- ⏳ **Configuração Google**: Requer google-services.json válido  
- ⏳ **Integração Backend**: Opcional, pode ser adicionada facilmente

O sistema está pronto para funcionar assim que você configurar o Google Developer Console e substituir o arquivo google-services.json placeholder.