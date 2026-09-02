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

// Run this function ONCE manually from the Apps Script editor to grant Google Drive permissions
function authorize() {
  // This dummy call forces Google Apps Script to request full Drive write permissions
  try {
    DriveApp.createFile('dummy.txt', 'dummy content');
  } catch (e) {}
  Logger.log("Authorization successful!");
}

// Handle GET request to fetch Dropdowns and POs
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Handle fetching a single PO by row index
    if (e.parameter.action === 'getPOByRow' && e.parameter.rowIndex) {
      const rowIndex = parseInt(e.parameter.rowIndex, 10);
      const responsesSheet = ss.getSheetByName(RESPONSES_TAB);
      
      if (rowIndex > 1 && rowIndex <= responsesSheet.getLastRow()) {
        const row = responsesSheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
        const poData = {
          rowIndex: rowIndex,
          timestamp: row[0],
          email: row[1],
          fileNumber: row[2],
          poDate: row[3] ? Utilities.formatDate(new Date(row[3]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : '',
          poNumber: row[4],
          retailerName: row[5],
          retailerCountry: row[6],
          exFactoryDate: row[7] ? Utilities.formatDate(new Date(row[7]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : '',
          deliveryAddress: row[8],
          poLink: row[9],
          onboardVesselDate: row[10] ? Utilities.formatDate(new Date(row[10]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : '',
          poAmount: row[11],
          buyerName: row[14] || row[2]
        };
        
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          data: poData
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Invalid row index'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Handle fetching POs for a specific user
    if (e.parameter.action === 'getPOs' && e.parameter.email) {
      const responsesSheet = ss.getSheetByName(RESPONSES_TAB);
      const data = responsesSheet.getDataRange().getValues();
      const userPOs = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const emailInSheet = String(row[1] || '').trim().toLowerCase();
        const emailRequested = String(e.parameter.email || '').trim().toLowerCase();
        
        if (emailInSheet === emailRequested) {
          userPOs.push({
            rowIndex: i + 1,
            timestamp: row[0],
            email: row[1],
            fileNumber: row[2],
            buyerName: row[14] || row[2], // Fallback to column C for old entries
            poDate: row[3] ? Utilities.formatDate(new Date(row[3]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : '',
            poNumber: row[4],
            retailerName: row[5],
            retailerCountry: row[6],
            exFactoryDate: row[7] ? Utilities.formatDate(new Date(row[7]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : '',
            deliveryAddress: row[8],
            poLink: row[9],
            onboardVesselDate: row[10] ? Utilities.formatDate(new Date(row[10]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : '',
            poAmount: row[11]
          });
        }
      }
      
      // Sort by newest first
      userPOs.sort((a, b) => b.rowIndex - a.rowIndex);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: userPOs
      })).setMimeType(ContentService.MimeType.JSON);
    }

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
    // Get Buyer Sources (Column A)
    const buyerSourcesRange = dropDownSheet.getRange('A2:A' + lrDrop);
    const buyerSources = [...new Set(buyerSourcesRange.getValues().flat().filter(String))];

    // Get Buyer Sub Sources (Column C)
    const buyerSubSourcesRange = dropDownSheet.getRange('C2:C' + lrDrop);
    const buyerSubSources = [...new Set(buyerSubSourcesRange.getValues().flat().filter(String))];

    // Get Payment Terms 1 (Column K)
    const paymentTerms1Range = dropDownSheet.getRange('K2:K' + lrDrop);
    const paymentTerms1 = [...new Set(paymentTerms1Range.getValues().flat().filter(String))];

    // Get Payment Terms 2 (Column L)
    const paymentTerms2Range = dropDownSheet.getRange('L2:L' + lrDrop);
    const paymentTerms2 = [...new Set(paymentTerms2Range.getValues().flat().filter(String))];

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
        buyers: buyers,
        buyerSources: buyerSources,
        buyerSubSources: buyerSubSources,
        paymentTerms1: paymentTerms1,
        paymentTerms2: paymentTerms2
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
    
    // Handle Adding New Dropdown Option
    if (data.formType === 'addDropdownOption') {
      const dropDownSheet = ss.getSheetByName('Drop Downs');
      if (!dropDownSheet) {
        throw new Error("Drop Downs sheet not found");
      }
      
      const fieldMap = {
        'buyerSource': 1,      // Col A
        'buyerSubSource': 3,   // Col C
        'buyerCountry': 6,     // Col F
        'paymentTerms1': 11,   // Col K
        'paymentTerms2': 12    // Col L
      };
      
      const colIndex = fieldMap[data.field];
      if (!colIndex) {
        throw new Error("Invalid field for dropdown addition");
      }
      
      const colData = dropDownSheet.getRange(1, colIndex, dropDownSheet.getLastRow() || 1, 1).getValues();
      let lastRow = 1;
      const incomingValue = String(data.value || '').trim().toLowerCase();
      
      for (let i = colData.length - 1; i >= 0; i--) {
        const cellValue = String(colData[i][0] || '').trim().toLowerCase();
        
        if (cellValue === incomingValue) {
           return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Duplicate Entry: This option already exists.'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        if (lastRow === 1 && colData[i][0] !== "" && colData[i][0] !== null) {
          lastRow = i + 1;
        }
      }
      
      dropDownSheet.getRange(lastRow + 1, colIndex).setValue(data.value);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Option added successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Buyer Name Form Submission
    if (data.formType === 'addBuyer') {
      const buyerResponsesSheet = ss.getSheetByName('Form Responses 3');
      if (!buyerResponsesSheet) {
        throw new Error("Form Responses 3 sheet not found");
      }
      
      // Check for duplicate Buyer Name
      const buyerSheet = ss.getSheetByName('Buyer Name');
      if (buyerSheet) {
        const lrBuyer = Math.max(buyerSheet.getLastRow(), 2);
        const buyerData = buyerSheet.getRange('G2:G' + lrBuyer).getValues();
        const incomingName = String(data.buyerName || '').trim().toLowerCase();
        
        const isDuplicate = buyerData.some(row => String(row[0] || '').trim().toLowerCase() === incomingName);
        if (isDuplicate) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Duplicate Buyer Name: This buyer already exists.'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      const timestamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "dd-MMM-yyyy HH:mm:ss");
      
      const newBuyerRow = [
        timestamp,
        data.emailAddress || '',
        data.buyerSource || '',
        data.commission1 || '',
        data.buyerSubSource || '',
        data.commission2 || '',
        data.buyerName || '',
        data.buyerCountry || '',
        data.billingAddress || '',
        data.paymentTerms1 || '',
        data.paymentTerms2 || '',
        data.buyerShortName || ''
      ];
      
      buyerResponsesSheet.appendRow(newBuyerRow);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Buyer added successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const responsesSheet = ss.getSheetByName(RESPONSES_TAB);
    
    // Append shortName to poNumber
    if (data.poNumber && data.buyerName) {
      const buyerSheet = ss.getSheetByName('Buyer Name');
      if (buyerSheet) {
        const lrBuyer = Math.max(buyerSheet.getLastRow(), 2);
        const buyerData = buyerSheet.getRange('A2:O' + lrBuyer).getValues();
        const matchedBuyer = buyerData.find(row => String(row[6] || '').trim().toLowerCase() === String(data.buyerName).trim().toLowerCase());
        if (matchedBuyer && matchedBuyer[14]) {
          const suffix = '_' + String(matchedBuyer[14]).trim();
          if (!String(data.poNumber).endsWith(suffix)) {
            data.poNumber = String(data.poNumber) + suffix;
          }
        }
      }
    }

    // Check for Duplicate Entry on Create
    if (data.action !== 'update' && data.poNumber && data.buyerName) {
      const existingData = responsesSheet.getDataRange().getValues();
      for (let i = 1; i < existingData.length; i++) {
        const existingBuyer = String(existingData[i][14] || existingData[i][2] || '').trim().toLowerCase();
        const existingPo = String(existingData[i][4] || '').trim().toLowerCase();
        
        if (existingBuyer === String(data.buyerName).trim().toLowerCase() && 
            existingPo === String(data.poNumber).trim().toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Duplicate Entry: This PO Number for this Buyer already exists.'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    // Create new row array based on columns A to O
    // ColA: Timestamp
    // ColB: Email
    // ColC: File Number
    // ColD: PO Date
    // ColE: Buyer PO Number
    // ColF: Retailer Name
    // ColG: Retailer Country
    // ColH: Ex-Factory Date
    // ColI: Delivery Address
    // ColJ: PO Link
    // ColK: Onboard Vessel Date
    // ColL: PO Amount
    // ColM: Empty
    // ColN: Empty
    // ColO: Buyer Name
    
    let poLink = data.poLink || '';
    
    // Handle File Upload to Google Drive
    if (data.fileContent) {
      try {
        const folder = DriveApp.getFolderById('11mJtKgVh7RSxfgZbhwdfKuMaHb8i4y-KCnA5jwMM_C_VroHeCAuIR4ZS-eW3xFvgdLueQHVw');
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileContent), data.mimeType || 'application/pdf', data.fileName || 'Uploaded_PO');
        const newFile = folder.createFile(blob);
        // newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // Commented out to prevent Workspace policy errors
        poLink = newFile.getUrl();
      } catch (e) {
        console.error("Error uploading file to Drive: " + e.toString());
        poLink = 'Error uploading: ' + data.fileName + ' | Error: ' + e.toString();
      }
    }
    
    const newRow = [
      data.timestamp || new Date(),
      data.email || '',
      data.fileNumber || '',
      data.poDate || '',
      data.poNumber || '',
      data.retailerName || '',
      data.retailerCountry || '',
      data.exFactoryDate || '',
      data.deliveryAddress || '',
      poLink,
      data.onboardVesselDate || '',
      data.poAmount || '',
      '',
      '',
      data.buyerName || ''
    ];
    
    if (data.action === 'update' && data.rowIndex) {
      // For updates, we keep the original timestamp if not provided new
      if (data.originalTimestamp) {
        newRow[0] = data.originalTimestamp;
      }
      
      // Preserve Col M (S. No.) and Col N (Edit URL)
      const existingRow = responsesSheet.getRange(data.rowIndex, 1, 1, 15).getValues()[0];
      newRow[12] = existingRow[12];
      newRow[13] = existingRow[13];
      
      responsesSheet.getRange(data.rowIndex, 1, 1, 15).setValues([newRow]);
    } else {
      responsesSheet.appendRow(newRow);
      
      // Add S.No and Edit URL
      const lastRow = responsesSheet.getLastRow();
      responsesSheet.getRange(lastRow, 13).setValue(lastRow - 1);
      const baseUrl = data.baseUrl || 'https://export-buyer-po-entry.vercel.app';
      const editUrl = `${baseUrl}/#/?editRow=${lastRow}`;
      responsesSheet.getRange(lastRow, 14).setValue(editUrl);
      
      // WhatsApp Automation for New Entries
      try {
        const waSheet = ss.getSheetByName('whatsappNumber');
        if (waSheet) {
          const waData = waSheet.getDataRange().getValues();
          const requests = [];
          const MAYTAPI_PRODUCT_ID = '0d0df307-0553-4dfd-8597-e3c2fd5300eb';
          const MAYTAPI_PHONE_ID = '34244';
          const MAYTAPI_TOKEN = '54f10e32-bdf4-49cd-a464-33dc87c7c001';
          const apiUrl = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage`;
          
          for (let i = 1; i < waData.length; i++) {
            const name = waData[i][0];
            const rawNumber = String(waData[i][1]).replace(/\D/g, ''); // Extract only digits
            if (!name || !rawNumber) continue;
            
            // Format number (prepend 91 if it's 10 digits)
            let formattedNumber = rawNumber;
            if (formattedNumber.length === 10) {
              formattedNumber = '91' + formattedNumber;
            }
            
            const currentHour = new Date().getHours();
            let greetingTime = 'Good Evening';
            if (currentHour < 12) {
              greetingTime = 'Good Morning';
            } else if (currentHour < 17) {
              greetingTime = 'Good Afternoon';
            }
            const messageText = `Dear ${name} Ji,\n${greetingTime}!\n\nA new Purchase Order has been submitted.\n📌 PO Number: ${data.poNumber || 'N/A'}\n👤 Buyer: ${data.buyerName || 'N/A'}\n🏢 Retailer: ${data.retailerName || 'N/A'}\n💰 Amount: ${data.poAmount || 'N/A'}\n📅 PO Date: ${data.poDate || 'N/A'}\n\nPlease find the attached document.`;
            
            let payload = {
              to_number: formattedNumber,
              type: "text",
              message: messageText
            };
            
            // If file content exists, send as media using base64
            if (data.fileContent) {
              payload = {
                to_number: formattedNumber,
                type: "media",
                // Adding name=... to the data URI and a separate filename property for compatibility
                message: `data:${data.mimeType || 'application/pdf'};name=${data.fileName || 'PO_Document.pdf'};base64,${data.fileContent}`,
                text: messageText,
                filename: data.fileName || 'PO_Document.pdf'
              };
            }
            
            requests.push({
              url: apiUrl,
              method: 'post',
              headers: {
                'x-maytapi-key': MAYTAPI_TOKEN,
                'Content-Type': 'application/json'
              },
              payload: JSON.stringify(payload)
            });
          }
          
          if (requests.length > 0) {
            // Send all requests in parallel
            UrlFetchApp.fetchAll(requests);
          }
        }
      } catch (waError) {
        console.error("WhatsApp Error:", waError);
      }
    }
    
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
