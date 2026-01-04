import React, { useState, useCallback, useEffect } from 'react';
import { ImageState } from './types';
import { ImageSlot } from './components/ImageSlot';
import { SparklesIcon, LoadingSpinner, DownloadIcon, ZoomInIcon, CloseIcon } from './components/Icons';
import { generateImagesWithGemini } from './services/geminiService';

const initialImageStates = (prefix: string, count: number): ImageState[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    file: null,
    base64: null,
    isEnabled: true,
  }));

function App() {
  const [characterImages, setCharacterImages] = useState<ImageState[]>(initialImageStates('char', 4));
  const [productImages, setProductImages] = useState<ImageState[]>(initialImageStates('prod', 2));
  const [backgroundImage, setBackgroundImage] = useState<ImageState>({ id: 'bg-1', file: null, base64: null, isEnabled: true });
  
  const [prompt, setPrompt] = useState<string>('');
  const [numImages, setNumImages] = useState<number>(1);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // API Key Management
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>('');

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
      setTempKey(storedKey);
    } else {
      setShowSettings(true); // Force show settings if no key
    }
  }, []);

  const handleSaveKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowSettings(false);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };
  
  const handleImageChange = useCallback(async (id: string, file: File) => {
    const base64 = await fileToBase64(file);

    const updateState = (setter: React.Dispatch<React.SetStateAction<ImageState[]>>, currentImages: ImageState[]) => {
      setter(currentImages.map(img => img.id === id ? { ...img, file, base64, isEnabled: true } : img));
    };

    if (id.startsWith('char')) updateState(setCharacterImages, characterImages);
    else if (id.startsWith('prod')) updateState(setProductImages, productImages);
    else if (id.startsWith('bg')) setBackgroundImage({ id, file, base64, isEnabled: true });

  }, [characterImages, productImages]);
  
  const handleToggleChange = useCallback((id: string, isEnabled: boolean) => {
    const updateState = (setter: React.Dispatch<React.SetStateAction<ImageState[]>>, currentImages: ImageState[]) => {
      setter(currentImages.map(img => img.id === id ? { ...img, isEnabled } : img));
    };

    if (id.startsWith('char')) updateState(setCharacterImages, characterImages);
    else if (id.startsWith('prod')) updateState(setProductImages, productImages);
    else if (id.startsWith('bg')) setBackgroundImage(prev => ({ ...prev, isEnabled }));
    
  }, [characterImages, productImages]);

  const handleGenerate = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const allReferenceImages = [...characterImages, ...productImages, backgroundImage];
    const enabledImages = allReferenceImages.filter(img => img.isEnabled && img.file);

    if (enabledImages.length === 0 && !prompt.trim()) {
      setError('Vui lòng tải lên ít nhất một ảnh tham chiếu hoặc nhập mô tả.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      // Pass apiKey to the service
      const resultUrls = await generateImagesWithGemini(prompt, allReferenceImages, numImages, apiKey);
      setGeneratedImages(resultUrls);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không mong muốn. Đã dừng do lỗi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-100 text-dark-content">
      <div className="flex-grow p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="text-center md:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary mb-2">
                Gemini Studio
              </h1>
              <p className="text-lg text-gray-600">Tạo ảnh chuyên nghiệp</p>
            </div>
            
            <button 
              onClick={() => setShowSettings(true)}
              className="mt-4 md:mt-0 flex flex-col items-center group"
            >
               <div className="px-4 py-2 bg-white border border-red-200 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  <span className="font-semibold text-gray-700">Cài đặt API Key</span>
               </div>
               {!apiKey && (
                 <span className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                   Lấy API key để sử dụng app
                 </span>
               )}
            </button>
          </header>

          {/* Top Section: Inputs organized horizontally */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Character Column */}
            <div className="bg-dark-200 p-5 rounded-xl shadow-sm border border-dark-300">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b-2 border-dark-300 pb-2">Ảnh tham chiếu Nhân vật</h3>
              <div className="grid grid-cols-2 gap-4">
                {characterImages.map(img => (
                  <ImageSlot key={img.id} {...img} label={`NV ${img.id.split('-')[1]}`} imageSrc={img.file ? URL.createObjectURL(img.file) : null} onImageChange={handleImageChange} onToggleChange={handleToggleChange} showToggle={true} className="h-28" />
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div className="bg-dark-200 p-5 rounded-xl shadow-sm border border-dark-300">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b-2 border-dark-300 pb-2">Ảnh tham chiếu Sản phẩm</h3>
              <div className="grid grid-cols-2 gap-4">
                {productImages.map(img => (
                  <ImageSlot key={img.id} {...img} label={`SP ${img.id.split('-')[1]}`} imageSrc={img.file ? URL.createObjectURL(img.file) : null} onImageChange={handleImageChange} onToggleChange={handleToggleChange} showToggle={true} className="h-28" />
                ))}
              </div>
            </div>

            {/* Background Column */}
            <div className="bg-dark-200 p-5 rounded-xl shadow-sm border border-dark-300">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b-2 border-dark-300 pb-2">Ảnh tham chiếu Nền</h3>
              <div className="">
                 <ImageSlot {...backgroundImage} label="Nền" imageSrc={backgroundImage.file ? URL.createObjectURL(backgroundImage.file) : null} onImageChange={handleImageChange} onToggleChange={handleToggleChange} showToggle={true} className="w-full h-64 lg:h-64" />
              </div>
            </div>

          </div>

          {/* Middle Section: Prompt and Controls */}
          <div className="bg-dark-200 p-6 rounded-xl shadow-lg border border-dark-300 mb-8">
              <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-grow">
                      <label htmlFor="prompt" className="block text-lg font-semibold mb-2 text-gray-800">Prompt của bạn (Mô tả ảnh)</label>
                      <textarea
                          id="prompt"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ví dụ: 'Nhân vật trong thành phố tương lai, cầm sản phẩm.'"
                          className="w-full h-32 p-4 bg-white border-2 border-dark-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors text-gray-800 placeholder-gray-400"
                      />
                  </div>
                  
                  <div className="w-full lg:w-72 flex flex-col justify-between">
                      <div>
                          <label htmlFor="num-images" className="block text-lg font-semibold mb-2 text-gray-800">Số lượng ảnh</label>
                          <input
                              id="num-images"
                              type="number"
                              value={numImages}
                              onChange={(e) => setNumImages(Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 1)))}
                              min="1"
                              max="4"
                              className="w-full p-3 bg-white border-2 border-dark-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors text-gray-800 mb-4"
                          />
                      </div>
                      
                      <button
                          onClick={handleGenerate}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
                      >
                          {isLoading ? <LoadingSpinner /> : <SparklesIcon className="w-6 h-6 mr-2" />}
                          {isLoading ? 'Đang tạo...' : 'Tạo ảnh ngay'}
                      </button>
                  </div>
              </div>
          </div>

          {/* Bottom Section: Results */}
          <div className="flex flex-col space-y-4">
              <h2 className="text-2xl font-semibold text-center text-gray-800">Kết quả</h2>
              <div className={`w-full min-h-[24rem] bg-dark-200 rounded-xl border-2 p-6 shadow-sm ${error ? 'border-red-300 bg-red-50' : 'border-dark-300'}`}>
              {isLoading && (
                  <div className="flex flex-col items-center justify-center h-64">
                      <LoadingSpinner />
                      <span className="mt-4 text-lg text-gray-500">
                        AI đang sáng tạo... <br/>
                        <span className="text-xs text-gray-400">Hệ thống sẽ tự động thử lại model khác nếu quá tải.</span>
                      </span>
                  </div>
              )}
              {error && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">Đã dừng do lỗi</p>
                    <p className="text-red-500">{error}</p>
                </div>
              )}
              {!isLoading && !error && generatedImages.length === 0 && (
                  <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400 text-lg">Tác phẩm của bạn sẽ xuất hiện ở đây</p>
                  </div>
              )}
              {!isLoading && generatedImages.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {generatedImages.map((src, index) => (
                      <div key={index} className="group relative bg-white rounded-xl overflow-hidden border border-dark-300 shadow-md aspect-square">
                          <img src={src} alt={`Generated by Gemini ${index + 1}`} className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDownload(src, index)} className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors transform hover:scale-110" title="Tải về">
                              <DownloadIcon className="w-6 h-6" />
                              </button>
                              <button onClick={() => setZoomedImage(src)} className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors transform hover:scale-110" title="Phóng to">
                              <ZoomInIcon className="w-6 h-6" />
                              </button>
                          </div>
                      </div>
                      ))}
                  </div>
              )}
              </div>
          </div>
        </div>
        
        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🔑 Cài đặt API Key
              </h2>
              
              <div className="mb-6 space-y-4">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Hướng dẫn lấy Key:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-600">Google AI Studio</a></li>
                      <li>Tạo key mới trong dự án của bạn (Miễn phí)</li>
                      <li>Copy và dán vào ô bên dưới</li>
                    </ol>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                       <a 
                         href="https://drive.google.com/drive/folders/1G6eiVeeeEvsYgNk2Om7FEybWf30EP1HN?usp=drive_link" 
                         target="_blank" 
                         rel="noreferrer"
                         className="flex items-center gap-1 text-brand-primary font-bold hover:underline"
                       >
                         📄 Xem hướng dẫn chi tiết tại đây
                       </a>
                    </div>
                 </div>

                 <div>
                   <label className="block text-gray-700 font-medium mb-2">API Key của bạn</label>
                   <input 
                      type="password" 
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder="Dán key vào đây (AIza...)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                   />
                 </div>

                 <div className="bg-gray-50 p-3 rounded border border-gray-200 text-xs text-gray-500">
                    <strong>Lưu ý:</strong> Key được lưu cục bộ trên trình duyệt của bạn để thuận tiện cho lần sau.
                 </div>
                 
                 <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Thứ tự Model ưu tiên (Tự động chuyển khi lỗi):</p>
                    <div className="flex flex-wrap gap-2">
                       <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-200">1. Flash Preview (Nhanh)</span>
                       <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">2. Pro Preview (Mạnh)</span>
                       <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded border border-gray-200">3. Flash 2.5 (Ổn định)</span>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3">
                {apiKey && (
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Đóng
                  </button>
                )}
                <button 
                  onClick={handleSaveKey}
                  disabled={!tempKey.trim()}
                  className="px-6 py-2 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Lưu & Sử dụng
                </button>
              </div>
            </div>
          </div>
        )}

        {zoomedImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
            <button 
              onClick={() => setZoomedImage(null)} 
              className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed result" 
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        )}
      </div>

      {/* Footer Promotion */}
      <footer className="bg-slate-800 text-slate-300 py-8 px-4 mt-auto border-t border-slate-700 no-print">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
            <p className="font-bold text-lg md:text-xl text-blue-200 mb-3 leading-relaxed">
              ĐĂNG KÝ KHOÁ HỌC THỰC CHIẾN VIẾT SKKN, TẠO APP DẠY HỌC, TẠO MÔ PHỎNG TRỰC QUAN <br className="hidden md:block" />
              <span className="text-yellow-400">CHỈ VỚI 1 CÂU LỆNH</span>
            </p>
            <a 
              href="https://forms.gle/d7AmcT9MTyGy7bJd8" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all transform hover:-translate-y-1 shadow-lg shadow-blue-900/50"
            >
              ĐĂNG KÝ NGAY
            </a>
          </div>
          
          <div className="space-y-2 text-sm md:text-base">
            <p className="font-medium text-slate-400">Mọi thông tin vui lòng liên hệ:</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
              <a 
                href="https://www.facebook.com/tranhoaithanhvicko/" 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-blue-400 transition-colors duration-200 flex items-center gap-2"
              >
                <span className="font-bold">Facebook:</span> tranhoaithanhvicko
              </a>
              <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-600"></div>
              <span className="hover:text-emerald-400 transition-colors duration-200 cursor-default flex items-center gap-2">
                 <span className="font-bold">Zalo:</span> 0348296773
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;