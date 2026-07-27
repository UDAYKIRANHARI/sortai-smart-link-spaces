import admin from "firebase-admin";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SavedLink {
  url: string;
  source: string;
  space: string;
  title: string;
  shortDescription: string;
  tags: string[];
  reasonToSave: string;
  confidence: "high" | "medium" | "low";
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface SavedLinkWithId extends SavedLink {
  id: string;
}

export async function getUserUsage(userId: string, userEmail?: string) {
  const docRef = getDb().collection("users").doc(userId);
  const docSnap = await docRef.get();
  const data = docSnap.exists ? docSnap.data() : {};
  const adminEmails = ["udaykiranhari07@gmail.com", "hariudaykiran0715@gmail.com"];
  const isProAdmin = userId === "M2204" || 
                     (userEmail && adminEmails.includes(userEmail)) || 
                     (data?.email && adminEmails.includes(data.email)) || 
                     data?.tier === "pro";
  return {
    tier: isProAdmin ? "pro" : "free",
    monthlyLinkCount: data?.monthlyLinkCount || 0,
    visionAiCount: data?.visionAiCount || 0,
  };
}

export async function incrementUserUsage(userId: string, isVision: boolean) {
  const docRef = getDb().collection("users").doc(userId);
  const updates: any = {
    monthlyLinkCount: FieldValue.increment(1)
  };
  if (isVision) {
    updates.visionAiCount = FieldValue.increment(1);
  }
  await docRef.set(updates, { merge: true });
}

export async function getUserTier(userId: string, userEmail?: string): Promise<"free" | "pro"> {
  const usage = await getUserUsage(userId, userEmail);
  return usage.tier as "free" | "pro";
}

// ---------------------------------------------------------------------------
// Firebase Admin initialisation (lazy – runs on first getDb() call so that
// dotenv has already loaded env vars by the time we read them)
// ---------------------------------------------------------------------------
let _db: Firestore | null = null;

export function initializeFirebase(): void {
  if (admin.apps.length > 0) return; // Already initialised

  try {
    // 1. First, check if the raw JSON string is provided via environment variables (Best for Azure/Render/Vercel)
    const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (jsonString) {
      const serviceAccount = JSON.parse(jsonString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[DB] Firebase Admin initialised with service account JSON string from env");
      return;
    }
    // 2. Next, check if a file path is provided (Good for local dev or Docker)
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credPath && credPath !== "PASTE_FULL_PATH_TO_FIREBASE_SERVICE_ACCOUNT_JSON") {
      const resolved = path.resolve(credPath);
      if (fs.existsSync(resolved)) {
        admin.initializeApp({
          credential: admin.credential.cert(resolved),
        });
        console.log("[DB] Firebase Admin initialised with service account file");
        return;
      }
    }
  } catch (e) {
    console.warn("[DB] Failed to load credentials from env string or file");
  }
  // Application Default Credentials in GCP)
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "sortai-local",
  });
  
  // Initialize a secondary app strictly for Auth verification using the frontend's Firebase Project ID
  admin.initializeApp({
    projectId: "sortai-c4f60",
  }, "authApp");

  console.warn(
    "[DB] Firebase Admin initialised WITHOUT service-account credentials (emulator / local dev)"
  );
}

export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore();
  }
  return _db;
}

// ---------------------------------------------------------------------------
// saveLink – writes to users/{userId}/links/{auto-id}
// ---------------------------------------------------------------------------
export async function saveLink(
  userId: string,
  linkData: SavedLink
): Promise<SavedLinkWithId> {
  const colRef = getDb().collection("users").doc(userId).collection("links");

  const docData = {
    ...linkData,
    createdAt: linkData.createdAt || new Date().toISOString(),
    _updatedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await colRef.add(docData);

  return {
    id: docRef.id,
    ...linkData,
    createdAt: docData.createdAt,
  };
}

// ---------------------------------------------------------------------------
// getLinks – reads users/{userId}/links, optional space filter & text search
// ---------------------------------------------------------------------------
export async function getLinks(
  userId: string,
  space?: string,
  query?: string
): Promise<SavedLinkWithId[]> {
  const colRef = getDb()
    .collection("users")
    .doc(userId)
    .collection("links")
    .orderBy("createdAt", "desc");

  const snapshot = await colRef.limit(200).get();

  let results: SavedLinkWithId[] = snapshot.docs.map((doc) => {
    const data = doc.data() as SavedLink;
    return { id: doc.id, ...data };
  });

  // Filter by space in-memory to bypass composite index requirement
  if (space && space.trim().length > 0) {
    const targetSpace = space.trim().toLowerCase();
    results = results.filter(
      (link) => (link.space || "").toLowerCase() === targetSpace
    );
  }

  // Client-side text search across title, description, tags
  if (query && query.trim().length > 0) {
    const q = query.trim().toLowerCase();
    results = results.filter((link) => {
      const haystack = [
        link.title,
        link.shortDescription,
        ...(link.tags || []),
        link.url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// getSpacesSummary – count of links per space
// ---------------------------------------------------------------------------
export async function getSpacesSummary(
  userId: string
): Promise<Record<string, number>> {
  const snapshot = await getDb()
    .collection("users")
    .doc(userId)
    .collection("links")
    .select("space")
    .get();

  const counts: Record<string, number> = {};

  for (const doc of snapshot.docs) {
    const space: string = (doc.data().space as string) || "Other";
    counts[space] = (counts[space] || 0) + 1;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// deleteLink – deletes a document in users/{userId}/links/{linkId}
// ---------------------------------------------------------------------------
export async function deleteLink(userId: string, linkId: string): Promise<void> {
  const docRef = getDb()
    .collection("users")
    .doc(userId)
    .collection("links")
    .doc(linkId);
  await docRef.delete();
}

// ---------------------------------------------------------------------------
// updateLinkSpace – updates the space field on a saved link
// ---------------------------------------------------------------------------
export async function updateLinkSpace(
  userId: string,
  linkId: string,
  newSpace: string
): Promise<void> {
  const docRef = getDb()
    .collection("users")
    .doc(userId)
    .collection("links")
    .doc(linkId);
  await docRef.update({
    space: newSpace,
    _updatedAt: FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Feedback and Admin Functions
// ---------------------------------------------------------------------------

export interface Feedback {
  userId: string;
  userEmail?: string;
  message: string;
  createdAt: string;
}

export interface FeedbackWithId extends Feedback {
  id: string;
}

export async function saveFeedback(feedback: Feedback): Promise<FeedbackWithId> {
  const docRef = await getDb().collection("feedbacks").add({
    ...feedback,
    _updatedAt: FieldValue.serverTimestamp()
  });
  return { id: docRef.id, ...feedback };
}

export async function getFeedbacks(): Promise<FeedbackWithId[]> {
  const snapshot = await getDb().collection("feedbacks").orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackWithId));
}

export async function getTotalLinksCount(): Promise<number> {
  try {
    const snapshot = await getDb().collectionGroup("links").count().get();
    return snapshot.data().count;
  } catch (e) {
    console.error("[DB] Error getting total links count:", e);
    return 0;
  }
}

export async function getTotalUsersCount(): Promise<number> {
  try {
    // Ensure admin is initialized
    getDb();
    let count = 0;
    let pageToken: string | undefined;
    
    // Fallback if listUsers isn't available (e.g. some emulator setups)
    if (!admin.auth) return 0;
    
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      count += result.users.length;
      pageToken = result.pageToken;
    } while (pageToken);
    
    return count;
  } catch (e) {
    console.error("[DB] Error getting total users count:", e);
    return 0;
  }
}
