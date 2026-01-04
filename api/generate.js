export default async function handler(req, res) {
  // 1. Cấu hình CORS để cho phép Frontend gọi vào
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key');

  // Xử lý Preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ chấp nhận method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Lấy dữ liệu từ Frontend gửi lên
    const { model, contents } = req.body;
    const apiKey = req.headers['x-gemini-api-key'];

    // Validate dữ liệu
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API Key' });
    }
    if (!model) {
      return res.status(400).json({ error: 'Missing model parameter' });
    }

    // 3. Gọi Google Gemini API (Server-to-Server)
    // Dùng fetch trực tiếp để tránh các vấn đề dependency của SDK trong môi trường serverless
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: contents,
        // Cấu hình bổ sung nếu cần, ví dụ: safetySettings, generationConfig
        generationConfig: {
          // Với model tạo ảnh, thường không cần config phức tạp, model tự xử lý
        }
      })
    });

    const data = await googleResponse.json();

    // 4. Xử lý kết quả trả về
    if (!googleResponse.ok) {
      // Nếu Google báo lỗi, trả lỗi đó về cho Frontend
      console.error('Gemini API Error:', data);
      return res.status(googleResponse.status).json(data);
    }

    // Thành công
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}