import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LinkItem {
  id: string;
  platform: string;
  url: string;
  active: boolean;
  order: number;
}

export interface ShowItem {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  address: string;
  gmapsUrl: string;
  price: number;
  alias: string;
  whatsapp: string;
  url: string;
}

export interface CMSData {
  profile: {
    name: string;
    bio: string;
    imageUrl: string;
    silhouetteUrl?: string;
  };
  appearance: {
    themeColor: string;
  };
  links: LinkItem[];
  shows: ShowItem[];
  featuredVideo: {
    url: string;
    autoplay: boolean;
    title?: string;
    artists?: string;
    coverUrl?: string;
    highlightColor?: string;
    highlightColor2?: string;
    duration?: string;
  };
  merch: {
    shopUrl: string;
    blurred?: boolean;
  };
}

const defaultData: CMSData = {
  profile: {
    name: "JED VIK",
    bio: "Artista y Productor.",
    imageUrl: "",
    silhouetteUrl: ""
  },
  appearance: {
    themeColor: "#00FF41"
  },
  links: [
    { id: '1', platform: 'Spotify', url: 'https://spotify.com/', active: true, order: 0 },
    { id: '2', platform: 'Instagram', url: 'https://instagram.com/', active: true, order: 1 },
    { id: '3', platform: 'YouTube', url: 'https://youtube.com/', active: true, order: 2 }
  ],
  shows: [
    { 
      id: '1', 
      name: 'Tour 2026', 
      city: 'Buenos Aires', 
      venue: 'Teatro Vórterix', 
      date: '2026-10-24T21:00', 
      address: 'Av. Federico Lacroze 3455', 
      gmapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.8197775988584!2d-58.44857462426066!3d-34.58342417296061!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcb594c965389d%3A0xe67db5cf8e2c7c5!2sTeatro%20Vorterix!5e0!3m2!1ses-419!2sar!4v1700000000000!5m2!1ses-419!2sar', 
      price: 15000, 
      alias: 'jedvik.musica', 
      whatsapp: '5491112345678', 
      url: '' 
    }
  ],
  featuredVideo: {
    url: "https://youtu.be/dQw4w9WgXcQ",
    autoplay: false,
    title: "ECHOS IN THE VOID",
    artists: "Jed Vik feat. LUNA",
    coverUrl: "",
    highlightColor: "#CC4E3D",
    highlightColor2: "#000000",
    duration: "04:12"
  },
  merch: {
    shopUrl: "",
    blurred: false
  }
};

interface CMSContextType {
  data: CMSData;
  loading: boolean;
  updateData: (newData: Partial<CMSData>) => Promise<void>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

// Simple Deep Merge helper
const deepMerge = (target: any, source: any) => {
  const output = { ...target };
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
};

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CMSData>(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchando los datos del artista 'jedvik'
    const docRef = doc(db, 'cms', 'jedvik');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data();
        setData(deepMerge(defaultData, remoteData));
      } else {
        // Inicializar documento en DB si no existe (Requiere configuración de reglas en Firebase)
        setDoc(docRef, defaultData).catch(err => console.warn("No se pudo autogenerar documento (probable error de permisos)", err));
      }
      setLoading(false);
    }, (error) => {
      console.error("Error cargando CMS de Firebase:", error);
      setLoading(false); // Retener datos locales si falla la DB
    });

    return () => unsubscribe();
  }, []);

  const updateData = async (newData: any) => {
    // Actualización local optimista (usando deep merge para consistencia local)
    setData(prev => deepMerge(prev, newData));
    
    try {
      const docRef = doc(db, 'cms', 'jedvik');
      // Firestore handles merging nested objects automatically with { merge: true }
      await setDoc(docRef, newData, { merge: true });
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
    }
  };

  return (
    <CMSContext.Provider value={{ data, loading, updateData }}>
      {children}
    </CMSContext.Provider>
  );
};

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (context === undefined) {
    throw new Error('useCMS must be used within a CMSProvider');
  }
  return context;
};
