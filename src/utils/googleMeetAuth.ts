import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/calendar.events',
];

export interface GoogleWorkspaceUser {
  email: string | null;
  displayName: string | null;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}

// Keep OAuth access token strictly in memory (never localStorage / sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedWorkspaceUser: GoogleWorkspaceUser | null = null;
let gsiScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Navigateur requis pour la connexion Google.'));
  }
  const win = window as any;
  if (win.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }
  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Impossible de charger Google Identity Services.')),
        { once: true }
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScriptPromise = null;
      reject(new Error('Impossible de charger Google Identity Services.'));
    };
    document.head.appendChild(script);
  });
  return gsiScriptPromise;
}

async function signInViaGoogleIdentityServices(): Promise<{
  user: GoogleWorkspaceUser;
  accessToken: string;
}> {
  await loadGoogleIdentityServices();
  const win = window as any;
  const clientId = (firebaseConfig as { oAuthClientId?: string }).oAuthClientId;
  if (!clientId || !win.google?.accounts?.oauth2) {
    throw new Error(
      `Client OAuth Google indisponible sur ce domaine (${window.location.hostname}).`
    );
  }

  const token = await new Promise<string>((resolve, reject) => {
    try {
      const tokenClient = win.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: [...WORKSPACE_SCOPES, 'openid', 'email', 'profile'].join(' '),
        prompt: 'consent',
        callback: (resp: any) => {
          if (resp?.error) {
            reject(
              new Error(
                resp.error_description ||
                  `Autorisation Google refusée (${resp.error}) sur ${window.location.hostname}.`
              )
            );
            return;
          }
          if (!resp?.access_token) {
            reject(new Error('Aucun jeton d’accès Google Meet reçu.'));
            return;
          }
          resolve(String(resp.access_token));
        },
        error_callback: (err: any) => {
          reject(
            new Error(
              err?.message ||
                `Fenêtre Google OAuth bloquée ou domaine (${window.location.hostname}) non autorisé.`
            )
          );
        },
      });
      tokenClient.requestAccessToken();
    } catch (err: any) {
      reject(err);
    }
  });

  let user: GoogleWorkspaceUser = { email: 'Compte Google Connecté', displayName: null };
  try {
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      user = {
        email: info?.email || 'Compte Google Connecté',
        displayName: info?.name || null,
      };
    }
  } catch {
    // Userinfo is optional; token itself grants Meet & Calendar access
  }

  cachedAccessToken = token;
  cachedWorkspaceUser = user;
  return { user, accessToken: token };
}

export function initGoogleWorkspaceAuth(
  onAuthSuccess?: (user: GoogleWorkspaceUser, token: string) => void,
  onAuthCleared?: () => void
) {
  if (cachedAccessToken && cachedWorkspaceUser) {
    onAuthSuccess?.(cachedWorkspaceUser, cachedAccessToken);
  }
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(
        { email: user.email, displayName: user.displayName },
        cachedAccessToken
      );
    } else if (!user && !cachedAccessToken && !isSigningIn) {
      cachedWorkspaceUser = null;
      onAuthCleared?.();
    }
  });
}

export async function signInWithGoogleForMeet(): Promise<{
  user: GoogleWorkspaceUser;
  accessToken: string;
} | null> {
  isSigningIn = true;
  try {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Impossible de récupérer le jeton Google Meet / Calendar.');
      }
      cachedAccessToken = credential.accessToken;
      cachedWorkspaceUser = {
        email: result.user.email,
        displayName: result.user.displayName,
      };
      return { user: cachedWorkspaceUser, accessToken: cachedAccessToken };
    } catch (firebaseErr: any) {
      const code = String(firebaseErr?.code || '');
      const msg = String(firebaseErr?.message || '');
      const needsGisFallback =
        code === 'auth/unauthorized-domain' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/internal-error' ||
        msg.includes('unauthorized-domain');

      if (!needsGisFallback) {
        throw firebaseErr;
      }

      try {
        return await signInViaGoogleIdentityServices();
      } catch (gisErr: any) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        throw new Error(
          `Connexion Google Meet bloquée sur ce domaine (${host}) : ${gisErr?.message || code}. Vous pouvez ouvrir Google Meet directement et coller le lien ci-dessous.`
        );
      }
    }
  } finally {
    isSigningIn = false;
  }
}

export function getCachedGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutGoogleWorkspace(): Promise<void> {
  await auth.signOut().catch(() => {});
  cachedAccessToken = null;
  cachedWorkspaceUser = null;
}
