import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

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

// Tela Principal
import HomeScreen from './home/HomeScreen';

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
};

const Stack = createStackNavigator<RootStackParamList>();

const Router: React.FC = () => {
  return (
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

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Router;
