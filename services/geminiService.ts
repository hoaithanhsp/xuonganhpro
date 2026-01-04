import { ImageState } from '../types';

// Danh sách Model Fallback (Ưu tiên Banana/Flash Image, sau đó đến Pro)
const MODEL_FALLBACK_LIST = [
  'gemini-2.0-flash-exp',     // Model chính thức hỗ trợ tạo ảnh (Free Tier)
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

  // 1. Chuẩn bị payload dữ liệu (Parts)
  const parts: any[] = [{ text: prompt }];
  
  // Thêm các ảnh tham chiếu
  referenceImages.forEach(img => {
    if (img.isEnabled && img.base64 && img.file) {
      parts.push(fileToGenerativePart(img.base64, img.file.type));
    }
  });

  if (parts.length <= 1 && !prompt.trim()) {
     throw new Error("Cần nhập mô tả (prompt) hoặc tải lên ít nhất một ảnh tham chiếu.");
  }

  let lastError: any = null;

  // 2. VÒNG LẶP FALLBACK
  for (const model of MODEL_FALLBACK_LIST) {
    console.log(`📡 Đang gọi API trực tiếp (Client-Side) với model: ${model}`);
    
    try {
      const generationPromises: Promise<any>[] = [];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      // Tạo N requests song song cho N ảnh
      for (let i = 0; i < numberOfImages; i++) {
          const requestPromise = fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                 // Không set responseMimeType cho image generation để tránh lỗi
              }
            })
          }).then(async (res) => {
             const data = await res.json();
             if (!res.ok) {
               // Bắt lỗi từ Google trả về
               throw new Error(data.error?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`);
             }
             return data;
          });

          generationPromises.push(requestPromise);
      }

      // Chờ tất cả request hoàn tất (Trình duyệt sẽ đợi bao lâu cũng được, không bị giới hạn 10s)
      const responses = await Promise.all(generationPromises);

      // 3. Parse kết quả trả về
      const imageUrls = responses.map(response => {
          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          
          for (const part of parts) {
              if (part.inlineData) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
          }
          throw new Error(`Model ${model} trả về thành công nhưng không có dữ liệu ảnh.`);
      });
      
      const validUrls = imageUrls.filter((url): url is string => !!url);
      
      if (validUrls.length > 0) {
        return validUrls; // Thành công!
      }

    } catch (error: any) {
      console.warn(`⚠️ Model ${model} thất bại:`, error);
      lastError = error;
      // Thử model tiếp theo
    }
  }

  // Xử lý lỗi cuối cùng
  console.error("❌ Tất cả các model đều thất bại.", lastError);
  
  let errorMessage = "Không thể tạo ảnh. Vui lòng thử lại sau.";
  if (lastError) {
      const msg = lastError.message || JSON.stringify(lastError);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "Lỗi 429: Key hết hạn ngạch (Quota). Vui lòng đổi Key khác.";
      } else if (msg.includes('Failed to fetch')) {
        errorMessage = "Lỗi Kết nối (CORS/Network): Vui lòng kiểm tra lại mạng hoặc thử tắt VPN/Extension chặn quảng cáo.";
      } else {
        errorMessage = `Lỗi API: ${msg}`;
      }
  }
  
  throw new Error(errorMessage);
};
