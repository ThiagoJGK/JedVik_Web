import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export interface PromoLinkPlatforms {
  spotify?: string;
  appleMusic?: string;
  youtubeMusic?: string;
  deezer?: string;
  tidal?: string;
  amazonMusic?: string;
  soundcloud?: string;
  napster?: string;
  pandora?: string;
}

export interface PromoLink {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  youtubeUrl: string;
  slug: string;
  platforms: PromoLinkPlatforms;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PromoLinkInput = Omit<PromoLink, 'id' | 'createdAt' | 'updatedAt'>;

const COL = 'promoLinks';

export async function getPromoLinks(): Promise<PromoLink[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoLink));
}

export async function getPromoLinkBySlug(slug: string): Promise<PromoLink | null> {
  const q = query(collection(db, COL), where('slug', '==', slug), where('active', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as PromoLink;
}

export async function getPromoLink(id: string): Promise<PromoLink | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PromoLink;
}

export async function createPromoLink(data: PromoLinkInput): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updatePromoLink(id: string, data: Partial<PromoLinkInput>): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePromoLink(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Generate a URL-safe slug from a title */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
