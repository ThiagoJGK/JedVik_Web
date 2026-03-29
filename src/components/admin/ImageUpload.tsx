import React, { useRef } from 'react';

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  currentImage?: string;
  label: string;
}

const CLOUDINARY_CLOUD_NAME = 'dpm4judv4';
const CLOUDINARY_UPLOAD_PRESET = 'Jed Vik';

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess, currentImage, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        onUploadSuccess(data.secure_url);
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
    }
    // Reset so same file can be re-selected if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative flex items-center justify-center aspect-square rounded-2xl overflow-hidden border border-white/10 bg-surface-container-highest cursor-pointer hover:border-white/30 transition-all group"
      >
        {currentImage ? (
          <>
            <img src={currentImage} alt="Vista previa" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/20 group-hover:text-white/40 transition-colors">
            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
            <span className="font-label text-[9px] uppercase tracking-widest">Elegir foto</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
