import React, { useEffect } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import { ThemeProvider } from './theme/ThemeContext';
import { IconProvider } from './icons/IconContext';
import CalendarSyncService from '../services/calendarSyncService';

import WelcomeScreen from './welcome/WelcomeScreen';
import LoginScreen from './auth/LoginScreen';
import AdminLoginScreen from './admin/AdminLoginScreen';
import AdminScreen from './admin/AdminScreen';
import LojinhaScreen from './lojinha/LojinhaScreen';
import AjudaScreen from './ajuda/AjudaScreen';

import CadUsuario from './usuario/cadUsuario';
import EditUsuario from './usuario/editUsuario';
import SelectUsuario from './usuario/selectUsuario';
import DellUser from './usuario/dellUser';

import CadWorkspace from './workspace/cadWorkspace';
import EditWorkspace from './workspace/editWorkspace';

import CadTarefa from './tarefa/cadTarefa';
import EditTarefa from './tarefa/editTarefa';
import VisualizaTarefa from './tarefa/visualizaTarefa';

import CadCategoria from './categoria/cadCategoria';

import CadComentario from './comentario/cadComentario';
import EditComentarioScreen from './comentario/EditComentarioScreen';

import HomeScreen from './home/HomeScreen';

import CardFavoritos from './cards/cardFavoritos';
import ConfiguracoesScreen from './configuracoes/ConfiguracoesScreen';
import CalendarioScreen from './calendario/CalendarioScreen';
import CardDashboard from './cards/CardDashboard';

export type RootStackParamList = {

  Welcome: undefined;
  Login: undefined;
  GoogleSignIn: undefined;
  AdminLogin: undefined;
  Admin: undefined;
  Lojinha: undefined;
  Ajuda: undefined;

  Home: undefined;

  CadastroUsuario: {
    googleData?: {
      nome: string;
      email: string;
      isFromGoogle: boolean;
    };
  } | undefined;
  EditUsuario: { userEmail: string };
  SelectUsuario: {
    onSelectUser?: (user: any) => void;
    multiSelect?: boolean;
    selectedUsers?: any[];
    excludeEmails?: string[];
    showActions?: boolean;
  };
  DellUser: { userEmail?: string };

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

  CadastroTarefa: undefined;
  EditTarefa: { id_tarefa: number };
  VisualizaTarefa: { id_tarefa?: number; titulo?: string };

  CadastroCategoria: undefined;

  CadComentario: { id_tarefa: number; titulo: string };
  EditComentario: { comentario: any; id_tarefa: number; titulo_tarefa: string };

  CardFavoritos: undefined;
  Configuracoes: undefined;
  Calendario: undefined;
  Dashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const Router: React.FC = () => {
  useEffect(() => {

    CalendarSyncService.initializeAutoSync();
  }, []);

  return (
    <ThemeProvider>
      <IconProvider>
        <NavigationContainer>
        <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2a2a2a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: '#1a1a1a',
          },
        }}>

        {}

        {}
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{
            headerShown: false,
          }}
        />

        {}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Login',
            headerBackTitleVisible: false,
          }}
        />

        <Stack.Screen
          name="AdminLogin"
          component={AdminLoginScreen}
          options={{
            title: 'Login Admin',
            headerBackTitleVisible: false,
          }}
        />

        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Lojinha"
          component={LojinhaScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Ajuda"
          component={AjudaScreen}
          options={{
            headerShown: false,
          }}
        />

        {}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />

        {}
        <Stack.Screen
          name="CadastroUsuario"
          component={CadUsuario}
          options={{
            title: 'Cadastro de Usuário',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="EditUsuario"
          component={EditUsuario}
          options={{
            title: 'Editar Usuário',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="SelectUsuario"
          component={SelectUsuario}
          options={{
            title: 'Selecionar Usuários',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="DellUser"
          component={DellUser}
          options={{
            title: 'Excluir Usuário',
            headerBackTitleVisible: false,
          }}
        />

        {}

        {}
        <Stack.Screen
          name="CadastroWorkspace"
          component={CadWorkspace}
          options={{
            title: 'Criar Workspace',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="EditWorkspace"
          component={EditWorkspace}
          options={{
            title: 'Editar Workspace',
            headerBackTitleVisible: false,
          }}
        />

        {}

        {}
        <Stack.Screen
          name="CadastroTarefa"
          component={CadTarefa}
          options={{
            title: 'Nova Tarefa',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="EditTarefa"
          component={EditTarefa}
          options={{
            title: 'Editar Tarefa',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="VisualizaTarefa"
          component={VisualizaTarefa}
          options={{
            title: 'Detalhes da Tarefa',
            headerBackTitleVisible: false,
          }}
        />

        {}

        {}
        <Stack.Screen
          name="CadastroCategoria"
          component={CadCategoria}
          options={{
            title: 'Nova Categoria',
            headerBackTitleVisible: false,
          }}
        />

        {}

        {}
        <Stack.Screen
          name="CadComentario"
          component={CadComentario}
          options={{
            headerShown: false,
          }}
        />

        {}
        <Stack.Screen
          name="EditComentario"
          component={EditComentarioScreen}
          options={{
            headerShown: false,
          }}
        />

        {}

        {}
        <Stack.Screen
          name="CardFavoritos"
          component={CardFavoritos}
          options={{
            title: 'Favoritos',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="Configuracoes"
          component={ConfiguracoesScreen}
          options={{
            title: 'Configurações',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="Calendario"
          component={CalendarioScreen}
          options={{
            title: 'Calendário',
            headerBackTitleVisible: false,
          }}
        />

        {}
        <Stack.Screen
          name="Dashboard"
          component={CardDashboard}
          options={{
            title: 'Métricas',
            headerBackTitleVisible: false,
          }}
        />

        </Stack.Navigator>
        </NavigationContainer>
      </IconProvider>
    </ThemeProvider>
  );
};

export default Router;
