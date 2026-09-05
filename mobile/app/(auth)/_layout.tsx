import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="setup" />
    </Stack>
  );
}
