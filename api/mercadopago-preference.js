import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByWjTyISY3_XO1ms8RZUxOzkK9PDiD8sY",
  authDomain: "jedvik-artist.firebaseapp.com",
  projectId: "jedvik-artist",
  storageBucket: "jedvik-artist.firebasestorage.app",
  messagingSenderId: "52603306127",
  appId: "1:52603306127:web:78f19a8ea3d3492e7af0fa"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, showId, showName, email, ticketsCount, unitPrice, attendees, originUrl } = req.body;

    if (!showId || !email || !ticketsCount || !unitPrice) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos para crear la preferencia.' });
    }

    const id = bookingId || `JED-MP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Crear o asegurar el booking en Firestore con estado pending
    await setDoc(doc(db, 'bookings', id), {
      id,
      showId,
      showName: showName || 'Show Jed Vik',
      email,
      ticketsCount,
      attendees: attendees || [],
      totalPrice: unitPrice * ticketsCount,
      paymentMethod: 'mercadopago',
      status: 'pending',
      createdAt: serverTimestamp()
    }, { merge: true });

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      // Si aún no han configurado el token de Mercado Pago en Vercel, retornamos un enlace de simulación de pago seguro
      const baseUrl = originUrl || 'https://jedvik.com';
      const mockInitPoint = `${baseUrl}/show/${showId}?booking=${id}&payment=success_simulated`;
      return res.status(200).json({
        preferenceId: `mock_pref_${id}`,
        init_point: mockInitPoint,
        bookingId: id,
        simulated: true,
        message: 'Modo de prueba activo. Configura MERCADOPAGO_ACCESS_TOKEN en Vercel para producción.'
      });
    }

    // Llamada oficial a la API de Mercado Pago para crear Preference
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items: [
          {
            id: showId,
            title: `Entrada: ${showName} x${ticketsCount}`,
            description: `Reserva ${id} para ${showName} - Jed Vik`,
            quantity: Number(ticketsCount),
            currency_id: 'ARS',
            unit_price: Number(unitPrice)
          }
        ],
        payer: {
          email: email
        },
        external_reference: id,
        back_urls: {
          success: `${originUrl || 'https://jedvik.com'}/show/${showId}?booking=${id}&status=approved`,
          pending: `${originUrl || 'https://jedvik.com'}/show/${showId}?booking=${id}&status=pending`,
          failure: `${originUrl || 'https://jedvik.com'}/show/${showId}?booking=${id}&status=failure`
        },
        auto_return: 'approved',
        notification_url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://jedvik.com'}/api/mercadopago-webhook`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error creando preferencia Mercado Pago:', errorText);
      return res.status(500).json({ error: 'Error al comunicarse con Mercado Pago API', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json({
      preferenceId: data.id,
      init_point: data.init_point || data.sandbox_init_point,
      bookingId: id
    });

  } catch (err) {
    console.error('Error interno en preferencia Mercado Pago:', err);
    return res.status(500).json({ error: 'Error interno del servidor', message: err.message });
  }
}
