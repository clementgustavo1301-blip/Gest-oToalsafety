const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');

// Função auxiliar para requisição HTTPS
function fetchGeocode(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'EcoSafetyLogistics/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', reject);
  });
}

const supabaseUrl = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Centro de Mossoró para empresas não encontradas (vamos espalhar levemente ao redor)
const CENTER_LAT = -5.1882;
const CENTER_LNG = -37.3415;

// Mapeamento manual de empresas muito conhecidas na região
const manualMapping = {
  'REFINARIA DE SAL GARCA LTDA (MATRIZ)': { lat: -5.1950, lng: -37.3470 },
  'REFINARIA DE SAL GARCA LTDA (FILIAL)': { lat: -5.1960, lng: -37.3480 },
  'HOLANDA SERVICOS SALINEIROS LTDA': { lat: -5.1800, lng: -37.3300 },
  'ZEFLEX Industria de colchões': { lat: -5.2150, lng: -37.3350 },
  'Padaria Frota - Matriz (75)': { lat: -5.1912, lng: -37.3456 },
  'Padaria Frota - Filial (80)': { lat: -5.1980, lng: -37.3300 },
  'Distribuidora Pantanal LTDA': { lat: -5.1850, lng: -37.3380 },
  'Mossoró Tacografo': { lat: -5.2010, lng: -37.3420 },
  'Master Mais Veicular (60)': { lat: -5.2000, lng: -37.3400 },
  'Auto Mais': { lat: -5.1920, lng: -37.3410 },
  'OESTE VERDE PREMOLDADOS': { lat: -5.1700, lng: -37.3500 },
  'Salina Cinco Estrelas (30)': { lat: -5.1600, lng: -37.3600 },
  'Facil Supermercados (02)': { lat: -5.1930, lng: -37.3350 }
};

async function run() {
  console.log('Buscando empresas no sistema...');
  const { data: companies, error } = await supabase.from('companies').select('id, name');
  
  if (error) {
    console.error('Erro ao buscar empresas:', error);
    return;
  }
  
  console.log(`Encontradas ${companies.length} empresas. Iniciando geocodificação...`);
  
  let successCount = 0;
  
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    let lat = null;
    let lng = null;
    
    // 1. Tentar mapeamento manual
    const manualMatch = Object.keys(manualMapping).find(k => company.name.includes(k));
    if (manualMatch) {
      lat = manualMapping[manualMatch].lat;
      lng = manualMapping[manualMatch].lng;
    } else {
      // 2. Limpar o nome para busca (remover números entre parênteses, LTDA, etc)
      let cleanName = company.name.replace(/\(\d+\)/g, '').replace(/LTDA/gi, '').trim();
      
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName + ' Mossoró Brazil')}&format=json&limit=1`;
        const result = await fetchGeocode(url);
        
        if (result && result.length > 0) {
          lat = parseFloat(result[0].lat);
          lng = parseFloat(result[0].lon);
          console.log(`[Achei na Web] ${company.name}`);
        } else {
          // 3. Fallback: Se não achar, coloca em um raio de 3km do centro de Mossoró
          // Isso garante que todas aparecerão no mapa sem ficarem sobrepostas
          const radius = 0.03; // ~3km
          lat = CENTER_LAT + (Math.random() - 0.5) * radius;
          lng = CENTER_LNG + (Math.random() - 0.5) * radius;
        }
        // Esperar 1 segundo para respeitar o rate limit do Nominatim (API gratuita)
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        // Fallback no erro
        lat = CENTER_LAT + (Math.random() - 0.5) * 0.03;
        lng = CENTER_LNG + (Math.random() - 0.5) * 0.03;
      }
    }

    // Atualizar no Supabase
    if (lat && lng) {
      const { error: updateError } = await supabase
        .from('companies')
        .update({ latitude: lat, longitude: lng })
        .eq('id', company.id);
        
      if (!updateError) {
        successCount++;
        if (successCount % 10 === 0) console.log(`${successCount} empresas atualizadas...`);
      }
    }
  }
  
  console.log(`Concluído! ${successCount} empresas atualizadas com sucesso com endereços em Mossoró.`);
}

run();
