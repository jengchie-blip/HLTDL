import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Ensure API key is available in the environment
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateAssistantResponse = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[] = []
): Promise<string> => {
  if (!API_KEY) {
    return "API Key is missing. Please configure the environment variable.";
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a helpful assistant for a workforce management system. You can help analyze productivity trends, explain system stats, or draft reports.",
      },
      history: history,
    });

    const result: GenerateContentResponse = await chat.sendMessage({
      message: prompt
    });

    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};