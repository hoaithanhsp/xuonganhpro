import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImageState } from '../types';

// Fallback Model List defined in priority order
const MODEL_FALLBACK_LIST = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash-image' // Using specific image model name for 2.5 series
];

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
  apiKey: string // Added apiKey parameter
): Promise<string[]> => {
  
  if (!apiKey) {
    throw new Error("Vui lòng nhập API Key trong phần Cài đặt.");
  }

  // Create a new client instance with the user's key
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // The text prompt must come first.
  const parts: any[] = [{ text: prompt }];
  
  // Add enabled reference images
  referenceImages.forEach(img => {
    if (img.isEnabled && img.base64 && img.file) {
      parts.push(fileToGenerativePart(img.base64, img.file.type));
    }
  });

  if (parts.length <= 1 && !prompt.trim()) {
     throw new Error("Cần nhập mô tả (prompt) hoặc tải lên ít nhất một ảnh tham chiếu.");
  }

  let lastError: any = null;

  // FALLBACK LOOP
  for (const model of MODEL_FALLBACK_LIST) {
    console.log(`Đang thử tạo ảnh với model: ${model}`);
    
    try {
      const generationPromises: Promise<GenerateContentResponse>[] = [];
      
      // Create N promises for N API calls
      for (let i = 0; i < numberOfImages; i++) {
          generationPromises.push(ai.models.generateContent({
              model, // Use the current model in the loop
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
          throw new Error(`Model ${model} trả về kết quả nhưng không có dữ liệu ảnh.`);
      });
      
      const validUrls = imageUrls.filter((url): url is string => !!url);
      
      if (validUrls.length > 0) {
        return validUrls; // Success! Return immediately.
      }

    } catch (error: any) {
      console.warn(`Model ${model} thất bại:`, error);
      lastError = error;
      // Continue to the next model in the list
    }
  }

  // If we reach here, all models failed
  console.error("Tất cả các model đều thất bại.", lastError);
  
  // Extract specific error message if possible
  let errorMessage = "Không thể tạo ảnh. Vui lòng kiểm tra API Key hoặc thử lại sau.";
  if (lastError) {
      if (lastError.message?.includes('429')) errorMessage = "Lỗi 429: Hết hạn ngạch (Quota Exceeded). Vui lòng đổi API Key khác.";
      else if (lastError.message) errorMessage = `Lỗi API: ${lastError.message}`;
  }
  
  throw new Error(errorMessage);
};