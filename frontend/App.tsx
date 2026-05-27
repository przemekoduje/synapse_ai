import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import MeetingScreen from './src/screens/MeetingScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import AnalysisResultScreen from './src/screens/AnalysisResultScreen';
import QuickNoteScreen from './src/screens/QuickNoteScreen';

// Definicja typów dla nawigacji
export type RootStackParamList = {
  Home: undefined;
  Meeting: undefined;
  Inspection: undefined;
  QuickNote: undefined;
  AnalysisResult: {
    analysis: any;
    transcription?: string;
    session_id: string;
    type: string;
    user_action_flags: object;
    trace_id: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0F172A',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Meeting" 
          component={MeetingScreen} 
          options={{ title: 'Nowe Spotkanie' }}
        />
        <Stack.Screen 
          name="Inspection" 
          component={InspectionScreen} 
          options={{ title: 'Inspekcja Wideo' }}
        />
        <Stack.Screen 
          name="QuickNote" 
          component={QuickNoteScreen} 
          options={{ 
            title: 'Szybka Notatka',
            headerStyle: { backgroundColor: '#F8FAFC' },
            headerTintColor: '#0F172A',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <Stack.Screen 
          name="AnalysisResult" 
          component={AnalysisResultScreen} 
          options={{ title: 'Weryfikacja Wyników' }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
