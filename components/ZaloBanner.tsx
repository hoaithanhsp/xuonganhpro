import React from 'react';
import { SparklesIcon } from './Icons';

export const ZaloBanner: React.FC = () => {
  return (
    <div
      className="bg-gradient-to-r from-brand-primary to-brand-secondary p-4 rounded-lg my-6 text-white shadow-lg"
    >
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <SparklesIcon className="w-12 h-12 mr-4 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg">Hỗ trợ & Nhận Tool Miễn Phí!</h3>
            <p className="text-sm">Tham gia nhóm Zalo để nhận các công cụ mạnh mẽ và được hỗ trợ.</p>
          </div>
        </div>
        <a 
          href="https://zalo.me/g/dkhesm516"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-brand-primary font-bold py-2 px-4 rounded-full text-sm transition-transform hover:scale-105 w-full md:w-auto text-center"
        >
          Tham gia ngay
        </a>
      </div>
       <div className="mt-4 pt-4 border-t border-white/20">
        <h4 className="font-semibold mb-2">Công cụ miễn phí:</h4>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="https://drive.google.com/file/d/1tu2u4E6rKFRCFN4cLCIJ5ciE-bC0xRao/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="hover:underline">
              - Tool cắt video ra ảnh hàng loạt
            </a>
          </li>
          <li>
            <a href="https://drive.google.com/file/d/1c2yQP4efI1h_pbuTz-ijncvkTYdVX6uD/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="hover:underline">
              - Tool cắt video gốc ra các video nhỏ hàng loạt
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};