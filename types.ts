
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
}

export interface ArchiveDocument {
  id: string;
  nomorDokumen: string;
  judul: string;
  deskripsi: string;
  kategori: string; // Changed from ArchiveCategory to string to support dynamic folders
  tahun: string;
  tanggalUpload: string;
  tags: string[];
  fileSize?: string;
  fileUrl?: string; // URL publik untuk akses/download file
}

export interface AIParsedData {
  nomor_dokumen?: string;
  judul: string;
  kategori: string;
  tahun: string;
  deskripsi: string;
  tags?: string[];
}
