import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "../store/authStore";
import { usePresenceStore } from "../store/presenceStore";
import { useAlertStore } from "../store/alertStore";
import { AlertsScreen } from "../screens/AlertsScreen";
import { CameraScreen } from "../screens/CameraScreen";
import { HealthHistoryScreen } from "../screens/HealthHistoryScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PatientProfileScreen } from "../screens/PatientProfileScreen";
import { PatientsListScreen } from "../screens/PatientsListScreen";

export type PatientsStackParamList = {
  PatientsList:   undefined;
  PatientProfile: { patientId: string };
  HealthHistory:  { patientId: string };
};

const PatientsStack = createNativeStackNavigator<PatientsStackParamList>();
const Tab = createBottomTabNavigator();

function PatientsNavigator() {
  return (
    <PatientsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#4A90D9" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <PatientsStack.Screen name="PatientsList"   component={PatientsListScreen}   options={{ title: "Patients" }} />
      <PatientsStack.Screen name="PatientProfile" component={PatientProfileScreen} options={{ title: "Patient Profile" }} />
      <PatientsStack.Screen name="HealthHistory"  component={HealthHistoryScreen}  options={{ title: "Health History" }} />
    </PatientsStack.Navigator>
  );
}

function AlertsTabIcon({ color }: { color: string }) {
  const unread = useAlertStore((s) => s.alerts.filter((a) => !a.dismissed).length);
  return (
    <View>
      <Text style={{ fontSize: 22, color }}>🔔</Text>
      {unread > 0 && (
        <View style={{
          position: "absolute", top: -4, right: -8,
          backgroundColor: "#c62828", borderRadius: 8,
          minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#4A90D9" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#4A90D9",
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tab.Screen
        name="Patients"
        component={PatientsNavigator}
        options={{
          headerShown: false,
          tabBarLabel: "Patients",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          title: "Camera Monitor",
          tabBarLabel: "Camera",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: "Alerts",
          tabBarLabel: "Alerts",
          tabBarIcon: (props) => <AlertsTabIcon {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, isLoading, hydrate } = useAuthStore();
  const { connect, disconnect } = usePresenceStore();

  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    if (user) connect();
    else disconnect();
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}
