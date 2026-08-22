import { Redirect } from 'expo-router';

/** Alerts live on the last tab of Messages. Detail routes stay at /notifications/{id}. */
export default function NotificationsScreen() {
  return <Redirect href="/messages?tab=alerts" />;
}
