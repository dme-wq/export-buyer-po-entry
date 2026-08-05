/**
 * Google Apps Script for Order to Dispatch FMS
 * Sheet ID: 16Qy4-m-cBaMrsjAWsgRbWIY3lwj84CURaWHcg93wZdM
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Deploy > New Deployment > Web App.
 * 5. Set access to "Anyone".
 * 6. Use the Web App URL in the frontend fetch requests.
 */

const SHEET_ID = '16Qy4-m-cBaMrsjAWsgRbWIY3lwj84CURaWHcg93wZdM';
const RESPONSES_TAB = 'Form Responses 2';
const DROPDOWNS_TAB = 'Drop Downs';

// Handle GET request to fetch Dropdowns
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const dropDownSheet = ss.getSheetByName(DROPDOWNS_TAB);
    
    // Get Retailer Names (Column G)
    const retailerNamesRange = dropDownSheet.getRange('G2:G' + dropDownSheet.getLastRow());
    const retailerNames = retailerNamesRange.getValues().flat().filter(String);
    
    // Get Retailer Countries (Column F)
    const retailerCountriesRange = dropDownSheet.getRange('F2:F' + dropDownSheet.getLastRow());
    const retailerCountries = retailerCountriesRange.getValues().flat().filter(String);
    
    // Remove duplicates
    const uniqueNames = [...new Set(retailerNames)];
    const uniqueCountries = [...new Set(retailerCountries)];
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: {
        retailers: uniqueNames,
        countries: uniqueCountries
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST request to save Form Data
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const responsesSheet = ss.getSheetByName(RESPONSES_TAB);
    
    // Create new row array based on columns A to K
    // ColA: Timestamp
    // ColB: Email
    // ColC: Buyer Name
    // ColD: PO Date
    // ColE: Buyer PO Number
    // ColF: Retailer Name
    // ColG: Retailer Country
    // ColH: Ex-Factory Date
    // ColI: Delivery Address
    // ColJ: PO Link (File URL if uploaded to Drive, for now taking URL or filename)
    // ColK: Onboard Vessel Date
    
    let poLink = data.poLink || '';
    
    // Handle File Upload to Google Drive
    if (data.fileContent) {
      try {
        const folder = DriveApp.getFolderById('1rXerF7ZuTreU2FGUvsaT555PTmksrzRHyIib9TuIMwXquZNzfOhv-HmVb6ZJuB4J7nHExW8V');
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileContent), data.mimeType || 'application/pdf', data.fileName || 'Uploaded_PO');
        const newFile = folder.createFile(blob);
        newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        poLink = newFile.getUrl();
      } catch (e) {
        console.error("Error uploading file to Drive: " + e.toString());
        poLink = 'Error uploading: ' + data.fileName;
      }
    }
    
    const newRow = [
      data.timestamp || new Date(),
      data.email || '',
      data.buyerName || '',
      data.poDate || '',
      data.poNumber || '',
      data.retailerName || '',
      data.retailerCountry || '',
      data.exFactoryDate || '',
      data.deliveryAddress || '',
      poLink,
      data.onboardVesselDate || ''
    ];
    
    responsesSheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Support for CORS Preflight
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
