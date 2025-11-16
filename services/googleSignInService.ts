import { NativeModules } from 'react-native';

interface GoogleSignInModule {
  signIn(): Promise<{
    success: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      photoUrl?: string;
    };
    error?: string;
  }>;
  
  signOut(): Promise<boolean>;
  
  getCurrentUser(): Promise<{
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
  } | null>;
}

const { GoogleSignInModule } = NativeModules as { GoogleSignInModule: GoogleSignInModule };

class GoogleSignInService {
  /**
   * Inicia o processo de login com o Google
   */
  async signIn() {
    try {
      const result = await GoogleSignInModule.signIn();
      return result;
    } catch (error) {
      console.error('Erro no Google Sign-In:', error);
      return {
        success: false,
        error: 'Erro ao fazer login com Google'
      };
    }
  }

  /**
   * Faz logout do Google
   */
  async signOut(): Promise<boolean> {
    try {
      return await GoogleSignInModule.signOut();
    } catch (error) {
      console.error('Erro no Google Sign-Out:', error);
      return false;
    }
  }

  /**
   * Obtém o usuário atualmente logado
   */
  async getCurrentUser() {
    try {
      return await GoogleSignInModule.getCurrentUser();
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  /**
   * Verifica se o usuário está logado no Google
   */
  async isSignedIn(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch (error) {
      return false;
    }
  }
}

export default new GoogleSignInService();