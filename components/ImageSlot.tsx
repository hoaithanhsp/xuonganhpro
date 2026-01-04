import React, { useRef } from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { UploadIcon } from './Icons';

interface ImageSlotProps {
  id: string;
  label: string;
  imageSrc: string | null;
  onImageChange: (id: string, file: File) => void;
  isEnabled?: boolean;
  onToggleChange?: (id: string, isEnabled: boolean) => void;
  showToggle?: boolean;
  className?: string;
}

export const ImageSlot: React.FC<ImageSlotProps> = ({
  id,
  label,
  imageSrc,
  onImageChange,
  isEnabled = false,
  onToggleChange,
  showToggle = false,
  className = 'w-full h-32'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageChange(id, event.target.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {showToggle && onToggleChange && (
          <ToggleSwitch id={`toggle-${id}`} checked={isEnabled} onChange={(checked) => onToggleChange(id, checked)} />
        )}
      </div>
      <div
        onClick={handleClick}
        className={`relative ${className} bg-white rounded-lg border-2 border-dashed border-dark-300 flex items-center justify-center text-gray-500 cursor-pointer hover:border-brand-primary transition-colors group ${!isEnabled && showToggle ? 'opacity-40' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {imageSrc ? (
          <img src={imageSrc} alt={label} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="flex flex-col items-center">
            <UploadIcon className="w-8 h-8 mb-1 group-hover:text-brand-primary" />
            <span className="text-xs text-center">Tải ảnh</span>
          </div>
        )}
      </div>
    </div>
  );
};