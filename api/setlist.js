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
  // Matikan caching di level Vercel Edge / Browser
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'setlist.json' });

      if (!blobs || blobs.length === 0) {
        return res.status(200).json(defaultdata);
      }

      // Ambil file Blob paling baru berdasarkan tanggal upload
      const latestBlob = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];

      // Fetch file dengan cache-busting query parameter
      const response = await fetch(`${latestBlob.url}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        return res.status(200).json(defaultdata);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("GET Error:", err);
      // Tetap kembalikan HTTP 200 dengan defaultdata agar frontend tidak crash
      return res.status(200).json(defaultdata);
    }
  }

  if (req.method === 'POST') {
    try {
      const bodydata = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await put('setlist.json', JSON.stringify(bodydata), {
        access: 'public',
        addRandomSuffix: false
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("POST Error:", err);
      return res.status(500).json({ error: 'Gagal menyimpan data ke Vercel Blob' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
