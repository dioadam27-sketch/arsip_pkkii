import { ArchiveDocument, Folder } from "../types";

// --- KONFIGURASI API ---
const STORAGE_PHP_KEY = 'pkkii_api_url';
const STORAGE_DRIVE_KEY = 'pkkii_drive_url';

// Default Fallbacks
const DEFAULT_PHP_URL = "https://pkkii.pendidikan.unair.ac.id/arsip/api.php";
const DEFAULT_DRIVE_URL = "https://script.google.com/macros/s/AKfycbyTFn6EWdhmpcZj9MhU4qJibr7Tc23MbM0gCDyYkaEcytMr6c1Ln7nE-PdQ2FmV4TJh2A/exec";

interface FetchResponse {
    archives: ArchiveDocument[];
    folders: Folder[];
}

// --- CONFIG HELPER ---
export const getApiUrl = (): string => {
    return localStorage.getItem(STORAGE_PHP_KEY) || DEFAULT_PHP_URL;
};

export const saveApiUrl = (url: string): void => {
    localStorage.setItem(STORAGE_PHP_KEY, url.trim());
};

export const getDriveScriptUrl = (): string => {
    return localStorage.getItem(STORAGE_DRIVE_KEY) || DEFAULT_DRIVE_URL;
}

export const saveDriveScriptUrl = (url: string): void => {
    localStorage.setItem(STORAGE_DRIVE_KEY, url.trim());
}

// --- UTILS ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // Remove "data:*/*;base64," prefix for GAS
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const handleResponse = async (response: Response) => {
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        return json;
    } catch (e) {
        console.error("Invalid JSON Response:", text);
        if (text.includes("<br />") || text.includes("Fatal error") || text.includes("Warning")) {
            throw new Error("Server Error (PHP): " + text.replace(/<[^>]*>?/gm, '').substring(0, 100));
        }
        throw new Error("Respon server tidak valid: " + text.substring(0, 50));
    }
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 1): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
    } catch (err) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
};

/**
 * Upload Logic (Hybrid)
 */
export const uploadToDrive = async (file: File, metadata: Partial<ArchiveDocument>): Promise<any> => {
  const phpUrl = getApiUrl();
  const driveScriptUrl = getDriveScriptUrl();

  if (!phpUrl) throw new Error("URL API Backend belum dikonfigurasi.");
  if (!driveScriptUrl) throw new Error("URL Google Apps Script belum dikonfigurasi.");

  try {
    // --- STEP 1: Upload ke Google Drive (Apps Script) ---
    console.log("Step 1: Uploading to Google Drive...");
    const base64Data = await fileToBase64(file);
    
    const drivePayload = {
        action: 'upload_file_only',
        fileData: base64Data,
        fileName: file.name,
        mimeType: file.type
    };

    let driveResponse;
    try {
        driveResponse = await fetch(driveScriptUrl, {
            method: 'POST',
            mode: 'cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(drivePayload)
        });
    } catch (netErr) {
        console.error("GAS Network Error:", netErr);
        throw new Error("Gagal menghubungi Google Apps Script.");
    }

    if (!driveResponse.ok) throw new Error("Gagal terhubung ke Google Drive Script.");
    
    const driveResult = await driveResponse.json();
    if (driveResult.status !== 'success') {
        throw new Error(driveResult.message || "Gagal upload ke Google Drive.");
    }

    const { id: driveId, url: driveUrl, fileSize } = driveResult.data;
    console.log("Drive Upload Success:", driveUrl);

    // --- STEP 2: Simpan Metadata ke MySQL (PHP) ---
    console.log("Step 2: Saving metadata to Database...");
    
    const dbPayload = {
        action: 'upload',
        judul: metadata.judul || "Tanpa Judul",
        nomorDokumen: metadata.nomorDokumen || "-",
        kategori: metadata.kategori || "Lainnya",
        tahun: metadata.tahun || new Date().getFullYear().toString(),
        deskripsi: metadata.deskripsi || "",
        tags: metadata.tags || [],
        folderId: (metadata as any).folderId,
        visibility: metadata.visibility || 'public', // Save visibility
        
        fileUrl: driveUrl,
        driveId: driveId,
        fileSize: fileSize || (file.size / 1024).toFixed(2) + ' KB'
    };

    const phpResponse = await fetch(phpUrl, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(dbPayload)
    });

    const dbResult = await handleResponse(phpResponse);
    if (dbResult.status === 'success') return dbResult;
    else throw new Error(dbResult.message || "Gagal menyimpan metadata.");

  } catch (error) {
    console.error("Hybrid Upload Error:", error);
    if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error("Koneksi terputus.");
    }
    throw error;
  }
};

/**
 * Create New Folder
 */
export const createFolder = async (folder: Folder): Promise<any> => {
    const apiUrl = getApiUrl();
    try {
        const payload = {
            action: 'create_folder',
            id: folder.id,
            label: folder.label,
            parentId: folder.parentId,
            visibility: folder.visibility || 'public'
        };

        const response = await fetchWithRetry(apiUrl, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await handleResponse(response);
        if (result.status === 'success') return result;
        else throw new Error(result.message || "Gagal membuat folder.");

    } catch (error) {
        console.error("Create Folder Error:", error);
        throw error;
    }
}

/**
 * Rename Folder
 */
export const renameFolder = async (id: string, newName: string): Promise<any> => {
    const apiUrl = getApiUrl();
    try {
        const payload = {
            action: 'rename_folder',
            id: id,
            label: newName
        };

        const response = await fetchWithRetry(apiUrl, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await handleResponse(response);
        if (result.status === 'success') return result;
        else throw new Error(result.message || "Gagal mengubah nama folder.");

    } catch (error) {
        console.error("Rename Folder Error:", error);
        throw error;
    }
}

/**
 * Rename Archive (File)
 */
export const renameArchive = async (id: string, newTitle: string): Promise<any> => {
    const apiUrl = getApiUrl();
    try {
        const payload = {
            action: 'rename_archive',
            id: id,
            judul: newTitle
        };

        const response = await fetchWithRetry(apiUrl, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await handleResponse(response);
        if (result.status === 'success') return result;
        else throw new Error(result.message || "Gagal mengubah nama arsip.");

    } catch (error) {
        console.error("Rename Archive Error:", error);
        throw error;
    }
}

/**
 * Toggle Visibility (Public/Private)
 */
export const toggleVisibility = async (id: string, type: 'folder' | 'archive', currentVisibility: 'public' | 'private'): Promise<any> => {
    const apiUrl = getApiUrl();
    try {
        const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
        const payload = {
            action: 'toggle_visibility',
            id: id,
            type: type,
            visibility: newVisibility
        };

        const response = await fetchWithRetry(apiUrl, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await handleResponse(response);
        if (result.status === 'success') return result;
        else throw new Error(result.message || "Gagal mengubah status visibilitas.");

    } catch (error) {
        console.error("Toggle Visibility Error:", error);
        throw error;
    }
}

/**
 * Move Archive to new Folder
 */
export const moveArchive = async (id: string, newFolderId: string): Promise<any> => {
    const apiUrl = getApiUrl();
    try {
        const payload = {
            action: 'move_archive',
            id: id,
            folderId: newFolderId
        };

        const response = await fetchWithRetry(apiUrl, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await handleResponse(response);
        if (result.status === 'success') return result;
        else throw new Error(result.message || "Gagal memindahkan file.");

    } catch (error) {
        console.error("Move Archive Error:", error);
        throw error;
    }
}

/**
 * Delete Archive
 */
export const deleteArchive = async (id: string): Promise<any> => {
  const apiUrl = getApiUrl();
  const driveScriptUrl = getDriveScriptUrl();

  try {
    const payload = { action: 'delete_archive', id: id };
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await handleResponse(response);
    
    if (result.status === 'success') {
        if (result.data && result.data.driveId && driveScriptUrl) {
            try {
                fetch(driveScriptUrl, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'delete_file',
                        id: result.data.driveId
                    })
                });
            } catch (e) {
                console.warn("Gagal menghapus file fisik di Drive:", e);
            }
        }
        return result;
    }
    else throw new Error(result.message || "Gagal menghapus arsip.");

  } catch (error) {
    console.error("Delete Archive Error:", error);
    throw error;
  }
};

/**
 * Delete Folder
 */
export const deleteFolder = async (id: string): Promise<any> => {
  const apiUrl = getApiUrl();
  try {
    const payload = { action: 'delete_folder', id: id };
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await handleResponse(response);
    if (result.status === 'success') return result;
    else throw new Error(result.message || "Gagal menghapus folder.");

  } catch (error) {
    console.error("Delete Folder Error:", error);
    throw error;
  }
};

/**
 * Fetch All Data
 */
export const fetchAllData = async (): Promise<FetchResponse> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return { archives: [], folders: [] };

    try {
        const cacheBuster = `?t=${new Date().getTime()}`;
        const response = await fetchWithRetry(apiUrl + cacheBuster, {
            method: "GET"
        });
        
        const json = await handleResponse(response);
        
        if (json.status === 'success') {
            const data = json.data;
            return {
                archives: Array.isArray(data.archives) ? data.archives : [],
                folders: Array.isArray(data.folders) ? data.folders : []
            };
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw new Error("Gagal mengambil data. Cek koneksi atau URL API.");
    }
};

export const fetchArchives = async (): Promise<ArchiveDocument[]> => {
    const data = await fetchAllData();
    return data.archives;
}