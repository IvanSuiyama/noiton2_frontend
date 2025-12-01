/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Suprimir warnings específicos que não afetam a funcionalidade
if (__DEV__) {
  const ignoreWarns = [
    'Excessive number of pending callbacks',
    'startAnimatingNode',
    'NativeAnimatedModule',
    'new NativeEventEmitter',
    'addListener` method',
    'removeListeners` method'
  ];
  
  const oldConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (ignoreWarns.some(warning => message.includes(warning))) {
      return;
    }
    oldConsoleWarn(...args);
  };
}

AppRegistry.registerComponent(appName, () => App);
