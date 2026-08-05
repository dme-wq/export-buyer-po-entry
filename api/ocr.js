export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileData, mimeType } = req.body; // fileData should be base64 string

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
      You are an expert OCR AI. Extract the following details from this Purchase Order document and return ONLY a valid JSON object.
      Do not include markdown wrappers like \`\`\`json.
      
      Required fields:
      - "buyerName": String (The name of the buyer/company issuing the PO)
      - "poDate": String (Date of the PO, format YYYY-MM-DD if possible)
      - "poNumber": String (The Buyer PO Number)
      - "exFactoryDate": String (Ex-Factory date, if found, format YYYY-MM-DD)
      - "deliveryAddress": String (The full delivery or shipping address)
      - "onboardVesselDate": String (Onboard Vessel date, if found, format YYYY-MM-DD)
      
      If a field is not found, leave its value as an empty string "".
    `;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: fileData
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(500).json({ error: 'Failed to process document with AI' });
    }

    // Parse the JSON response from Gemini
    const textResult = data.candidates[0].content.parts[0].text;
    const extractedJson = JSON.parse(textResult);

    return res.status(200).json(extractedJson);

  } catch (error) {
    console.error('OCR Error:', error);
    return res.status(500).json({ error: 'Internal server error during extraction' });
  }
}
