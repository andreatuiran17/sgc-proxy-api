import { kv } from '@vercel/kv';

const CACHE_KEY = 'sgc-data';
const SMARTSHEET_API_URL = 'https://api.smartsheet.com/2.0';
const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_ID = '24vqjfH8hV78hQJhhpQqh6j4QWHxQq76cpx78hP1';

async function fetchSmartsheetDataFallback() {
  try {
    const response = await fetch(
      `${SMARTSHEET_API_URL}/sheets/${SHEET_ID}?include=rowPermalink`,
      {
        headers: {
          'Authorization': `Bearer ${SMARTSHEET_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Smartsheet API error: ${response.status}`);
    }

    const data = await response.json();

    // Guardar en Redis para próximas solicitudes
    await kv.setex(CACHE_KEY, 3600, JSON.stringify({
      id: data.id,
      name: data.name,
      columns: data.columns,
      rows: data.rows,
      syncedAt: new Date().toISOString(),
      totalRows: data.rows.length
    }));

    return {
      id: data.id,
      name: data.name,
      columns: data.columns,
      rows: data.rows,
      syncedAt: new Date().toISOString(),
      totalRows: data.rows.length
    };
  } catch (error) {
    console.error('Fallback fetch failed:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener datos del cache de Redis
    let sgcData = await kv.get(CACHE_KEY);

    // Si no hay datos en cache, intentar obtener de Smartsheet directamente
    if (!sgcData) {
      console.log('Cache miss, fetching from Smartsheet...');
      sgcData = await fetchSmartsheetDataFallback();
    } else {
      sgcData = typeof sgcData === 'string' ? JSON.parse(sgcData) : sgcData;
    }

    // Configurar headers para cacheo en el cliente (5 minutos)
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
      success: true,
      data: sgcData
    });
  } catch (error) {
    console.error('Error retrieving data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve data: ' + error.message,
      data: null
    });
  }
}
