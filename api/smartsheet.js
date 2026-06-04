export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
                return;
                  }

                    try {
                        const { sheetId, token } = req.query;
                            if (!sheetId || !token) {
                                  return res.status(400).json({ error: 'Falta sheetId o token' });
                                      }

                                          const response = await fetch(
                                                `https://api.smartsheet.com/2.0/sheets/${sheetId}?include=rowPermalink`,
                                                      {
                                                              headers: {
                                                                        'Authorization': `Bearer ${token}`,
                                                                                  'Content-Type': 'application/json'
                                                                                          }
                                                                                                }
                                                                                                    );
                                                                                                    
                                                                                                        const data = await response.json();
                                                                                                            if (!response.ok) {
                                                                                                                  return res.status(response.status).json(data);
                                                                                                                      }
                                                                                                                      
                                                                                                                          res.status(200).json(data);
                                                                                                                            } catch (error) {
                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                  }
                                                                                                                                  }
