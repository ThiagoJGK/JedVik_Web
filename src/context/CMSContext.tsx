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
  city: string;
  venue: string;
  date: string;
  url: string;
}

export interface CMSData {
  profile: {
    name: string;
    bio: string;
    imageUrl: string;
  };
  appearance: {
    themeColor: string;
  };
  links: LinkItem[];
  shows: ShowItem[];
  featuredVideo: {
    url: string;
    autoplay: boolean;
  };
  merch: {
    shopUrl: string;
  };
}

const defaultData: CMSData = {
  profile: {
    name: "JED VIK",
    bio: "Artista y Productor.",
    imageUrl: ""
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
    { id: '1', city: 'Buenos Aires', venue: 'Teatro Vórterix', date: '24 Oct 2026', url: '#' }
  ],
  featuredVideo: {
    url: "https://youtu.be/dQw4w9WgXcQ",
    autoplay: false
  },
  merch: {
    shopUrl: ""
  }
};

interface CMSContextType {
  data: CMSData;
  loading: boolean;
  updateData: (newData: Partial<CMSData>) => Promise<void>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CMSData>(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchando los datos del artista 'jedvik'
    const docRef = doc(db, 'cms', 'jedvik');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData({ ...defaultData, ...docSnap.data() as CMSData });
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

  const updateData = async (newData: Partial<CMSData>) => {
    // Actualización local optimista
    setData(prev => ({ ...prev, ...newData }));
    
    try {
      const docRef = doc(db, 'cms', 'jedvik');
      await setDoc(docRef, { ...data, ...newData }, { merge: true });
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
      // Opcional: Revertir si el usuario prefiriese, aquí solo notificamos el error visualmente o silencioso
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
