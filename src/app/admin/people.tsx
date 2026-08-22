import { Redirect } from 'expo-router';

/** People lives on school home (`/?tab=people`) so the office tab group stays put. */
export default function PeopleAdminScreen() {
  return <Redirect href="/?tab=people" />;
}
