import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const imagePath = 'entregaveis fotos/WhatsApp Image 2026-06-16 at 14.22.51 (1).jpeg';
    const imagePart = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
        mimeType: "image/jpeg"
      },
    };
    const result = await model.generateContent([
      "Extract the company name and the list of items from this checklist. Return JSON.",
      imagePart,
    ]);
    const response = await result.response;
    console.log(response.text());
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
