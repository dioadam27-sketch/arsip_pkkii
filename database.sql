-- --------------------------------------------------------
-- Database Schema: Repo PKKII (Native cPanel Version)
-- --------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabel Users (Untuk Login)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'guest') DEFAULT 'guest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default User: admin / 112233 (Hash ini perlu diganti di production)
INSERT IGNORE INTO users (username, password_hash, role) VALUES 
('admin', '112233', 'admin'),
('tamu', 'guest123', 'guest');

-- 2. Tabel Folders (Hierarki)
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(50) PRIMARY KEY, 
    label VARCHAR(100) NOT NULL,
    parent_id VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_folder_parent
        FOREIGN KEY (parent_id) 
        REFERENCES folders(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Seed Folder Bawaan
INSERT IGNORE INTO folders (id, label, parent_id) VALUES
('SK', 'SK Rektor', NULL),
('SURAT_TUGAS', 'Surat Tugas', NULL),
('AKADEMIK', 'Dokumen Akademik', NULL),
('LAPORAN', 'Laporan Kegiatan', NULL),
('LAINNYA', 'Lainnya', NULL);

-- 3. Tabel Archives (Dokumen)
CREATE TABLE IF NOT EXISTS archives (
    id VARCHAR(255) PRIMARY KEY,
    nomor_dokumen VARCHAR(100) DEFAULT '-',
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    kategori VARCHAR(100) DEFAULT 'Lainnya',
    tahun VARCHAR(4),
    tags TEXT, 
    file_url VARCHAR(2083),
    file_path VARCHAR(255), -- Path fisik di server
    file_size VARCHAR(50), 
    folder_id VARCHAR(50), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_archive_folder
        FOREIGN KEY (folder_id) 
        REFERENCES folders(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes untuk pencarian cepat
CREATE INDEX idx_judul ON archives(judul);
CREATE INDEX idx_nomor ON archives(nomor_dokumen);

SET FOREIGN_KEY_CHECKS = 1;