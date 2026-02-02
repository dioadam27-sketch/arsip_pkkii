-- --------------------------------------------------------
-- Database Schema untuk Repo PKKII Universitas Airlangga
-- Kompatibel dengan MySQL / MariaDB
-- --------------------------------------------------------
-- PENTING:
-- 1. Buat database terlebih dahulu di cPanel/Hosting Anda.
-- 2. Buka phpMyAdmin, pilih database tersebut.
-- 3. Import script ini (atau copy-paste ke tab SQL).
-- --------------------------------------------------------

-- --------------------------------------------------------
-- 1. Tabel Users (Untuk Autentikasi Admin/Tamu)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Disarankan menggunakan BCrypt
    role ENUM('admin', 'guest') DEFAULT 'guest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data untuk User Admin (Password: 112233)
-- Catatan: Dalam produksi, password harus di-hash.
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '112233', 'admin'),
('tamu', 'guest123', 'guest');

-- --------------------------------------------------------
-- 2. Tabel Folders (Untuk Struktur Kategori Dinamis)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(50) PRIMARY KEY, -- Menggunakan String ID (misal: 'SK', 'AKADEMIK')
    label VARCHAR(100) NOT NULL,
    parent_id VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Seed Data untuk Folder Default
INSERT INTO folders (id, label, parent_id) VALUES
('SK', 'SK Rektor', NULL),
('SURAT_TUGAS', 'Surat Tugas', NULL),
('AKADEMIK', 'Dokumen Akademik', NULL),
('LAPORAN', 'Laporan Kegiatan', NULL),
('LAINNYA', 'Lainnya', NULL);

-- --------------------------------------------------------
-- 3. Tabel Archives (Menyimpan Metadata Dokumen)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS archives (
    id VARCHAR(255) PRIMARY KEY, -- Menggunakan VARCHAR untuk menampung ID dari Google Drive
    nomor_dokumen VARCHAR(100) DEFAULT '-',
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    kategori VARCHAR(50) NOT NULL, -- Terhubung ke folder.label atau folder.id
    tahun YEAR,
    tags TEXT, -- Disimpan sebagai string dipisah koma (contoh: "akademik, 2024, penting")
    file_url VARCHAR(2083), -- URL File (Google Drive Link)
    file_size VARCHAR(50), -- Contoh: "2.5 MB"
    folder_id VARCHAR(50), -- Foreign Key ke tabel folders (Opsional, untuk integritas data)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

-- Indexing untuk mempercepat pencarian
CREATE INDEX idx_judul ON archives(judul);
CREATE INDEX idx_nomor ON archives(nomor_dokumen);
CREATE INDEX idx_tahun ON archives(tahun);
