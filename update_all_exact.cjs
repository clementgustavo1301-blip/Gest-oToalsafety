const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Initialize Supabase
const supabase = createClient('https://uqwdepwqrrwzwesfysbz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM');

const companiesData = [
  { cnpj: '31.471.437/0001-60', address: 'Av. Abel Coelho, 122, Abolição II, Mossoró/RN' },
  { cnpj: '55.029.633/0001-14', address: 'R. Venceslau Braz, 500, Barrocas, Mossoró/RN' },
  { cnpj: '16.479.047/0001-10', address: 'Av. Wilson Rosado, 1010, Nova Betânia, Mossoró/RN' },
  { cnpj: '17.747.484/0001-30', address: 'Sítio Logradouro, S/N, Zona Rural, Porto do Mangue/RN' },
  { cnpj: '12.748.430/0006-80', address: 'Av. Presidente Dutra, 480, Alto de São Manoel, Mossoró/RN' },
  { cnpj: '05.967.403/0001-28', address: 'Av. Ind. Dehuel Vieira Diniz, S/N, Distrito Industrial, Mossoró/RN' },
  { cnpj: '43.663.405/0001-12', address: 'R. José Ribamar de Oliveira, 120, Distrito Industrial, Mossoró/RN' },
  { cnpj: '12.748.430/0001-75', address: 'R. Delfim Moreira, 10, Santo Antônio, Mossoró/RN' },
  { cnpj: '05.967.403/0002-09', address: 'Rod. BR 304, Km 32, S/N, Zona Rural, Mossoró/RN' },
  { cnpj: '13.122.992/0001-71', address: 'Sítio Picos, S/N, Zona Rural, Icapuí/CE' },
  { cnpj: '13.504.538/0001-85', address: 'R. Francisco Ismael, 42, Doze Anos, Mossoró/RN' },
  { cnpj: '51.322.047/0001-02', address: 'R. Seis de Janeiro, 1837, Sala C, Santo Antônio, Mossoró/RN' },
  { cnpj: '44.413.033/0001-39', address: 'R. Amaro Duarte, 340, Nova Betânia, Mossoró/RN' },
  { cnpj: '46.050.335/0001-68', address: 'R. Dionísio Filgueira, 250, Sala A, Centro, Mossoró/RN' },
  { cnpj: '21.370.136/0001-63', address: 'R. Dionísio Filgueira, 250, Centro, Mossoró/RN' },
  { cnpj: '12.226.156/0001-74', address: 'R. Francisco Peregrino, 350, Centro, Mossoró/RN' },
  { cnpj: '12.869.217/0001-11', address: 'R. Felipe Camarão, 1420, Doze Anos, Mossoró/RN' },
  { cnpj: '49.101.486/0001-43', address: 'R. Santos Dumont, 150, Centro, Mossoró/RN' },
  { cnpj: '17.737.876/0001-18', address: 'Av. Cunha da Mota, 1520, Centro, Mossoró/RN' },
  { cnpj: '70.307.129/0001-22', address: 'Rod. BR 304, Km 45, Distrito Industrial, Mossoró/RN' },
  { cnpj: '35.897.030/0001-27', address: 'R. Auta de Souza, 120, Centro, Macaíba/RN' },
  { cnpj: '45.946.107/0001-65', address: 'Fazenda Nova Esperança, S/N, Zona Rural, Baraúna/RN' },
  { cnpj: '12.840.852/0001-76', address: 'Av. Jerônimo Dix-neuf Rosado, S/N, Centro, Mossoró/RN' },
  { cnpj: '12.995.411/0001-43', address: 'R. Meira e Silva, 85, Centro, Mossoró/RN' },
  { cnpj: '35.586.864/0001-11', address: 'R. Francisco Peregrino, 352, Centro, Mossoró/RN' },
  { cnpj: '29.593.505/0001-99', address: 'R. Coronel Gurgel, 210, Centro, Mossoró/RN' },
  { cnpj: '22.041.860/0001-06', address: 'R. João da Cota, 45, Alto de São Manoel, Mossoró/RN' },
  { cnpj: '11.936.648/0001-90', address: 'Av. General Péricles, 310, Ilha de Santa Luzia, Mossoró/RN' },
  { cnpj: '51.064.330/0001-81', address: 'R. Duodécimo Rosado, 400, Nova Betânia, Mossoró/RN' },
  { cnpj: '05.167.985/0001-68', address: 'R. Doutor João Rufino, 100, Santo Antônio, Mossoró/RN' },
  { cnpj: '40.183.192/0001-33', address: 'Sítio Jurema, S/N, Zona Rural, Baraúna/RN' },
  { cnpj: '085.645.944-55', address: 'Comunidade Canto Grande, Zona Rural, Areia Branca/RN' },
  { cnpj: '18.633.133/0001-60', address: 'R. José Dantas, 80, Alto da Conceição, Mossoró/RN' },
  { cnpj: '35.094.910/0001-65', address: 'R. Mestre Antônio, 120, Alto da Conceição, Mossoró/RN' },
  { cnpj: '10.649.161/0001-64', address: 'Av. Presidente Dutra, 1100, Alto de São Manoel, Mossoró/RN' },
  { cnpj: '10.649.161/0003-26', address: 'R. Rincão, 45, Rincão, Mossoró/RN' },
  { cnpj: '23.953.646/0001-99', address: 'R. Juvenal Lamartine, 180, Santo Antônio, Mossoró/RN' },
  { cnpj: '60.518.463/0001-71', address: 'Av. Presidente Dutra, 1102, Alto de São Manoel, Mossoró/RN' },
  { cnpj: '08.378.366/0001-00', address: 'Av. Cunha da Mota, 1120, Centro, Mossoró/RN' },
  { cnpj: '51.322.047/0002-02', address: 'Sítio Rancho Texas, S/N, Zona Rural, Mossoró/RN' },
  { cnpj: '17.249.877/0001-13', address: 'R. Doutor João Rufino, 45, Santo Antônio, Mossoró/RN' },
  { cnpj: '20.209.511/0001-25', address: 'R. Pedro Ciarlini, 105, Abolição I, Mossoró/RN' },
  { cnpj: '51.759.284/0001-35', address: 'R. Coronel Gurgel, 310, Centro, Mossoró/RN' },
  { cnpj: '07.197.127/0001-91', address: 'R. Dionísio Filgueira, 252, Centro, Mossoró/RN' },
  { cnpj: '45.162.027/0001-19', address: 'R. Duodécimo Rosado, 705, Nova Betânia, Mossoró/RN' },
  { cnpj: '23.800.591/0001-87', address: 'Rod. BR 304, Km 43, S/N, Zona Rural, Mossoró/RN' },
  { cnpj: '26.437.189/0001-78', address: 'R. Professor José Maltagagli, 20, Centro, Extremoz/RN' },
  { cnpj: '11.733.263/430', address: 'Fazenda São João, S/N, Zona Rural, Baraúna/RN' },
  { cnpj: '46.565.343/0001-02', address: 'R. Felipe Camarão, 520, Doze Anos, Mossoró/RN' },
  { cnpj: '44.298.502/0001-16', address: 'Av. Rio Branco, 1100, Centro, Mossoró/RN' },
  { cnpj: '14.032.202/0001-20', address: 'Rod. BR 304, Km 47, S/N, Distrito Industrial, Mossoró/RN' },
  { cnpj: '17.723.219/0001-11', address: 'R. Vicente Leite, 400, Planalto 13 de Maio, Mossoró/RN' },
  { cnpj: '23.267.741/0002-39', address: 'Av. João da Escóssia, 1500, Nova Betânia, Mossoró/RN' },
  { cnpj: '43.179.759/0001-96', address: 'Av. General Péricles, 312, Ilha de Santa Luzia, Mossoró/RN' },
  { cnpj: '33.364.352/0001-85', address: 'R. Francisco Solon, 120, Boa Vista, Mossoró/RN' },
  { cnpj: '22.932.231/0001-76', address: 'R. Amaro Duarte, 340, Nova Betânia, Mossoró/RN' },
  { cnpj: '54.431.088/0001-25', address: 'R. Juvenal Lamartine, 310, Santo Antônio, Mossoró/RN' },
  { cnpj: '11.163.545/0001-35', address: 'Av. Alberto Maranhão, 2200, Alto da Conceição, Mossoró/RN' },
  { cnpj: '11.058.983/0001-33', address: 'Fazenda São João, S/N, Zona Rural, Baraúna/RN' },
  { cnpj: '39.505.852/0001-76', address: 'R. Santos Dumont, 150, Centro, Mossoró/RN' },
  { cnpj: '807.127.464-04', address: 'Comunidade Baixo Açu, Zona Rural, Alto do Rodrigues/RN' },
  { cnpj: '10.649.161/0002-45', address: 'Rod. BR 304, Km 48, Distrito Industrial, Mossoró/RN' },
  { cnpj: '19.503.944/0001-00', address: 'Projeto Agrícola Curupati, Zona Rural, Jaguaruana/CE' },
  { cnpj: '30.196.296/0001-29', address: 'Sítio Sabará, S/N, Zona Rural, Baraúna/RN' },
  { cnpj: '12.866.387/0001-42', address: 'Av. Almirante Barroso, 300, Paredões, Mossoró/RN' },
  { cnpj: '38.339.477/0001-79', address: 'R. Francisco Bernardo, 85, Nova Betânia, Mossoró/RN' },
  { cnpj: '13.256.985/0003-24', address: 'Rod. BR 405, Km 12, S/N, Zona Rural, Mossoró/RN' },
  { cnpj: '13.256.985/0001-62', address: 'Rod. Engenheiro Renê Benedito, S/N, Itapevi/SP' },
  { cnpj: '05.859.790/0001-89', address: 'Fazenda Frumel, S/N, Zona Rural, Baraúna/RN' },
  { cnpj: '48.378.172/0001-20', address: 'R. Doutor João Rufino, 100, Santo Antônio, Mossoró/RN' },
  { cnpj: '49.073.452/0001-92', address: 'R. Seis de Janeiro, 1220, Santo Antônio, Mossoró/RN' },
  { cnpj: '66.039.387/0001-06', address: 'Fazenda Aroeira, S/N, Zona Rural, Upanema/RN' },
  { cnpj: '08.252.397/0001-10', address: 'Av. General Péricles, 85, Ilha de Santa Luzia, Mossoró/RN' }
];

function fetchGeocode(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'EcoSafetyApp/1.0' } }, (res) => {
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

function parseAddressForGeocode(address) {
  // Convert "R. Name, Number, Neighborhood, City/State" to a search query
  // Removing "S/N", "Sala X", "Km X" which confuses Nominatim
  let q = address.replace(/S\/N/gi, '').replace(/Km\s\d+/gi, '').replace(/Sala\s[A-Z0-9]+/gi, '').replace(/Zona Rural/gi, '');
  // Nominatim works best with: Street Name, City, State
  return q;
}

async function run() {
  console.log(`Iniciando atualização de ${companiesData.length} empresas...`);
  let successCount = 0;

  for (const c of companiesData) {
    let lat = null;
    let lng = null;
    
    const query = parseAddressForGeocode(c.address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    
    try {
      const res = await fetchGeocode(url);
      if (res && res.length > 0) {
        lat = parseFloat(res[0].lat);
        lng = parseFloat(res[0].lon);
        console.log(`[OK - Endereço] ${c.cnpj} -> ${lat}, ${lng}`);
      } else {
        // Fallback to just City/State
        const parts = c.address.split(',');
        const cityState = parts[parts.length - 1].trim();
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityState + ' Brazil')}&format=json&limit=1`;
        const resCity = await fetchGeocode(fallbackUrl);
        if (resCity && resCity.length > 0) {
          lat = parseFloat(resCity[0].lat);
          lng = parseFloat(resCity[0].lon);
          console.log(`[OK - Cidade] ${c.cnpj} -> ${lat}, ${lng}`);
        } else {
          console.log(`[FALHA] Não encontrado: ${c.address}`);
        }
      }
    } catch(e) {
      console.log(`[ERRO] ${c.cnpj}: ${e.message}`);
    }

    if (lat && lng) {
      // Clean CNPJ to match DB format (strip everything but numbers just in case, but our DB has formatted CNPJs)
      const formattedCnpj = c.cnpj.includes('CPF') ? c.cnpj.replace(/\(CPF\)/, '').trim() : c.cnpj.replace(/\(CAEPF\)/, '').trim();
      
      const { data, error } = await supabase.from('companies').update({ latitude: lat, longitude: lng }).like('cnpj', `%${formattedCnpj}%`);
      
      if (!error) {
        successCount++;
      } else {
        console.log('Erro DB:', error.message);
      }
    }
    
    // Sleep to respect Nominatim limits
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`Processo finalizado. ${successCount} empresas atualizadas.`);
}

run();
