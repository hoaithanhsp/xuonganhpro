import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImageState } from '../types';

// Helper: Chuyển đổi dữ liệu ảnh sang format API
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
  numberOfImages: number,
  apiKey: string
): Promise<string[]> => {

  if (!apiKey) {
    throw new Error("Vui lòng nhập API Key trong phần Cài đặt.");
  }

  // Initialize the client with the user-provided key
  const ai = new GoogleGenAI({ apiKey });
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
        contents: [{ parts }],
        config: {
          responseModalities: [Modality.IMAGE],
        },
      }));
    }

    const responses = await Promise.all(generationPromises);

    const imageUrls = responses.map(response => {
      // Updated parsing logic for the new SDK
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;

      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("One of the generated responses did not contain an image. The model may have refused the prompt.");
    });

    return imageUrls.filter((url): url is string => !!url);

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = error.message || "Failed to generate images.";
    if (errorMessage.includes('429')) errorMessage = "Lỗi 429: Quota exceeded. Hãy thử Key khác.";
    throw new Error(errorMessage);
  }
};
