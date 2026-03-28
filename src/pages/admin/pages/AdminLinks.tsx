import { useState } from 'react';
import { useCMS, type LinkItem } from '../../../context/CMSContext';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PLATFORM_DATA: Record<string, { icon: string; color: string }> = {
  Spotify: { icon: 'spotify', color: '1DB954' },
  Instagram: { icon: 'instagram', color: 'E4405F' },
  YouTube: { icon: 'youtube', color: 'FF0000' },
  TikTok: { icon: 'tiktok', color: 'FFFFFF' },
  'Apple Music': { icon: 'apple', color: 'FA243C' },
  SoundCloud: { icon: 'soundcloud', color: 'FF3300' },
  'Twitter/X': { icon: 'x', color: 'FFFFFF' },
  Facebook: { icon: 'facebook', color: '1877F2' },
  Otro: { icon: 'link', color: 'CCCCCC' },
};

const PLATFORMS = Object.keys(PLATFORM_DATA);

const SortableRow = ({ link, onToggle, onDelete, onUrlChange, onPlatformChange }: {
  link: LinkItem;
  onToggle: () => void;
  onDelete: () => void;
  onUrlChange: (v: string) => void;
  onPlatformChange: (v: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  const [showUrl, setShowUrl] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };

  const platformInfo = PLATFORM_DATA[link.platform] || PLATFORM_DATA.Otro;

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        className={`flex items-center gap-3 md:gap-4 bg-surface-container-high rounded-2xl p-3 md:px-5 md:py-4 hover:bg-surface-bright transition-all ${!link.active ? 'opacity-40' : ''}`}
      >
        {/* Drag handle */}
        <button {...attributes} {...listeners} className="text-white/10 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <span className="material-symbols-outlined text-xl">drag_indicator</span>
        </button>

        {/* Platform Info & Logo */}
        <div className="flex items-center gap-2 md:gap-3 w-28 md:w-36 flex-shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/50 p-1.5 flex items-center justify-center flex-shrink-0">
            <img
              src={`https://cdn.simpleicons.org/${platformInfo.icon}/${platformInfo.color}`}
              alt={link.platform}
              className="w-full h-full object-contain"
            />
          </div>
          <select
            value={link.platform}
            onChange={e => onPlatformChange(e.target.value)}
            className="bg-transparent border-none text-white font-headline font-bold text-[10px] md:text-xs uppercase tracking-tight outline-none cursor-pointer w-full p-0"
          >
            {PLATFORMS.map(p => <option key={p} value={p} className="bg-surface-container text-white normal-case">{p}</option>)}
          </select>
        </div>

        {/* Desktop URL / Mobile Toggle Button */}
        <div className="flex-1 min-w-0 flex justify-center md:justify-start">
          {/* Desktop view: Always visible */}
          <div className="hidden md:flex bg-surface-container-highest rounded-full px-5 py-2 items-center w-full">
            <input
              type="url"
              value={link.url}
              onChange={e => onUrlChange(e.target.value)}
              placeholder="https://..."
              className="bg-transparent border-none focus:ring-0 text-[13px] text-white/60 font-body w-full outline-none"
            />
          </div>

          {/* Mobile view: Button to toggle input */}
          <button
            onClick={() => setShowUrl(!showUrl)}
            className={`md:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-full font-headline font-bold text-[8px] uppercase tracking-widest transition-all ${showUrl ? 'bg-primary text-white' : 'bg-surface-container-highest text-white/40'}`}
          >
            <span className="material-symbols-outlined text-[16px]">{showUrl ? 'close' : 'link'}</span>
            <span className="hidden xs:inline">{showUrl ? 'Cerrar' : 'Link'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={link.active} onChange={onToggle} className="sr-only peer" />
            <div className="w-10 md:w-12 h-5 md:h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-5 md:peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all peer-checked:after:bg-white"
              style={{ '--tw-bg-opacity': '1' } as React.CSSProperties}
            >
              <div className={`w-full h-full rounded-full transition-all duration-200 ${link.active ? '' : 'bg-surface-container-high'}`}
                style={link.active ? { background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' } : {}}
              />
            </div>
          </label>

          {/* Delete */}
          <button onClick={onDelete} className="text-white/10 hover:text-red-400/80 transition-colors p-1">
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>

      {/* Mobile URL Input: Expandable */}
      {showUrl && (
        <div className="md:hidden mt-2 px-4 py-3 bg-surface-container-highest rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-200">
          <label className="font-label text-[8px] uppercase tracking-widest text-white/30 block mb-2 px-1">URL de Destino</label>
          <div className="bg-black/20 rounded-xl px-4 py-2">
            <input
              type="url"
              value={link.url}
              onChange={e => onUrlChange(e.target.value)}
              placeholder="https://..."
              className="bg-transparent border-none focus:ring-0 text-[12px] text-white/80 font-body w-full outline-none p-0"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AdminLinks = () => {
  const { data, updateData } = useCMS();
  const sorted = [...data.links].sort((a, b) => a.order - b.order);

  const saveLinks = (links: LinkItem[]) => updateData({ links });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex(l => l.id === active.id);
    const newIndex = sorted.findIndex(l => l.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex).map((l, i) => ({ ...l, order: i }));
    saveLinks(reordered);
  };

  const toggle = (id: string) => saveLinks(data.links.map(l => l.id === id ? { ...l, active: !l.active } : l));
  const del = (id: string) => saveLinks(data.links.filter(l => l.id !== id));
  const urlChange = (id: string, url: string) => saveLinks(data.links.map(l => l.id === id ? { ...l, url } : l));
  const platformChange = (id: string, platform: string) => saveLinks(data.links.map(l => l.id === id ? { ...l, platform } : l));

  const addLink = () => {
    const newLink: LinkItem = { id: crypto.randomUUID(), platform: 'Spotify', url: '', active: false, order: data.links.length };
    saveLinks([...data.links, newLink]);
  };

  return (
    <div className="pb-10">
      <header className="mb-10 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-headline font-black text-4xl md:text-6xl tracking-tighter text-white uppercase leading-none">Links</h1>
          <p className="font-label text-[10px] md:text-[11px] uppercase tracking-widest text-white/40 mt-3 flex items-center gap-2">
            <span className="w-4 h-px bg-white/20" /> Visibles en portada
          </p>
        </div>
        <button
          onClick={addLink}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-headline font-bold text-[10px] md:text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg"
          style={{ background: 'linear-gradient(135deg, #CC4E3D, #f68a2f)' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Link
        </button>
      </header>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4 md:space-y-2">
            {sorted.map(link => (
              <SortableRow
                key={link.id}
                link={link}
                onToggle={() => toggle(link.id)}
                onDelete={() => del(link.id)}
                onUrlChange={v => urlChange(link.id, v)}
                onPlatformChange={v => platformChange(link.id, v)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-12 flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-white/5 text-4xl">drag_pan</span>
        <p className="text-center text-white/20 font-label text-[9px] uppercase tracking-[0.3em]">
          Mantené presionado para reordenar
        </p>
      </div>
    </div>
  );
};

export default AdminLinks;
