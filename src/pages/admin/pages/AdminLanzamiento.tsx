import { useState, useEffect, useRef } from 'react';
import { useCMS } from '../../../context/CMSContext';
import ImageUpload from '../../../components/admin/ImageUpload';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const AdminLanzamiento = () => {
  const { data, updateData } = useCMS();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const playerRef = useRef<any>(null);
  const debounceTimer = useRef<any>(null);
  
  const [form, setForm] = useState({
    url: data.featuredVideo.url || '',
    title: data.featuredVideo.title || '',
    artists: data.featuredVideo.artists || '',
    coverUrl: data.featuredVideo.coverUrl || '',
    highlightColor: data.featuredVideo.highlightColor || '#CC4E3D',
    highlightColor2: data.featuredVideo.highlightColor2 || '#000000',
    duration: data.featuredVideo.duration || '04:12',
  });

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const extractYouTubeID = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleUrlChange = (url: string) => {
    setForm(prev => ({ ...prev, url }));
    
    const videoId = extractYouTubeID(url);
    if (!videoId) return;

    // Debounce to avoid spamming players
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      if (window.YT && window.YT.Player) {
        setExtracting(true);
        // Create a temporary hidden player to get duration
        const tempDiv = document.createElement('div');
        tempDiv.id = 'temp-yt-player';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        new window.YT.Player('temp-yt-player', {
          videoId: videoId,
          events: {
            onReady: (event: any) => {
              const durationSeconds = event.target.getDuration();
              if (durationSeconds > 0) {
                setForm(prev => ({ ...prev, duration: formatDuration(durationSeconds) }));
              }
              setExtracting(false);
              event.target.destroy();
              tempDiv.remove();
            },
            onError: () => {
              setExtracting(false);
              tempDiv.remove();
            }
          }
        });
      }
    }, 1000);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateData({ 
      featuredVideo: { 
        ...data.featuredVideo,
        url: form.url, 
        title: form.title,
        artists: form.artists,
        coverUrl: form.coverUrl,
        highlightColor: form.highlightColor,
        highlightColor2: form.highlightColor2,
        duration: form.duration
      } 
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline font-black text-5xl md:text-6xl tracking-tighter text-white uppercase leading-none">Lanzamiento</h1>
        <p className="font-label text-[11px] uppercase tracking-widest text-white/40 mt-2">Personaliza el track destacado de la portada</p>
      </header>

      <div className="space-y-6 max-w-xl pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUpload
            label="Portada del Álbum"
            currentImage={form.coverUrl}
            onUploadSuccess={(url) => setForm(prev => ({ ...prev, coverUrl: url }))}
          />
          
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Color 1 del Glow</label>
            <div className="flex items-center gap-4 bg-surface-container-highest rounded-2xl px-4 py-3">
              <input
                type="color"
                value={form.highlightColor}
                onChange={e => setForm(prev => ({ ...prev, highlightColor: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
              />
              <input
                type="text"
                value={form.highlightColor}
                onChange={e => setForm(prev => ({ ...prev, highlightColor: e.target.value }))}
                className="bg-transparent border-none text-white font-label text-xs uppercase tracking-widest w-full outline-none"
              />
            </div>
          </div>
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Color 2 del Degradado</label>
            <div className="flex items-center gap-4 bg-surface-container-highest rounded-2xl px-4 py-3">
              <input
                type="color"
                value={form.highlightColor2}
                onChange={e => setForm(prev => ({ ...prev, highlightColor2: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
              />
              <input
                type="text"
                value={form.highlightColor2}
                onChange={e => setForm(prev => ({ ...prev, highlightColor2: e.target.value }))}
                className="bg-transparent border-none text-white font-label text-xs uppercase tracking-widest w-full outline-none"
              />
            </div>
            <p className="text-[9px] text-white/20 mt-2 ml-4 uppercase tracking-tighter">El degradado pasará de Color 1 a Color 2</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Título del Track</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título de la canción"
              className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
            />
          </div>
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Duración</label>
            <div className="relative">
              <input
                type="text"
                value={form.duration}
                onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="00:00"
                className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all text-center"
              />
              {extracting && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm animate-spin">progress_activity</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">Artista(s)</label>
          <input
            type="text"
            value={form.artists}
            onChange={e => setForm(prev => ({ ...prev, artists: e.target.value }))}
            placeholder="Jed Vik feat. ..."
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <div>
          <label className="font-label text-[10px] uppercase tracking-widest text-white/40 block mb-2 ml-4">URL del Track (Spotify / YouTube)</label>
          <input
            type="url"
            value={form.url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://..."
            className="w-full bg-surface-container-highest rounded-full px-6 py-4 text-sm font-body text-white placeholder:text-white/20 border-none outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-xl shadow-primary/10"
          style={{ background: `linear-gradient(135deg, ${form.highlightColor}, ${form.highlightColor2})` }}
        >
          {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...</> :
           saved  ? <><span className="material-symbols-outlined text-base">check_circle</span> Guardado</> : 'Actualizar Lanzamiento'}
        </button>
      </div>
    </div>
  );
};

export default AdminLanzamiento;
