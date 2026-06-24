import { supabase } from '../supabaseClient';

// Public VAPID-nøgle (offentlig — må gerne ligge i klienten).
// Den private nøgle ligger som hemmelighed i Supabase edge-funktionen.
export const PUBLIC_VAPID_KEY = 'BKLNPYR40nKRfERxXXWctbVztLnvUJTBMaacXoOr_z16Jf-1T7Ou-oBWZNoJ5W7c_av8L3G3qNlww5KJr15u36U';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && typeof window !== 'undefined'
    && 'PushManager' in window
    && 'Notification' in window;
}

// Gemmer abonnementet i databasen. Idempotent: hvis endpoint allerede findes
// (unique-constraint 23505), ignoreres det. Det gør funktionen sikker at kalde
// ved hver app-start, så DB altid har et gyldigt abonnement for brugeren.
async function saveSubscriptionToDb(subscription) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Du er ikke logget ind');

  const { error } = await supabase
    .from('push_subscriptions')
    .insert([{
      user_id: user.id,
      subscription_data: JSON.parse(JSON.stringify(subscription)),
    }]);

  // 23505 = unique constraint (abonnementet er allerede gemt) → fint
  if (error && error.code !== '23505') throw error;
}

// Selvhelende: kaldes ved hver app-start. Spørger ALDRIG om tilladelse.
// Hvis brugeren tidligere har slået notifikationer til (permission === 'granted'),
// men abonnementet er udløbet/forsvundet (typisk på iOS/PWA), gen-tilmelder den
// lydløst og gemmer på ny i databasen. Så skal svend/lærling/tømrer aldrig selv
// ind og trykke "til" igen.
export async function ensurePushSubscription() {
  try {
    if (!isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
    }

    // Sørg altid for at DB har et gyldigt abonnement (også hvis rækken blev
    // slettet server-side efter en mislykket levering).
    await saveSubscriptionToDb(subscription);
    return true;
  } catch (error) {
    // Lydløst — må aldrig forstyrre app-opstarten.
    console.warn('ensurePushSubscription:', error?.message || error);
    return false;
  }
}

// Eksplicit tilmelding (spørger om tilladelse). Bruges af toggle/prompt.
// Returnerer { ok, reason }.
export async function subscribeToPush() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });
  }

  await saveSubscriptionToDb(subscription);
  return { ok: true };
}

// Eksplicit afmelding. Bruges af toggle.
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('subscription_data->>endpoint', subscription.endpoint);
    }
  }
  return { ok: true };
}

// Er der p.t. et aktivt abonnement i browseren?
export async function hasActiveSubscription() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
