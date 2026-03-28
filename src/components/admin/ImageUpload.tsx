import React from 'react';

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  currentImage?: string;
  label: string;
}

// NOTE TO USER: Replace these with your actual Cloudinary credentials
const CLOUDINARY_CLOUD_NAME = 'dpm4judv4'; // Your Cloud Name
const CLOUDINARY_UPLOAD_PRESET = 'Jed Vik'; // Your Unsigned Upload Preset

declare global {
  interface Window {
    cloudinary: any;
  }
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess, currentImage, label }) => {

  const handleUpload = () => {
    if (!window.cloudinary) {
      console.error('Cloudinary widget not loaded');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera', 'url'],
        multiple: false,
        cropping: true,
        showSkipCropButton: false,
        styles: {
          palette: {
            window: '#1a1a1a',
            windowBorder: '#262626',
            tabIcon: '#CC4E3D',
            menuIcons: '#ffffff',
            textDark: '#000000',
            textLight: '#ffffff',
            link: '#CC4E3D',
            action: '#CC4E3D',
            inactiveTabIcon: '#adaaaa',
            error: '#ff4e3d',
            inProgress: '#f68a2f',
            complete: '#20B832',
            sourceBg: '#0e0e0e'
          },
          fonts: {
            default: null,
            "'Manrope', sans-serif": 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&display=swap'
          }
        }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          const url = result.info.secure_url;
          onUploadSuccess(url);
        }
      }
    );

    widget.open();
  };

  return (
    <div className="space-y-2">
      <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">
        {label}
      </label>
      <div className="flex items-center gap-4 bg-surface-container-high rounded-3xl p-4 border border-white/5">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-highest overflow-hidden flex-shrink-0 border border-white/10">
          {currentImage ? (
            <img src={currentImage} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/10">
              <span className="material-symbols-outlined text-3xl">image</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={handleUpload}
            className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
          >
            {currentImage ? 'Cambiar Foto' : 'Subir Imagen'}
          </button>
          <p className="text-[9px] text-white/20 mt-2 ml-2 uppercase tracking-tight">
            JPG, PNG o WEBP. Redimensión automática.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
