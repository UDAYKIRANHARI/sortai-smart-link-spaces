import * as admin from "firebase-admin";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error("No GOOGLE_APPLICATION_CREDENTIALS found in .env");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
} catch (e) {
  if (!(e as any).message.includes('already exists')) {
    console.error("Firebase init failed:", e);
  }
}

async function listAllUsers(nextPageToken?: string) {
  try {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`UID: ${userRecord.uid}`);
      console.log(`Email: ${userRecord.email}`);
      console.log(`Display Name: ${userRecord.displayName}`);
      console.log(`Created: ${userRecord.metadata.creationTime}`);
      console.log('---');
    });
    if (listUsersResult.pageToken) {
      await listAllUsers(listUsersResult.pageToken);
    }
  } catch (error) {
    console.log('Error listing users:', error);
  }
}

listAllUsers().then(() => process.exit(0));
