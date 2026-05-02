import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cached: { app: App; db: Firestore } | null = null;

/**
 * Lazily initialise the Firebase Admin SDK on the server.
 * Reads credentials from env vars at call time (not module scope) so missing
 * vars surface as a clear runtime error instead of breaking the build.
 */
export function getAdmin(): { app: App; db: Firestore } {
  if (cached) return cached;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Private keys pasted into env vars typically have escaped \n — restore them.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

  cached = { app, db: getFirestore(app) };
  return cached;
}
