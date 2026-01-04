import { ImageState } from '../types';

// Danh sách Model Fallback (Ưu tiên Banana/Flash Image, sau đó đến Pro)
const MODEL_FALLBACK_LIST = [
  'gemini-2.5-flash-image',     // Model mặc định: Nhanh & Tối ưu cho ảnh
  'gemini-3-pro-image-preview'  // Model dự phòng: Chất lượng cao hơn
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
  // Text prompt luôn ở đầu
  const parts: any[] = [{ text: prompt }];
  
  // Thêm các ảnh tham chiếu
  referenceImages.forEach(img => {
    if (img.isEnabled && img.base64 && img.file) {
      parts.push(fileToGenerativePart(img.base64, img.file.type));
    }
  });

  // Validate input
  if (parts.length <= 1 && !prompt.trim()) {
     throw new Error("Cần nhập mô tả (prompt) hoặc tải lên ít nhất một ảnh tham chiếu.");
  }

  let lastError: any = null;

  // 2. VÒNG LẶP FALLBACK (Thử lần lượt từng model)
  for (const model of MODEL_FALLBACK_LIST) {
    console.log(`📡 Đang gọi API qua Proxy với model: ${model}`);
    
    try {
      const generationPromises: Promise<any>[] = [];
      
      // Tạo N requests song song cho N ảnh
      for (let i = 0; i < numberOfImages; i++) {
          // Thay vì gọi SDK, ta gọi vào API Route /api/generate của chính server mình
          const requestPromise = fetch('/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-gemini-api-key': apiKey // Gửi key qua header custom để bảo mật hơn query param
            },
            body: JSON.stringify({
              model: model,
              contents: [{ parts }]
            })
          }).then(async (res) => {
             const data = await res.json();
             if (!res.ok) {
               // Ném lỗi để catch ở dưới và chuyển model khác
               throw new Error(data.error?.message || data.error || `Lỗi HTTP ${res.status}`);
             }
             return data;
          });

          generationPromises.push(requestPromise);
      }

      // Chờ tất cả request hoàn tất
      const responses = await Promise.all(generationPromises);

      // 3. Parse kết quả trả về từ cấu trúc JSON của Google
      const imageUrls = responses.map(response => {
          // Cấu trúc: { candidates: [ { content: { parts: [ { inlineData: ... } ] } } ] }
          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          
          for (const part of parts) {
              if (part.inlineData) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
          }
          throw new Error(`Model ${model} trả về thành công nhưng không tìm thấy dữ liệu ảnh trong response.`);
      });
      
      const validUrls = imageUrls.filter((url): url is string => !!url);
      
      if (validUrls.length > 0) {
        return validUrls; // Thành công! Trả về ngay danh sách ảnh.
      }

    } catch (error: any) {
      console.warn(`⚠️ Model ${model} gặp lỗi:`, error);
      lastError = error;
      // Vòng lặp sẽ tiếp tục với model tiếp theo trong danh sách
    }
  }

  // Nếu chạy hết vòng lặp mà vẫn không có ảnh
  console.error("❌ Tất cả các model đều thất bại.", lastError);
  
  let errorMessage = "Không thể tạo ảnh. Vui lòng thử lại sau.";
  if (lastError) {
      const msg = lastError.message || JSON.stringify(lastError);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "Lỗi 429: Key của bạn đã hết lượt dùng (Quota Exceeded). Vui lòng đổi Key khác.";
      } else if (msg.includes('504') || msg.includes('Timeout')) {
        errorMessage = "Lỗi Timeout: Server xử lý quá lâu. Hãy thử giảm số lượng ảnh hoặc đổi model.";
      } else {
        errorMessage = `Lỗi API: ${msg}`;
      }
  }
  
  throw new Error(errorMessage);
};