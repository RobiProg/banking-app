import { Stack } from 'expo-router';
import { AUTH_STACK_OPTIONS } from '../../constants/layout';

export default function AuthLayout() {
  return (
    <Stack screenOptions={AUTH_STACK_OPTIONS}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}