// KODE KHUSUS STORAGE GOOGLE DRIVE
// Deploy sebagai Web App dengan akses: "Anyone" (Siapapun)

var MAIN_FOLDER_ID = "1M_o4tzGSdbSk5f2iLPFjm7oWbpXk2Bok";

function doPost(e) {
  // Selalu return JSON
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'upload_file_only') {
      return uploadFile(data);
    } else if (action === 'delete_file') {
      return deleteFile(data);
    } else {
      return createJSONOutput("error", "Invalid action");
    }

  } catch (error) {
    return createJSONOutput("error", "GAS Error: " + error.toString());
  }
}

function uploadFile(data) {
  try {
    var folder;
    try {
      folder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    } catch(e) {
      folder = DriveApp.getRootFolder();
    }

    var decoded = Utilities.base64Decode(data.fileData);
    var blob = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName);
    var file = folder.createFile(blob);
    
    // Set Public
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileSizeMB = file.getSize() / 1024 / 1024;
    var fileSizeStr = fileSizeMB < 1 ? (file.getSize()/1024).toFixed(2) + " KB" : fileSizeMB.toFixed(2) + " MB";

    return createJSONOutput("success", "File uploaded", {
      id: file.getId(),
      url: file.getUrl(),
      fileSize: fileSizeStr,
      mimeType: file.getMimeType()
    });

  } catch (err) {
    return createJSONOutput("error", "Upload Failed: " + err.toString());
  }
}

function deleteFile(data) {
  try {
    var fileId = data.id;
    if (fileId) {
      DriveApp.getFileById(fileId).setTrashed(true);
      return createJSONOutput("success", "File trashed");
    }
    return createJSONOutput("error", "No ID provided");
  } catch (err) {
    // Seringkali gagal jika file sudah tidak ada, kita anggap success saja biar flow tidak putus
    return createJSONOutput("success", "File might already be deleted or not found");
  }
}

function createJSONOutput(status, message, data) {
  var result = {
    status: status,
    message: message,
    data: data || null
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle GET untuk testing sederhana
function doGet(e) {
  return createJSONOutput("success", "GAS Storage Server is Running");
}