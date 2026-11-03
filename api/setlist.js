import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'setlist.json' });
      if (!blobs || blobs.length === 0) {
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
        return res.status(200).json(defaultdata);
      }

      const response = await fetch(blobs[0].url);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Gagal membaca data dari Vercel Blob' });
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
      return res.status(500).json({ error: 'Gagal menyimpan data ke Vercel Blob' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
