<?php
/**
 * API Backend untuk Repo PKKII Universitas Airlangga
 * URL API: http://ppk2ipe.unair.ac.id/filearsip/api.php
 * Direktori File: http://ppk2ipe.unair.ac.id/filearsip/uploads/
 */

// --- 1. CORS & HEADERS (HARUS PALING ATAS) ---
// Kita set header ini SEBELUM melakukan apapun agar jika script error, browser tetap menerima header CORS.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: *"); // Izinkan semua header
header("Content-Type: application/json; charset=UTF-8");

// Handle Preflight Request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Matikan display error bawaan HTML, ganti dengan JSON Log
ini_set('display_errors', 0);
error_reporting(E_ALL);

function sendJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Global Exception Handler untuk menangkap Fatal Error dan mengubahnya jadi JSON
set_exception_handler(function($e) {
    sendJson(["status" => "error", "message" => "Server Error: " . $e->getMessage()], 500);
});

// Cek Batas Post Size (Jika file terlalu besar dan POST kosong)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
    sendJson(["status" => "error", "message" => "Ukuran file terlalu besar. Melebihi batas 'post_max_size' server hosting."], 413);
}

// --- 2. KONFIGURASI DATABASE ---
$host = 'localhost';
$username = 'ppk2ipe_arsipdio'; 
$password = '@Dioadam27';       
$dbname   = 'ppk2ipe_arsipbaru'; 

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    sendJson(["status" => "error", "message" => "Koneksi Database Gagal: " . $conn->connect_error], 500);
}

// --- 3. KONFIGURASI URL & FOLDER ---
// Berdasarkan info: http://ppk2ipe.unair.ac.id/filearsip
// Gunakan URL http eksplisit karena user memintanya, atau protocol relative
$baseUrl = "http://ppk2ipe.unair.ac.id/filearsip/uploads/";
$targetDir = __DIR__ . "/uploads/";

// --- 4. ROUTING ---
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT id, nomor_dokumen, judul, deskripsi, kategori, tahun, tags, file_url, file_size, created_at FROM archives ORDER BY created_at DESC";
    $result = $conn->query($sql);
    
    $archives = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $archives[] = [
                "id" => $row['id'],
                "nomorDokumen" => $row['nomor_dokumen'],
                "judul" => $row['judul'],
                "deskripsi" => $row['deskripsi'],
                "kategori" => $row['kategori'],
                "tahun" => $row['tahun'],
                "tags" => $row['tags'] ? explode(",", $row['tags']) : [],
                "fileUrl" => $row['file_url'],
                "fileSize" => $row['file_size'],
                "tanggalUpload" => $row['created_at']
            ];
        }
    }
    sendJson(["status" => "success", "data" => $archives]);

} elseif ($method === 'POST') {
    
    // Cek Folder Uploads
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            sendJson(["status" => "error", "message" => "Gagal membuat folder 'uploads'. Cek permission folder public_html."], 500);
        }
    }
    
    if (!is_writable($targetDir)) {
        sendJson(["status" => "error", "message" => "Folder 'uploads' tidak bisa ditulis (Permission Denied). Mohon chmod 755 atau 777 folder uploads."], 500);
    }

    if (!isset($_FILES['file'])) {
        $msg = "File tidak ditemukan.";
        if (isset($_FILES['file']['error'])) $msg .= " Code: " . $_FILES['file']['error'];
        sendJson(["status" => "error", "message" => $msg], 400);
    }

    $file = $_FILES['file'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $codes = [
            1 => "File melebihi upload_max_filesize di php.ini",
            2 => "File melebihi MAX_FILE_SIZE form",
            3 => "File hanya terupload sebagian",
            4 => "Tidak ada file yang diupload",
            6 => "Missing temporary folder",
            7 => "Gagal menulis ke disk",
            8 => "Ekstensi PHP menghentikan upload"
        ];
        $errMessage = isset($codes[$file['error']]) ? $codes[$file['error']] : "Unknown Upload Error";
        sendJson(["status" => "error", "message" => "Upload Gagal: " . $errMessage], 400);
    }

    // Ambil Data Form
    $judul = $_POST['judul'] ?? 'Tanpa Judul';
    $nomorDokumen = $_POST['nomorDokumen'] ?? '-';
    $kategori = $_POST['kategori'] ?? 'Lainnya';
    $tahun = $_POST['tahun'] ?? date('Y');
    $deskripsi = $_POST['deskripsi'] ?? '';
    $tagsRaw = $_POST['tags'] ?? ''; 
    $folderId = $_POST['folderId'] ?? 'LAINNYA';

    // Validasi Ekstensi
    $fileExt = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
    $allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
    
    if (!in_array($fileExt, $allowedExts)) {
        sendJson(["status" => "error", "message" => "Format file .$fileExt tidak diizinkan."], 400);
    }

    // Generate Nama File Aman
    $fileName = time() . '_' . uniqid() . '.' . $fileExt;
    $targetFilePath = $targetDir . $fileName;

    if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
        
        $id = uniqid('doc_');
        $fileUrl = $baseUrl . $fileName;
        
        $sizeBytes = $file["size"];
        $fileSize = ($sizeBytes >= 1048576) ? number_format($sizeBytes / 1048576, 2) . ' MB' : number_format($sizeBytes / 1024, 2) . ' KB';

        $stmt = $conn->prepare("INSERT INTO archives (id, nomor_dokumen, judul, deskripsi, kategori, tahun, tags, file_url, file_size, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        if (!$stmt) {
             unlink($targetFilePath);
             sendJson(["status" => "error", "message" => "Database Error: " . $conn->error], 500);
        }

        $tagsArray = explode(',', $tagsRaw);
        $tagsClean = implode(', ', array_map('trim', $tagsArray));

        $stmt->bind_param("ssssssssss", $id, $nomorDokumen, $judul, $deskripsi, $kategori, $tahun, $tagsClean, $fileUrl, $fileSize, $folderId);

        if ($stmt->execute()) {
            sendJson([
                "status" => "success", 
                "message" => "Arsip berhasil disimpan",
                "data" => [
                    "id" => $id,
                    "fileUrl" => $fileUrl
                ]
            ]);
        } else {
            unlink($targetFilePath);
            sendJson(["status" => "error", "message" => "Gagal Insert Database: " . $stmt->error], 500);
        }
        $stmt->close();

    } else {
        $lastError = error_get_last();
        sendJson(["status" => "error", "message" => "Gagal memindahkan file (move_uploaded_file). Cek permission folder uploads. " . $lastError['message']], 500);
    }

} else {
    sendJson(["status" => "error", "message" => "Method not allowed"], 405);
}

$conn->close();
?>