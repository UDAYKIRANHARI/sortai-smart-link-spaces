import admin from "firebase-admin";
import { getFirestore, Firestore, FieldValue, Query } from "firebase-admin/firestore";
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

// ---------------------------------------------------------------------------
// Firebase Admin initialisation (lazy – runs on first getDb() call so that
// dotenv has already loaded env vars by the time we read them)
// ---------------------------------------------------------------------------
let _db: Firestore | null = null;

export function initializeFirebase(): void {
  if (admin.apps.length > 0) return; // Already initialised

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credPath && credPath !== "PASTE_FULL_PATH_TO_FIREBASE_SERVICE_ACCOUNT_JSON") {
    const resolved = path.resolve(credPath);
    if (fs.existsSync(resolved)) {
      admin.initializeApp({
        credential: admin.credential.cert(resolved),
      });
      console.log("[DB] Firebase Admin initialised with service account");
      return;
    }
    console.warn(
      `[DB] Credentials file not found at "${resolved}" – initialising without credentials`
    );
  } else {
    console.warn(
      "[DB] GOOGLE_APPLICATION_CREDENTIALS not set – initialising without credentials"
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS must be configured in production"
    );
  }

  // Fallback: initialise without credentials (works with emulator or
  // Application Default Credentials in GCP)
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "sortai-local",
  });
  console.warn(
    "[DB] Firebase Admin initialised WITHOUT service-account credentials (emulator / local dev)"
  );
}

function getDb(): Firestore {
  if (!_db) {
    initializeFirebase();
    _db = getFirestore();
  }
  return _db;
}

export function isFirebaseInitialized(): boolean {
  return admin.apps.length > 0;
}

// ---------------------------------------------------------------------------
// saveLink – writes to users/{userId}/links/{auto-id}
// ---------------------------------------------------------------------------
export async function saveLink(
  userId: string,
  linkData: SavedLink
): Promise<SavedLinkWithId & { created: boolean }> {
  const colRef = getDb().collection("users").doc(userId).collection("links");

  // Idempotency guard: if the same URL already exists for this user, return it.
  const existing = await colRef.where("url", "==", linkData.url).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    return {
      id: doc.id,
      ...(doc.data() as SavedLink),
      created: false,
    };
  }

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
    created: true,
  };
}

// ---------------------------------------------------------------------------
// getLinks – reads users/{userId}/links, optional space filter & text search
// ---------------------------------------------------------------------------
export async function getLinks(
  userId: string,
  space?: string,
  query?: string,
  pageSize = 20,
  cursor?: string
): Promise<{ items: SavedLinkWithId[]; nextCursor: string | null }> {
  let colRef: Query = getDb()
    .collection("users")
    .doc(userId)
    .collection("links")
    .orderBy("createdAt", "desc");

  // Apply indexed equality filter in DB where possible.
  if (space && space.trim().length > 0) {
    colRef = colRef.where("space", "==", space.trim());
  }

  let queryRef = colRef.limit(Math.min(Math.max(pageSize, 1), 100));
  if (cursor) {
    const cursorDoc = await getDb()
      .collection("users")
      .doc(userId)
      .collection("links")
      .doc(cursor)
      .get();
    if (cursorDoc.exists) {
      queryRef = queryRef.startAfter(cursorDoc);
    }
  }

  let snapshot;
  try {
    snapshot = await queryRef.get();
  } catch (err) {
    // Fallback to non-indexed query if composite index is missing.
    if (space) {
      const fallback = await getDb()
        .collection("users")
        .doc(userId)
        .collection("links")
        .orderBy("createdAt", "desc")
        .limit(Math.min(Math.max(pageSize, 1), 100))
        .get();
      snapshot = fallback;
    } else {
      throw err;
    }
  }

  let results: SavedLinkWithId[] = snapshot.docs.map((doc) => {
    const data = doc.data() as SavedLink;
    return { id: doc.id, ...data };
  });

  // Client-side text search across title, description, tags
  if (space && space.trim().length > 0) {
    const targetSpace = space.trim().toLowerCase();
    results = results.filter((link) => (link.space || "").toLowerCase() === targetSpace);
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

  const nextCursor =
    snapshot.docs.length === Math.min(Math.max(pageSize, 1), 100)
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

  return { items: results, nextCursor };
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
