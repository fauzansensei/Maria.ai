import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = await genAI.models.list();
  for await (const model of models) {
    if (model.name.includes('gemini'))
    console.log(model.name);
  }
}
run();
