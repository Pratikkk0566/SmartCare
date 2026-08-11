import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors} from '../theme/colors';
import {shadows} from '../theme/shadows';
import {HomeIcon, InvoiceIcon, InvestigationNavIcon, ProfileIcon, StethoscopeIcon} from '../assets/icons/Icons';
import {useApp} from '../context/AppContext';

// Onboarding
import SplashScreen          from '../screens/Onboarding/SplashScreen';
import WelcomeScreen         from '../screens/Onboarding/WelcomeScreen';
import LanguageSelectScreen  from '../screens/Onboarding/LanguageSelectScreen';
import PhoneLoginScreen      from '../screens/Onboarding/PhoneLoginScreen';
import PhoneNumberEntry      from '../screens/Onboarding/PhoneNumberEntry';
import AadhaarLoginScreen    from '../screens/Onboarding/AadhaarLoginScreen';
import RegisterScreen        from '../screens/Onboarding/RegisterScreen';
import OTPVerificationScreen from '../screens/Onboarding/OTPVerificationScreen';
import AccountCreatedScreen  from '../screens/Onboarding/AccountCreatedScreen';

// Main tabs
import HomeScreen           from '../screens/Home/HomeScreen';
import InvoicesScreen       from '../screens/Invoices/InvoicesScreen';
import InvestigationsScreen from '../screens/Investigations/InvestigationsScreen';
import ProfileScreen        from '../screens/Profile/ProfileScreen';

// Ai Assistant - Full Ai
import AIAssistantScreen from '../screens/Assistant/AIAssistantScreen';

// Appointments — full booking flow
import AppointmentsScreen       from '../screens/Appointments/AppointmentsScreen';
import DoctorSearchScreen       from '../screens/Appointments/DoctorSearchScreen';
import DoctorProfileScreen      from '../screens/Appointments/DoctorProfileScreen';
import BookingSlotScreen        from '../screens/Appointments/BookingSlotScreen';
import BookingConfirmScreen     from '../screens/Appointments/BookingConfirmScreen';
import AppointmentSuccessScreen from '../screens/Appointments/AppointmentSuccessScreen';

// Medicine
import MedicineScheduleScreen from '../screens/Medicine/MedicineScheduleScreen';
import PrescriptionsScreen    from '../screens/Medicine/PrescriptionsScreen';
import AboutMedicineScreen    from '../screens/Medicine/AboutMedicineScreen';
import RestockMedicineScreen  from '../screens/Medicine/RestockMedicineScreen';

// Investigations
import InvestigationReportScreen  from '../screens/Investigations/InvestigationReportScreen';
import InvestigationRequestScreen from '../screens/Investigations/InvestigationRequestScreen';
import SelectHospitalScreen       from '../screens/Investigations/SelectHospitalScreen';
import SelectDateTimeScreen       from '../screens/Investigations/SelectDateTimeScreen';
import BookingConfirmedScreen     from '../screens/Investigations/BookingConfirmedScreen';

// Profile & security
import AppLockSetupScreen        from '../screens/Security/AppLockSetupScreen';
import PINSetupScreen            from '../screens/Security/PINSetupScreen';
import AppLockScreen             from '../screens/Security/AppLockScreen';
import NotificationsScreen       from '../screens/Notifications/NotificationsScreen';
import PersonalInformationScreen from '../screens/Profile/PersonalInformationScreen';
import SettingsScreen            from '../screens/Profile/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabBadge({count}) {
  if (!count || count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const TAB_LABELS = {
  Home:           'Home',
  Invoices:       'Records',
  Investigations: 'Investigation',
  Profile:        'Profile',
};

const CustomTabBar = React.memo(function CustomTabBar({state, descriptors, navigation}) {
  const {unreadCount} = useApp();
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;
        const isFAB     = route.name === 'FAB';

        if (isFAB) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.fabWrapper}
              onPress={() => navigation.navigate('Appointments')}
              activeOpacity={0.85}>
              <View style={styles.fab}>
                <StethoscopeIcon size={28} color="#fff" />
              </View>
              <Text style={styles.fabLabel}>Appt</Text>
            </TouchableOpacity>
          );
        }

        const Icon      = options.tabBarIcon;
        const label     = TAB_LABELS[route.name] ?? route.name;
        const showBadge = route.name === 'Home' && unreadCount > 0;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              {Icon && <Icon size={26} color={isFocused ? colors.primary : colors.textMuted} />}
              {showBadge && <TabBadge count={unreadCount} />}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home"           component={HomeScreen}           options={{tabBarIcon: HomeIcon}} />
      <Tab.Screen name="Invoices"       component={InvoicesScreen}       options={{tabBarIcon: InvoiceIcon}} />
      <Tab.Screen name="FAB"            component={() => null}           options={{tabBarLabel: ''}} />
      <Tab.Screen name="Investigations" component={InvestigationsScreen} options={{tabBarIcon: InvestigationNavIcon}} />
      <Tab.Screen name="Profile"        component={ProfileScreen}        options={{tabBarIcon: ProfileIcon}} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const {appReady, isLoggedIn} = useApp();

  if (!appReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false, animationDuration: 200}} initialRouteName="Splash">

        {/* Onboarding */}
        <Stack.Screen name="Splash"           component={SplashScreen} />
        <Stack.Screen name="Welcome"          component={WelcomeScreen} />
        <Stack.Screen name="LanguageSelect"   component={LanguageSelectScreen} />
        <Stack.Screen name="PhoneLogin"       component={PhoneLoginScreen} />
        <Stack.Screen name="PhoneNumberEntry" component={PhoneNumberEntry} />
        <Stack.Screen name="AadhaarLogin"     component={AadhaarLoginScreen} />
        <Stack.Screen name="Register"         component={RegisterScreen} />
        <Stack.Screen name="OTPVerification"  component={OTPVerificationScreen} />
        <Stack.Screen name="AccountCreated"   component={AccountCreatedScreen} />

        {/* App */}
        <Stack.Screen name="MainTabs"      component={MainTabs} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AIAssistant"   component={AIAssistantScreen}/>

        {/* Appointment booking flow */}
        <Stack.Screen name="Appointments"       component={AppointmentsScreen} />
        <Stack.Screen name="DoctorSearch"       component={DoctorSearchScreen} />
        <Stack.Screen name="DoctorProfile"      component={DoctorProfileScreen} />
        <Stack.Screen name="BookingSlot"        component={BookingSlotScreen} />
        <Stack.Screen name="BookingConfirm"     component={BookingConfirmScreen} />
        <Stack.Screen name="AppointmentSuccess" component={AppointmentSuccessScreen} />

        {/* Medicine */}
        <Stack.Screen name="MedicineSchedule" component={MedicineScheduleScreen} />
        <Stack.Screen name="Prescriptions"    component={PrescriptionsScreen} />
        <Stack.Screen name="AboutMedicine"    component={AboutMedicineScreen} />
        <Stack.Screen name="RestockMedicine"  component={RestockMedicineScreen} />

        {/* Investigations */}
        <Stack.Screen name="InvestigationReport"  component={InvestigationReportScreen} />
        <Stack.Screen name="InvestigationRequest" component={InvestigationRequestScreen} />
        <Stack.Screen name="SelectHospital"       component={SelectHospitalScreen} />
        <Stack.Screen name="SelectDateTime"       component={SelectDateTimeScreen} />
        <Stack.Screen name="BookingConfirmed"     component={BookingConfirmedScreen} />

        {/* Profile & security */}
        <Stack.Screen name="AppLockSetup"        component={AppLockSetupScreen} />
        <Stack.Screen name="PINSetup"            component={PINSetupScreen} />
        <Stack.Screen name="AppLock"             component={AppLockScreen} />
        <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
        <Stack.Screen name="Settings"            component={SettingsScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 50 : 20,
    paddingTop: 10,
    ...shadows.sm,
  },
  tabItem:         {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2},
  iconWrap:        {position: 'relative'},
  badge:           {position: 'absolute', top: -6, right: -8, backgroundColor: colors.error, borderRadius: 9999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.surface},
  badgeText:       {color: '#fff', fontSize: 10, fontWeight: '700'},
  tabLabel:        {fontSize: 10, fontWeight: '500', color: colors.textMuted, marginTop: 2},
  tabLabelFocused: {color: colors.primary, fontWeight: '700'},
  fabWrapper:      {flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -20},
  fab:             {width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.lg},
  fabLabel:        {fontSize: 10, color: colors.primary, marginTop: 4, fontWeight: '600'},
  splash:          {flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'},
});
