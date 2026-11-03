import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // GET: Fetch current setlist
  if (req.method === 'GET') {
    const data = await kv.get('setlist_data') || {
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
    return res.status(200).json(data);
  }

  // POST/PUT: Update setlist data
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await kv.set('setlist_data', body);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
