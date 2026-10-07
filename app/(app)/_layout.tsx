import { Stack } from 'expo-router';
import { APP_STACK_OPTIONS } from '../../constants/layout';

export default function AppLayout() {
  return (
    <Stack screenOptions={APP_STACK_OPTIONS}>
      <Stack.Screen name="index" />
    </Stack>
  );
}