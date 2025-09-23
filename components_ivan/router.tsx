import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import CadUsuario from './usuario/cadUsuario';

// Definir tipos para as rotas
export type RootStackParamList = {
  CadastroUsuario: undefined;
  // Adicione outras telas aqui futuramente
};

const Stack = createStackNavigator<RootStackParamList>();

const Router: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="CadastroUsuario"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#373b3f',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: '#2f3437',
          },
        }}>
        <Stack.Screen
          name="CadastroUsuario"
          component={CadUsuario}
          options={{
            title: 'Cadastro de Usuário',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Router;
