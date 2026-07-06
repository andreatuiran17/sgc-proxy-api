import { kv } from '@vercel/kv';

const SMARTSHEET_API_URL = 'https://api.smartsheet.com/2.0';
const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_ID = '24vqjfH8hV78hQJhhpQqh6j4QWHxQq76cpx78hP1';
const CACHE_KEY = 'sgc-data';
const CACHE_EXPIRY = 3600; // 1 hora

async function fetchSmartsheetData() {
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
      throw new Error(`Smartsheet API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Preservar la estructura jerárquica completa necesaria para el parser del dashboard
    return {
      id: data.id,
      name: data.name,
      columns: data.columns,
      rows: data.rows,
      syncedAt: new Date().toISOString(),
      totalRows: data.rows.length
    };
  } catch (error) {
    console.error('Error fetching Smartsheet data:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Verificar que sea una solicitud POST (Vercel Cron siempre usa POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting SGC data sync...');

    // Obtener datos de Smartsheet
    const sgcData = await fetchSmartsheetData();

    // Guardar en Redis con expiración
    await kv.setex(CACHE_KEY, CACHE_EXPIRY, JSON.stringify(sgcData));

    console.log(`Successfully synced ${sgcData.totalRows} rows from Smartsheet`);

    return res.status(200).json({
      success: true,
      message: 'Data synced successfully',
      data: {
        totalRows: sgcData.totalRows,
        syncedAt: sgcData.syncedAt
      }
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
