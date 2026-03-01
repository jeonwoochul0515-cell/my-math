import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/** Firebase 설정 - 환경변수에서 읽기 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Firebase 앱 초기화 */
const app = initializeApp(firebaseConfig);

/** Firebase 인증 인스턴스 */
export const auth = getAuth(app);

export default app;
