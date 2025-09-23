import React from 'react';
import {StatusBar} from 'react-native';
import Router from './components_ivan/router';

function App(): JSX.Element {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#373b3f" />
      <Router />
    </>
  );
}

export default App;
