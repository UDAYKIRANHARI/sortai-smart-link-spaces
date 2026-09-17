import { getDb } from "./db";
import { sendPushToUser } from "./notifications";

// ---------------------------------------------------------------------------
// Dynamic Notification Scheduler
// ---------------------------------------------------------------------------
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Starts the dynamic background notification scheduler.
 * Runs every 30 minutes to check if any user is due for a personalized dynamic push notification.
 */
export function startNotificationScheduler(): void {
  if (schedulerInterval) return;

  console.log("[SCHEDULER] Dynamic Notification Scheduler initialized.");

  // Run initial check after 15 seconds, then every 30 minutes
  setTimeout(() => runDynamicNotificationCycle(), 15000);
  schedulerInterval = setInterval(() => runDynamicNotificationCycle(), 30 * 60 * 1000);
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

/**
 * Executes a single dynamic notification cycle across registered push subscribers.
 */
export async function runDynamicNotificationCycle(): Promise<{ processedUsers: number; sentCount: number }> {
  let processedUsers = 0;
  let sentCount = 0;

  try {
    const db = getDb();
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      return { processedUsers: 0, sentCount: 0 };
    }

    const currentHour = new Date().getHours();
    // Typical commute / active digest hours: 8 AM (morning digest) or 6 PM (evening digest)
    const isMorningWindow = currentHour >= 8 && currentHour < 12;
    const isEveningWindow = currentHour >= 18 && currentHour < 21;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Check if user has active push subscriptions
      const subSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("pushSubscriptions")
        .get();

      if (subSnapshot.empty) continue;

      // Check last notification time to prevent over-notifying (max 1 notification every 12 hours)
      const userMetaRef = db.collection("users").doc(userId).collection("settings").doc("notifications");
      const userMetaDoc = await userMetaRef.get();
      const lastNotified = userMetaDoc.exists ? userMetaDoc.data()?.lastNotifiedAt : null;

      if (lastNotified) {
        const hoursDiff = (Date.now() - new Date(lastNotified).getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 12) {
          continue; // Skip if notified within last 12 hours
        }
      }

      // Fetch user's saved links
      const linksSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("links")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      if (linksSnapshot.empty) continue;

      const links = linksSnapshot.docs.map((d) => d.data());
      const recentLink = links[0];
      const spaceNames = [...new Set(links.map((l) => l.space || "Web links"))].slice(0, 2).join(" & ");

      // Craft dynamic personalized push payload based on time window & content
      let title = "🔔 SortAi Daily Highlight";
      let body = `You have saved links in ${spaceNames} ready to explore!`;

      if (isMorningWindow) {
        title = "☀️ SortAi Morning Commute Digest";
        body = `Morning catch-up: "${recentLink.title || "Your saved article"}" is waiting in your ${recentLink.space || "library"} space!`;
      } else if (isEveningWindow) {
        title = "🌙 SortAi Evening Review";
        body = `You saved ${links.length} link${links.length > 1 ? "s" : ""} today in ${spaceNames} — take a quick look!`;
      } else {
        title = "✨ SortAi Saved Highlight";
        body = `Revisit: "${recentLink.title || "Saved link"}" — stored in ${recentLink.space || "Web links"}.`;
      }

      const result = await sendPushToUser(userId, {
        title,
        body,
        url: "https://sortai.dev",
      });

      processedUsers++;
      if (result.successCount > 0) {
        sentCount += result.successCount;
        await userMetaRef.set(
          {
            lastNotifiedAt: new Date().toISOString(),
            lastNotifiedTitle: title,
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.error("[SCHEDULER] Error during notification cycle:", (err as Error).message);
  }

  return { processedUsers, sentCount };
}
