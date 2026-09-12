import webpush from "web-push";
import { getDb } from "./db";

// Standard VAPID keys for Web Push Notifications (local & production)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BGK8bV-4tq98vG_qR1T_wL9O1dY_S8bW0qZ9X2aB7cV5nM3kL8jH9fG6dS4aP2oR1eW0qZ9X2aB7cV5nM3kL8jH";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "eW0qZ9X2aB7cV5nM3kL8jH9fG6dS4aP2oR1";

try {
  webpush.setVapidDetails(
    "mailto:founder@sortai.dev",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn("[NOTIFICATIONS] VAPID initialization warning:", (e as Error).message);
}

export function getPublicVapidKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Save subscription to Firestore under user document
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<void> {
  const db = getDb();
  const subRef = db
    .collection("users")
    .doc(userId)
    .collection("pushSubscriptions")
    .doc(Buffer.from(subscription.endpoint).toString("base64").slice(-60));

  await subRef.set({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    updatedAt: new Date().toISOString(),
  });

  console.log(`[NOTIFICATIONS] Saved push subscription for user ${userId}`);
}

// Send push notification payload to user's registered devices
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ successCount: number; failureCount: number }> {
  const db = getDb();
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("pushSubscriptions")
    .get();

  if (snapshot.empty) {
    console.log(`[NOTIFICATIONS] No push subscriptions found for user ${userId}`);
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

  const pushPayload = JSON.stringify({
    title: payload.title || "SortAi Highlight",
    body: payload.body || "You have unread saved links to check out!",
    url: payload.url || "https://sortai.dev",
  });

  for (const doc of snapshot.docs) {
    const sub = doc.data() as PushSubscriptionData;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        pushPayload
      );
      successCount++;
    } catch (err) {
      console.warn(`[NOTIFICATIONS] Failed to send push to device:`, (err as Error).message);
      failureCount++;
      // If subscription expired/invalid, remove from Firestore
      if ((err as any).statusCode === 410 || (err as any).statusCode === 404) {
        await doc.ref.delete();
      }
    }
  }

  console.log(`[NOTIFICATIONS] User ${userId}: Sent ${successCount} push notifications (${failureCount} failed).`);
  return { successCount, failureCount };
}
