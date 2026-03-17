
export enum ArchiveCategory {
  SK = 'SK Rektor',
  SURAT_TUGAS = 'Surat Tugas',
  AKADEMIK = 'Dokumen Akademik',
  LAPORAN = 'Laporan Kegiatan',
  LAINNYA = 'Lainnya'
}

export interface Folder {
  id: string;
  label: string;
  parentId?: string | null;
  visibility?: 'public' | 'private'; // New property
}

export interface ArchiveDocument {
  id: string;
  nomorDokumen: string;
  judul: string;
  deskripsi: string;
  kategori: string; 
  tahun: string;
  tanggalUpload: string;
  tags: string[];
  fileSize?: string;
  fileUrl?: string; 
  fileExtension?: string; // New property
  folderId?: string;
  visibility?: 'public' | 'private'; // New property
}
