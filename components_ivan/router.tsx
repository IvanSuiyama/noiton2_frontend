import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import { ThemeProvider } from './theme/ThemeContext';

// Telas de Autenticação e Boas-vindas
import WelcomeScreen from './welcome/WelcomeScreen';
import LoginScreen from './auth/LoginScreen';

// Telas de Usuário
import CadUsuario from './usuario/cadUsuario';
import EditUsuario from './usuario/editUsuario';
import SelectUsuario from './usuario/selectUsuario';
import DellUser from './usuario/dellUser';

// Telas de Workspace
import CadWorkspace from './workspace/cadWorkspace';
import EditWorkspace from './workspace/editWorkspace';

// Telas de Tarefa
import CadTarefa from './tarefa/cadTarefa';
import EditTarefa from './tarefa/editTarefa';
import VisualizaTarefa from './tarefa/visualizaTarefa';

// Telas de Categoria
import CadCategoria from './categoria/cadCategoria';

// Telas de Comentário
import CadComentario from './comentario/cadComentario';
import EditComentarioScreen from './comentario/EditComentarioScreen';

// Tela Principal
import HomeScreen from './home/HomeScreen';

// Novas Telas
import CardFavoritos from './cards/cardFavoritos';
import ConfiguracoesScreen from './configuracoes/ConfiguracoesScreen';
import CalendarioScreen from './calendario/CalendarioScreen';
import CardDashboard from './cards/CardDashboard';

// Definir tipos para as rotas
export type RootStackParamList = {
  // Navegação inicial e autenticação
  Welcome: undefined;
  Login: undefined;
  
  // Telas principais
  Home: undefined;
  
  // Usuários
  CadastroUsuario: undefined;
  EditUsuario: { userEmail: string };
  SelectUsuario: { 
    onSelectUser?: (user: any) => void;
    multiSelect?: boolean;
    selectedUsers?: any[];
    excludeEmails?: string[];
    showActions?: boolean;
  };
  DellUser: { userEmail?: string };
  
  // Workspaces
  CadastroWorkspace: undefined;
  EditWorkspace: { 
    workspaceName: string;
    userEmail: string;
  };
  SelectWorkspace: {
    userEmail?: string;
    onSelectWorkspace?: (workspace: any) => void;
    multiSelect?: boolean;
    selectedWorkspaces?: any[];
    showActions?: boolean;
  };
  
  // Tarefas
  CadastroTarefa: undefined;
  EditTarefa: { id_tarefa: number };
  VisualizaTarefa: { id_tarefa?: number; titulo?: string };
  
  // Categorias
  CadastroCategoria: undefined;
  
  // Comentários
  CadComentario: { id_tarefa: number; titulo: string };
  EditComentario: { comentario: any; id_tarefa: number; titulo_tarefa: string };
  
  // Novas telas
  CardFavoritos: undefined;
  Configuracoes: undefined;
  Calendario: undefined;
  Dashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const Router: React.FC = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2a2a2a', // Dark theme header
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: '#1a1a1a', // Dark theme background
          },
        }}>
        
        {/* ========== FLUXO DE AUTENTICAÇÃO ========== */}
        
        {/* Tela de Boas-vindas */}
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{
            headerShown: false,
          }}
        />

        {/* Tela de Login */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Login',
            headerBackTitleVisible: false,
          }}
        />

        {/* ========== TELA PRINCIPAL ========== */}
        
        {/* Home Screen */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />

        {/* ========== GESTÃO DE USUÁRIOS ========== */}
        
        {/* Cadastro de Usuário */}
        <Stack.Screen
          name="CadastroUsuario"
          component={CadUsuario}
          options={{
            title: 'Cadastro de Usuário',
            headerBackTitleVisible: false,
          }}
        />

        {/* Edição de Usuário */}
        <Stack.Screen
          name="EditUsuario"
          component={EditUsuario}
          options={{
            title: 'Editar Usuário',
            headerBackTitleVisible: false,
          }}
        />

        {/* Seleção de Usuários */}
        <Stack.Screen
          name="SelectUsuario"
          component={SelectUsuario}
          options={{
            title: 'Selecionar Usuários',
            headerBackTitleVisible: false,
          }}
        />

        {/* Exclusão de Usuário */}
        <Stack.Screen
          name="DellUser"
          component={DellUser}
          options={{
            title: 'Excluir Usuário',
            headerBackTitleVisible: false,
          }}
        />

        {/* ========== GESTÃO DE WORKSPACES ========== */}
        
        {/* Cadastro de Workspace */}
        <Stack.Screen
          name="CadastroWorkspace"
          component={CadWorkspace}
          options={{
            title: 'Criar Workspace',
            headerBackTitleVisible: false,
          }}
        />

        {/* Edição de Workspace */}
        <Stack.Screen
          name="EditWorkspace"
          component={EditWorkspace}
          options={{
            title: 'Editar Workspace',
            headerBackTitleVisible: false,
          }}
        />

        {/* ========== GESTÃO DE TAREFAS ========== */}
        
        {/* Cadastro de Tarefa */}
        <Stack.Screen
          name="CadastroTarefa"
          component={CadTarefa}
          options={{
            title: 'Nova Tarefa',
            headerBackTitleVisible: false,
          }}
        />

        {/* Edição de Tarefa */}
        <Stack.Screen
          name="EditTarefa"
          component={EditTarefa}
          options={{
            title: 'Editar Tarefa',
            headerBackTitleVisible: false,
          }}
        />

        {/* Visualização de Tarefa */}
        <Stack.Screen
          name="VisualizaTarefa"
          component={VisualizaTarefa}
          options={{
            title: 'Detalhes da Tarefa',
            headerBackTitleVisible: false,
          }}
        />

        {/* ========== GESTÃO DE CATEGORIAS ========== */}
        
        {/* Cadastro de Categoria */}
        <Stack.Screen
          name="CadastroCategoria"
          component={CadCategoria}
          options={{
            title: 'Nova Categoria',
            headerBackTitleVisible: false,
          }}
        />

        {/* ========== GESTÃO DE COMENTÁRIOS ========== */}
        
        {/* Comentários de Tarefa */}
        <Stack.Screen
          name="CadComentario"
          component={CadComentario}
          options={{
            headerShown: false, // Usando header customizado
          }}
        />

        {/* Editar Comentário */}
        <Stack.Screen
          name="EditComentario"
          component={EditComentarioScreen}
          options={{
            headerShown: false, // Usando header customizado
          }}
        />

        {/* ========== NOVAS FUNCIONALIDADES ========== */}
        
        {/* Tarefas Favoritas */}
        <Stack.Screen
          name="CardFavoritos"
          component={CardFavoritos}
          options={{
            title: 'Favoritos',
            headerBackTitleVisible: false,
          }}
        />

        {/* Configurações */}
        <Stack.Screen
          name="Configuracoes"
          component={ConfiguracoesScreen}
          options={{
            title: 'Configurações',
            headerBackTitleVisible: false,
          }}
        />

        {/* Calendário */}
        <Stack.Screen
          name="Calendario"
          component={CalendarioScreen}
          options={{
            title: 'Calendário',
            headerBackTitleVisible: false,
          }}
        />

        {/* Dashboard */}
        <Stack.Screen
          name="Dashboard"
          component={CardDashboard}
          options={{
            title: 'Dashboard',
            headerBackTitleVisible: false,
          }}
        />

        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default Router;
