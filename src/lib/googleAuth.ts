import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { BludItem } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required OAuth scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Force Google to prompt select-account and consent if needed
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem('google_workspace_access_token');
  } catch (e) {
    return null;
  }
})();

// Initialize Auth Listener
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        try {
          localStorage.removeItem('google_workspace_access_token');
        } catch (e) {}
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem('google_workspace_access_token');
      } catch (e) {}
      onAuthFailure();
    }
  });
};

// Sign In trigger (must be initiated by user gesture)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem('google_workspace_access_token', credential.accessToken);
    } catch (e) {
      console.error('Failed to save access token to localStorage:', e);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Auth Popup Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    localStorage.removeItem('google_workspace_access_token');
  } catch (e) {
    console.error('Failed to remove access token from localStorage:', e);
  }
};

/**
 * Upload physical PDF/document to Google Drive Folder
 */
export const uploadFileToDrive = async (
  file: File,
  folderId: string
): Promise<{ id: string; name: string; webViewLink: string }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Segera login/masuk dengan akun Google Anda terlebih dahulu.');
  }

  // Google Drive multipart body format
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/pdf',
    parents: folderId ? [folderId] : undefined,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  let finalResponse = response;

  if (!response.ok && response.status === 404 && folderId) {
    try {
      const clonedResponseForError = response.clone();
      const errorText = await clonedResponseForError.text();
      console.warn('Google Drive parent folder not found or inaccessible, trying fallback to root. Response raw:', errorText);
      
      let shouldFallback = false;
      try {
        const errObj = JSON.parse(errorText);
        // Either the error message contains the folderId, or matches general 404 fileId parameter
        if (errObj.error && (
          (errObj.error.message && errObj.error.message.includes(folderId)) ||
          (errObj.error.errors && errObj.error.errors.some((e: any) => e.location === 'fileId' || e.message.includes(folderId)))
        )) {
          shouldFallback = true;
        }
      } catch (parseErr) {
        // Fallback-friendly message checks
        if (errorText.includes(folderId) || errorText.includes('notFound')) {
          shouldFallback = true;
        }
      }

      if (shouldFallback) {
        console.log('Falling back to root folder for upload.');
        const fallbackMetadata = {
          name: file.name,
          mimeType: file.type || 'application/pdf',
          parents: ['root'],
        };
        const fallbackForm = new FormData();
        fallbackForm.append('metadata', new Blob([JSON.stringify(fallbackMetadata)], { type: 'application/json' }));
        fallbackForm.append('file', file);

        finalResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: fallbackForm,
          }
        );
      }
    } catch (fallbackErr) {
      console.error('Failed to execute fallback mechanism:', fallbackErr);
    }
  }

  if (!finalResponse.ok) {
    const errorText = await finalResponse.text();
    console.error('Drive Upload Error Response:', errorText);
    throw new Error(`Google Drive Upload gagal: ${finalResponse.statusText} (${finalResponse.status})`);
  }

  const data = await finalResponse.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
};

/**
 * Push BLUD data to real Google Sheets spreadsheet
 */
export const syncBludToGoogleSheets = async (
  spreadsheetId: string,
  sheetName: string,
  bludList: BludItem[]
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Segera login/masuk dengan akun Google Anda terlebih dahulu.');
  }

  // We write to SheetName!A1 range
  const range = `${sheetName || 'Sheet1'}!A1:I5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  // Prepare table headers and rows
  const values = [
    [
      'ID REGISTRASI',
      'NAMA KEGIATAN',
      'ALOKASI ANGGARAN (RP)',
      'REALISASI BELANJA (RP)',
      'SISA ALOKASI (RP)',
      'RASIO (%)',
      'BULAN PELAKSANAAN',
      'PENANGGUNG JAWAB (PIC)',
      'SUB-UNIT DEPARTEMEN / TIM'
    ]
  ];

  bludList.forEach((item) => {
    const sisa = item.anggaran - item.realisasi;
    const rasio = item.anggaran > 0 ? ((item.realisasi / item.anggaran) * 100).toFixed(2) : '0.00';
    values.push([
      item.id,
      item.kegiatan,
      item.anggaran.toString(),
      item.realisasi.toString(),
      sisa.toString(),
      `${rasio}%`,
      item.bulan,
      item.pic || 'Meidi Priandana',
      item.department || 'Sub Bagian Program & Anggaran'
    ]);
  });

  // Use PUT to completely overwrite/update the target block
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets Sync Error Response:', errorText);
    throw new Error(`Google Sheets Update gagal: ${response.statusText} (${response.status})`);
  }
};

/**
 * Append uploaded PDF metadata to real Google Sheets spreadsheet
 */
export const appendPdfToGoogleSheets = async (
  spreadsheetId: string,
  sheetName: string,
  pdfData: { id: string; name: string; size: string; date: string; category: string; driveLink: string }
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Segera login/masuk dengan akun Google Anda terlebih dahulu.');
  }

  // We write to SheetName!A:F range
  const range = `${sheetName || 'Sheet1'}!A:F`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const values = [
    [
      pdfData.id,
      pdfData.name,
      pdfData.size,
      pdfData.date,
      pdfData.category.toUpperCase(),
      pdfData.driveLink
    ]
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets Append Error Response:', errorText);
    throw new Error(`Google Sheets Append gagal: ${response.statusText} (${response.status})`);
  }
};

