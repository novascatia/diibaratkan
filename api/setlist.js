import { put, list } from '@vercel/blob';

const defaultdata = {
  guitar: [
    "I'll be friends with you - arash buana",
    "Sudah - Ardhito Pramono",
    "First Love - Ardhito Pramono",
    "Falling Behind - Laufey",
    "Sunshine - The Panturas",
    "Walking back home - Vira Talisa"
  ],
  karaoke: [
    "Let you break my heart again - Laufey",
    "Promise - Laufey",
    "Bored - Laufey"
  ],
  states: {}
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'setlist' });
      if (!blobs || blobs.length === 0) {
        return res.status(200).json(defaultdata);
      }

      const latestblob = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const response = await fetch(`${latestblob.url}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) return res.status(200).json(defaultdata);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(200).json(defaultdata);
    }
  }

  if (req.method === 'POST') {
    try {
      const bodydata = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      await put('setlist.json', JSON.stringify(bodydata), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Save error:", err);
      return res.status(500).json({ error: err.message || 'Gagal menyimpan ke Vercel Blob' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
