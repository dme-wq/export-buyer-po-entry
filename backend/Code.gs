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
    
    // Prevent error if sheet has fewer than 2 rows
    const lrDrop = Math.max(dropDownSheet.getLastRow(), 2);
    
    // Get Retailer Names (Column G)
    const retailerNamesRange = dropDownSheet.getRange('G2:G' + lrDrop);
    const retailerNames = retailerNamesRange.getValues().flat().filter(String);
    
    // Get Retailer Countries (Column F)
    const retailerCountriesRange = dropDownSheet.getRange('F2:F' + lrDrop);
    const retailerCountries = retailerCountriesRange.getValues().flat().filter(String);
    
    // Remove duplicates for retailers
    const uniqueNames = [...new Set(retailerNames)];
    const uniqueCountries = [...new Set(retailerCountries)];
    
    // Get Buyer Data from 'Buyer Name' tab
    const buyerSheet = ss.getSheetByName('Buyer Name');
    let buyers = [];
    if (buyerSheet) {
      const lrBuyer = Math.max(buyerSheet.getLastRow(), 2);
      const buyerDataRange = buyerSheet.getRange('A2:O' + lrBuyer);
      const buyerData = buyerDataRange.getValues();
      buyers = buyerData.map(row => ({
        fileNumber: row[1] || '',      // Column B
        buyerName: row[6] || '',       // Column G
        shortName: row[14] || ''       // Column O
      })).filter(b => b.buyerName !== '');
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: {
        retailers: uniqueNames,
        countries: uniqueCountries,
        buyers: buyers
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
    // ColL: PO Amount
    
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
      data.onboardVesselDate || '',
      data.poAmount || ''
    ];
    
    responsesSheet.appendRow(newRow);
    
    // Auto-append new Retailer Name to Drop Downs (Col G)
    const dropDownSheet = ss.getSheetByName(DROPDOWNS_TAB);
    if (dropDownSheet) {
      if (data.retailerName) {
        const colG = dropDownSheet.getRange('G:G').getValues().flat().filter(String);
        if (colG.length > 0 && !colG.slice(1).includes(data.retailerName)) {
          dropDownSheet.getRange(colG.length + 1, 7).setValue(data.retailerName);
        }
      }
      
      // Auto-append new Retailer Country to Drop Downs (Col F)
      if (data.retailerCountry) {
        const colF = dropDownSheet.getRange('F:F').getValues().flat().filter(String);
        if (colF.length > 0 && !colF.slice(1).includes(data.retailerCountry)) {
          dropDownSheet.getRange(colF.length + 1, 6).setValue(data.retailerCountry);
        }
      }
    }
    
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
