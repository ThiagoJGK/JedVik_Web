import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

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

  try {
    const topic = req.query.topic || req.query.type || (req.body && req.body.type);
    const paymentId = req.query['data.id'] || (req.body && req.body.data && req.body.data.id);

    if (topic === 'payment' && paymentId && process.env.MERCADOPAGO_ACCESS_TOKEN) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      });

      if (response.ok) {
        const paymentData = await response.json();
        const bookingId = paymentData.external_reference;
        const status = paymentData.status;

        if (bookingId && status === 'approved') {
          const bookingRef = doc(db, 'bookings', bookingId);
          await updateDoc(bookingRef, {
            status: 'confirmed',
            mpPaymentId: paymentId,
            paidAt: new Date().toISOString()
          });
          console.log(`Reserva ${bookingId} confirmada automáticamente vía webhook MP.`);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error procesando Webhook de Mercado Pago:', err);
    return res.status(500).json({ error: err.message });
  }
}
