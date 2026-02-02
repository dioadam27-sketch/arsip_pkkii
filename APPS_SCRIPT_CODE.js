// SALIN KODE INI KE FILE 'Kode.gs' DI GOOGLE APPS SCRIPT EDITOR ANDA
// HAPUS SEMUA KODE LAMA SEBELUM MENEMPEL KODE INI

// PENTING: SETIAP KALI UPDATE KODE INI, ANDA HARUS:
// 1. Klik tombol "Deploy" -> "Manage deployments"
// 2. Klik icon pensil (Edit) pada deployment aktif
// 3. Pada dropdown "Version", pilih "New version"
// 4. Klik "Deploy"
// JIKA TIDAK DILAKUKAN, PERUBAHAN TIDAK AKAN EFEK.

/*
  KONFIGURASI DEPLOYMENT SAAT INI:
  - Target Folder ID: 1M_o4tzGSdbSk5f2iLPFjm7oWbpXk2Bok
*/

function setup() {
  var sheet = getSheet("DB_ARSIP");
  var folderSheet = getSheet("DB_FOLDERS");
  Logger.log("Database siap.");
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// Helper untuk mendapatkan atau membuat Sheet
function getSheet(sheetName) {
  // 1. Coba akses Spreadsheet bound
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  // 2. Jika standalone, cari di Drive
  if (!ss) {
    var dbName = "DB_REPOSITORI_ARSIP_PKKII";
    var files = DriveApp.getFilesByName(dbName);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(dbName);
    }
  }

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Setup Header berdasarkan nama sheet
    if (sheetName === "DB_ARSIP") {
      sheet.appendRow(["ID", "Nomor Dokumen", "Judul", "Kategori", "Tahun", "Deskripsi", "Tags", "File URL", "Tanggal Upload", "Ukuran File"]);
    } else if (sheetName === "DB_FOLDERS") {
      sheet.appendRow(["ID", "Label", "Parent ID", "Created At"]);
      // Seed Default Folders jika kosong
      sheet.appendRow(["SK", "SK Rektor", "", new Date().toISOString()]);
      sheet.appendRow(["SURAT_TUGAS", "Surat Tugas", "", new Date().toISOString()]);
      sheet.appendRow(["AKADEMIK", "Dokumen Akademik", "", new Date().toISOString()]);
      sheet.appendRow(["LAPORAN", "Laporan Kegiatan", "", new Date().toISOString()]);
      sheet.appendRow(["LAINNYA", "Lainnya", "", new Date().toISOString()]);
    }
  }
  return sheet;
}

function handleRequest(e) {
  if (typeof e === 'undefined') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Jangan jalankan manual. Deploy sebagai Web App."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var isPost = e.postData && e.postData.contents;

  try {
    var sheetArsip = getSheet("DB_ARSIP");
    var sheetFolders = getSheet("DB_FOLDERS");

    // --- POST REQUESTS ---
    if (isPost) {
      var data = JSON.parse(e.postData.contents);
      var action = data.action || "upload"; 

      // ACTION: CREATE FOLDER
      if (action === "create_folder") {
        var newFolderId = data.id;
        var newLabel = data.label;
        var parentId = data.parentId || "";
        
        sheetFolders.appendRow([newFolderId, newLabel, parentId, new Date().toISOString()]);
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Folder berhasil dibuat",
          data: { id: newFolderId, label: newLabel, parentId: parentId }
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // ACTION: DELETE ARCHIVE
      else if (action === "delete_archive") {
        var idToDelete = data.id;
        var rows = sheetArsip.getDataRange().getValues();
        var deleted = false;

        // Loop untuk mencari ID dan menghapus baris (Mulai dari bawah agar aman jika multiple, meski ID unik)
        for (var i = rows.length - 1; i >= 1; i--) {
          if (String(rows[i][0]) === String(idToDelete)) {
            // Opsional: Hapus file fisik di Drive (jika ID di sheet adalah ID Drive)
            try {
               DriveApp.getFileById(idToDelete).setTrashed(true);
            } catch(err) {
               // Abaikan jika file tidak ketemu di Drive (mungkin sudah dihapus manual)
            }
            
            sheetArsip.deleteRow(i + 1); // +1 karena index sheet mulai dari 1
            SpreadsheetApp.flush(); // FLUSH: Pastikan tersimpan sebelum script selesai
            deleted = true;
            break; 
          }
        }

        if (deleted) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "Arsip berhasil dihapus"
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
           return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "ID Arsip tidak ditemukan"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // ACTION: DELETE FOLDER
      else if (action === "delete_folder") {
        var folderIdToDelete = data.id;
        var fRows = sheetFolders.getDataRange().getValues();
        var fDeleted = false;

        for (var j = fRows.length - 1; j >= 1; j--) {
          if (String(fRows[j][0]) === String(folderIdToDelete)) {
            sheetFolders.deleteRow(j + 1);
            SpreadsheetApp.flush(); // FLUSH: Pastikan tersimpan sebelum script selesai
            fDeleted = true;
            break;
          }
        }

        if (fDeleted) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "Folder berhasil dihapus"
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
           return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "ID Folder tidak ditemukan"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // ACTION: UPLOAD ARSIP (Default)
      else {
        // Simpan File ke Drive
        var folder;
        if (data.folderId && data.folderId.length > 5) {
          try { folder = DriveApp.getFolderById(data.folderId); } 
          catch (err) { folder = DriveApp.getRootFolder(); }
        } else {
          folder = DriveApp.getRootFolder();
        }
        
        var decoded = Utilities.base64Decode(data.fileData);
        var blob = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var timestamp = new Date().toISOString();
        var tagsString = Array.isArray(data.tags) ? data.tags.join(", ") : String(data.tags || "");
        
        sheetArsip.appendRow([
          file.getId(),
          data.nomorDokumen || "-",
          data.judul || "Tanpa Judul",
          data.kategori || "Lainnya",
          data.tahun || "-",
          data.deskripsi || "-",
          tagsString,
          file.getUrl(),
          timestamp,
          data.fileSize || "-"
        ]);

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Berhasil upload",
          data: { id: file.getId(), url: file.getUrl() }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } 
    
    // --- GET REQUEST (FETCH ALL) ---
    else {
      // 1. Ambil Data Arsip
      var archives = [];
      if (sheetArsip.getLastRow() > 1) {
        var rows = sheetArsip.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var row = rows[i];
          if (row[0]) { 
            archives.push({
              id: String(row[0]),
              nomorDokumen: String(row[1]),
              judul: String(row[2]),
              kategori: String(row[3]),
              tahun: String(row[4]),
              deskripsi: String(row[5]),
              tags: row[6] ? String(row[6]).split(",").map(function(s){ return s.trim(); }) : [],
              fileUrl: String(row[7]),
              tanggalUpload: String(row[8]),
              fileSize: String(row[9])
            });
          }
        }
        archives.reverse();
      }

      // 2. Ambil Data Folder
      var folders = [];
      if (sheetFolders.getLastRow() > 1) {
        var folderRows = sheetFolders.getDataRange().getValues();
        for (var j = 1; j < folderRows.length; j++) {
           var fRow = folderRows[j];
           if (fRow[0]) {
             folders.push({
               id: String(fRow[0]),
               label: String(fRow[1]),
               parentId: fRow[2] ? String(fRow[2]) : null
             });
           }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: {
          archives: archives,
          folders: folders
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server Error: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}