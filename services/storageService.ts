import { ArchiveDocument, Folder } from "../types";

// --- KONFIGURASI API ---
// URL Web App Google Apps Script (Versi Baru)
const API_URL = "https://script.google.com/macros/s/AKfycbwtPmTVJKftaRme46bcctymntVscKoYbez7y--LYpLPw3SSVhaUJnd3v3nsmcDuH-19Gw/exec"; 

// ID Folder Google Drive
const DRIVE_FOLDER_ID = "1M_o4tzGSdbSk5f2iLPFjm7oWbpXk2Bok";

interface FetchResponse {
    archives: ArchiveDocument[];
    folders: Folder[];
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; 
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const handleResponse = async (response: Response) => {
    const text = await response.text();
    if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
        throw new Error("Respon HTML terdeteksi. Script mungkin crash atau permission salah.");
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Raw response:", text);
        throw new Error("Format data server tidak valid (Bukan JSON).");
    }
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
    } catch (err) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 1500));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
};

/**
 * Upload File
 */
export const uploadToDrive = async (file: File, metadata: Partial<ArchiveDocument>): Promise<any> => {
  if (!API_URL) throw new Error("URL API belum disetting.");

  try {
    const base64Data = await fileToBase64(file);
    const payload = {
      action: 'upload', // Explicit action
      fileData: base64Data,
      fileName: file.name,
      mimeType: file.type,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      judul: metadata.judul || "Tanpa Judul",
      nomorDokumen: metadata.nomorDokumen || "-",
      kategori: metadata.kategori || "Lainnya",
      tahun: metadata.tahun || new Date().getFullYear().toString(),
      deskripsi: metadata.deskripsi || "",
      tags: metadata.tags || [],
      folderId: DRIVE_FOLDER_ID 
    };

    const response = await fetchWithRetry(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "omit" 
    });

    const result = await handleResponse(response);
    if (result.status === 'success') return result;
    else throw new Error(result.message || "Gagal menyimpan data.");

  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
};

/**
 * Create New Folder in Server
 */
export const createFolder = async (folder: Folder): Promise<any> => {
    if (!API_URL) throw new Error("URL API belum disetting.");

    try {
        const payload = {
            action: 'create_folder',
            id: folder.id,
            label: folder.label,
            parentId: folder.parentId
        };

        const response = await fetchWithRetry(API_URL, {
            method: "POST",
            body: JSON.stringify(payload),
            credentials: "omit"
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
 * Delete Archive
 */
export const deleteArchive = async (id: string): Promise<any> => {
  if (!API_URL) throw new Error("URL API belum disetting.");

  try {
    const payload = {
      action: 'delete_archive',
      id: id
    };

    const response = await fetchWithRetry(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "omit"
    });

    const result = await handleResponse(response);
    if (result.status === 'success') return result;
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
  if (!API_URL) throw new Error("URL API belum disetting.");

  try {
    const payload = {
      action: 'delete_folder',
      id: id
    };

    const response = await fetchWithRetry(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "omit"
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
 * Fetch All Data (Archives & Folders)
 */
export const fetchAllData = async (): Promise<FetchResponse> => {
    if (!API_URL) return { archives: [], folders: [] };

    try {
        const cacheBuster = `?t=${new Date().getTime()}`;
        const response = await fetchWithRetry(API_URL + cacheBuster, {
            method: "GET",
            credentials: "omit"
        });
        
        const json = await handleResponse(response);
        
        if (json.status === 'success') {
            // Handle structure where data might be nested or direct
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
        throw new Error("Gagal mengambil data. " + (error instanceof Error ? error.message : ""));
    }
};

// Keep legacy for backward compatibility if needed, but redirects to new structure
export const fetchArchives = async (): Promise<ArchiveDocument[]> => {
    const data = await fetchAllData();
    return data.archives;
}