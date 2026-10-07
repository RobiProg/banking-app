import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { STACK_DEFAULTS } from '../constants/layout';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={STACK_DEFAULTS}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}