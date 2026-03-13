
import React from 'react';
import { X, Download } from 'lucide-react';

interface Props {
  imageUri: string;
  onClose: () => void;
  title?: string;
}

const ImageModal: React.FC<Props> = ({ imageUri, onClose, title }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <h3 className="text-white font-bold truncate max-w-[70%]">{title || '영수증 이미지'}</h3>
        <div className="flex gap-4">
          <a 
            href={imageUri} 
            download="receipt_image.jpg"
            onClick={(e) => e.stopPropagation()}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <Download size={24} />
          </a>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      
      <div 
        className="w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUri} 
          alt="Receipt Full View" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
        />
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        이미지를 클릭하거나 밖을 눌러 닫기
      </div>
    </div>
  );
};

export default ImageModal;
