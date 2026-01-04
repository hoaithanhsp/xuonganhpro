import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImageState } from '../types';

// Danh sách Model Fallback
const MODEL_FALLBACK_LIST = [
  'imagen-3.0-generate-001',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-image',
];

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

  const ai = new GoogleGenAI({ apiKey });

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

  let lastError: any = null;

  // VÒNG LẶP FALLBACK
  for (const model of MODEL_FALLBACK_LIST) {
    console.log(`📡 Đang thử model: ${model}`);
    try {
      const generationPromises: Promise<GenerateContentResponse>[] = [];

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
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        throw new Error(`Model ${model} trả về thành công nhưng không có ảnh.`);
      });

      const validUrls = imageUrls.filter((url): url is string => !!url);
      if (validUrls.length > 0) {
        return validUrls; // Success!
      }

    } catch (error: any) {
      console.warn(`⚠️ Model ${model} thất bại:`, error);
      lastError = error;
    }
  }

  console.error("❌ Tất cả các model đều thất bại.", lastError);
  let errorMessage = lastError?.message || "Không thể tạo ảnh. Vui lòng thử lại sau.";
  if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
    errorMessage = "Lỗi 429: Tất cả các model đều hết Quota hoặc không khả dụng.";
  }
  throw new Error(errorMessage);
};
