import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImageState } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

export const generateImagesWithGemini = async (
  prompt: string,
  referenceImages: ImageState[],
  numberOfImages: number
): Promise<string[]> => {
  const model = 'gemini-2.5-flash-image';

  // The text prompt must come first.
  const parts: any[] = [{ text: prompt }];
  
  // Add enabled reference images
  referenceImages.forEach(img => {
    if (img.isEnabled && img.base64 && img.file) {
      parts.push(fileToGenerativePart(img.base64, img.file.type));
    }
  });

  if (parts.length <= 1 && !prompt.trim()) {
     throw new Error("A prompt and/or at least one reference image is required.");
  }


  try {
    const generationPromises: Promise<GenerateContentResponse>[] = [];
    
    // Create N promises for N API calls
    for (let i = 0; i < numberOfImages; i++) {
        generationPromises.push(ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        }));
    }

    const responses = await Promise.all(generationPromises);

    const imageUrls = responses.map(response => {
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("One of the generated responses did not contain an image. The model may have refused the prompt.");
    });
    
    return imageUrls.filter((url): url is string => !!url);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate images. Please check the console for details.");
  }
};
