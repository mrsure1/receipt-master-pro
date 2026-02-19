
import { GoogleGenAI, Type } from "@google/genai";
import { Category, PaymentMethod } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RECEIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    merchant_name: { type: Type.STRING, description: "Name of the store" },
    date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
    time: { type: Type.STRING, description: "Time in HH:mm format" },
    total_amount: { type: Type.NUMBER, description: "Total amount paid" },
    tax_amount: { type: Type.NUMBER, description: "Tax amount if available" },
    currency: { type: Type.STRING, description: "Currency code (default KRW)" },
    payment_method: { type: Type.STRING, description: "Method of payment (Card, Cash, Other)" },
    category: { type: Type.STRING, description: "Category (식비, 교통, 사무/업무, 의료/건강, 쇼핑/생필품, 문화/여가, 기타)" },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          qty: { type: Type.NUMBER },
          price: { type: Type.NUMBER },
          line_total: { type: Type.NUMBER }
        }
      }
    },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
    raw_text: { type: Type.STRING, description: "Full OCR text" }
  },
  required: ["merchant_name", "date", "total_amount", "currency", "confidence"]
};

export const extractReceiptData = async (base64Image: string): Promise<any> => {
  try {
    // Fixed: Using correct model name and content part structure for generateContent
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Analyze this receipt image. Extract all details into JSON format. Be accurate with merchant name, date, and items." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA
      }
    });

    // Fixed: response.text is a property, not a method
    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
