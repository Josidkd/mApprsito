import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
export const PROJECT_ID = 'demo-marsito-beta';
export function requireEmulators() {
  if (process.env.GCLOUD_PROJECT !== PROJECT_ID || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') || !/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Tests require localhost emulators and demo-marsito-beta, never production.');
}
export async function testEnvironment() {
  requireEmulators();
  return initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: await readFile('firestore.rules', 'utf8') } });
}
