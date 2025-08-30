// Ruta del archivo: /api/send-conversion.js

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userData, eventData } = req.body;
    const accessToken = process.env.META_ACCESS_TOKEN;
    const pixelId = process.env.META_PIXEL_ID;

    const hash = (data) => {
      return data ? crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex') : undefined;
    };

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: eventData.event_id,
          user_data: {
            em: hash(userData.email),
            ph: hash(userData.phone),
            fn: hash(userData.firstName),
            ln: hash(userData.lastName),
            client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            client_user_agent: req.headers['user-agent'],
            fbc: userData.fbc,
            fbp: userData.fbp,
          },
          custom_data: {
            currency: eventData.currency,
            value: eventData.value,
            content_ids: eventData.content_ids,
            content_type: 'product',
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Meta API Error:', responseData);
      throw new Error('Failed to send conversion to Meta');
    }

    res.status(200).json({ status: 'success', response: responseData });
  } catch (error) {
    console.error('Server-side Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}