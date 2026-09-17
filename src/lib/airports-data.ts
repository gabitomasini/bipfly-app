export interface AirportInfo {
  iata: string;
  city: string;
  name: string;
  country: string;
  flag: string;
  isMetropolitan?: boolean;
}

export const AIRPORTS: AirportInfo[] = [
  // --- BRASIL ---
  // Macro-códigos metropolitanos
  { iata: "SAO", city: "São Paulo", name: "Todos os aeroportos (GRU, CGH, VCP)", country: "Brasil", flag: "🇧🇷", isMetropolitan: true },
  { iata: "GRU", city: "São Paulo", name: "Guarulhos Internacional", country: "Brasil", flag: "🇧🇷" },
  { iata: "CGH", city: "São Paulo", name: "Congonhas", country: "Brasil", flag: "🇧🇷" },
  { iata: "VCP", city: "Campinas / São Paulo", name: "Viracopos Internacional", country: "Brasil", flag: "🇧🇷" },
  { iata: "RIO", city: "Rio de Janeiro", name: "Todos os aeroportos (GIG, SDU)", country: "Brasil", flag: "🇧🇷", isMetropolitan: true },
  { iata: "GIG", city: "Rio de Janeiro", name: "Galeão Internacional (Tom Jobim)", country: "Brasil", flag: "🇧🇷" },
  { iata: "SDU", city: "Rio de Janeiro", name: "Santos Dumont", country: "Brasil", flag: "🇧🇷" },
  { iata: "BHZ", city: "Belo Horizonte", name: "Todos os aeroportos (CNF, PLU)", country: "Brasil", flag: "🇧🇷", isMetropolitan: true },
  { iata: "CNF", city: "Belo Horizonte", name: "Confins - Tancredo Neves", country: "Brasil", flag: "🇧🇷" },
  { iata: "BSB", city: "Brasília", name: "Presidente Juscelino Kubitschek", country: "Brasil", flag: "🇧🇷" },
  { iata: "SSA", city: "Salvador", name: "Deputado Luís Eduardo Magalhães", country: "Brasil", flag: "🇧🇷" },
  { iata: "REC", city: "Recife", name: "Guararapes - Gilberto Freyre", country: "Brasil", flag: "🇧🇷" },
  { iata: "FOR", city: "Fortaleza", name: "Pinto Martins", country: "Brasil", flag: "🇧🇷" },
  { iata: "POA", city: "Porto Alegre", name: "Salgado Filho", country: "Brasil", flag: "🇧🇷" },
  { iata: "CWB", city: "Curitiba", name: "Afonso Pena", country: "Brasil", flag: "🇧🇷" },
  { iata: "FLN", city: "Florianópolis", name: "Hercílio Luz", country: "Brasil", flag: "🇧🇷" },
  { iata: "NAT", city: "Natal", name: "Governador Aluízio Alves", country: "Brasil", flag: "🇧🇷" },
  { iata: "MCZ", city: "Maceió", name: "Zumbi dos Palmares", country: "Brasil", flag: "🇧🇷" },
  { iata: "BEL", city: "Belém", name: "Val-de-Cans / Júlio Cezar Ribeiro", country: "Brasil", flag: "🇧🇷" },
  { iata: "MAO", city: "Manaus", name: "Eduardo Gomes", country: "Brasil", flag: "🇧🇷" },
  { iata: "GYN", city: "Goiânia", name: "Santa Genoveva", country: "Brasil", flag: "🇧🇷" },
  { iata: "VIX", city: "Vitória", name: "Eurico de Aguiar Salles", country: "Brasil", flag: "🇧🇷" },
  { iata: "CGB", city: "Cuiabá", name: "Marechal Rondon", country: "Brasil", flag: "🇧🇷" },
  { iata: "CGR", city: "Campo Grande", name: "Campo Grande Internacional", country: "Brasil", flag: "🇧🇷" },
  { iata: "NVT", city: "Navegantes", name: "Ministro Victor Konder", country: "Brasil", flag: "🇧🇷" },
  { iata: "IGU", city: "Foz do Iguaçu", name: "Foz do Iguaçu Internacional", country: "Brasil", flag: "🇧🇷" },
  { iata: "JPA", city: "João Pessoa", name: "Presidente Castro Pinto", country: "Brasil", flag: "🇧🇷" },
  { iata: "AJU", city: "Aracaju", name: "Santa Maria", country: "Brasil", flag: "🇧🇷" },
  { iata: "SLZ", city: "São Luís", name: "Marechal Cunha Machado", country: "Brasil", flag: "🇧🇷" },
  { iata: "THE", city: "Teresina", name: "Senador Petrônio Portella", country: "Brasil", flag: "🇧🇷" },
  { iata: "UDI", city: "Uberlândia", name: "Ten.-Cel.-Av. César Bombonato", country: "Brasil", flag: "🇧🇷" },
  { iata: "RAO", city: "Ribeirão Preto", name: "Dr. Leite Lopes", country: "Brasil", flag: "🇧🇷" },
  { iata: "BPS", city: "Porto Seguro", name: "Porto Seguro Internacional", country: "Brasil", flag: "🇧🇷" },

  // --- EUROPA ---
  { iata: "ROM", city: "Roma", name: "Todos os aeroportos (FCO, CIA)", country: "Itália", flag: "🇮🇹", isMetropolitan: true },
  { iata: "FCO", city: "Roma", name: "Fiumicino (Leonardo da Vinci)", country: "Itália", flag: "🇮🇹" },
  { iata: "CIA", city: "Roma", name: "Ciampino", country: "Itália", flag: "🇮🇹" },
  { iata: "MIL", city: "Milão", name: "Todos os aeroportos (MXP, LIN, BGY)", country: "Itália", flag: "🇮🇹", isMetropolitan: true },
  { iata: "MXP", city: "Milão", name: "Malpensa", country: "Itália", flag: "🇮🇹" },
  { iata: "LIN", city: "Milão", name: "Linate", country: "Itália", flag: "🇮🇹" },
  { iata: "BGY", city: "Milão / Bérgamo", name: "Orio al Serio", country: "Itália", flag: "🇮🇹" },
  { iata: "VCE", city: "Veneza", name: "Marco Polo", country: "Itália", flag: "🇮🇹" },
  { iata: "FLR", city: "Florença", name: "Peretola (Amerigo Vespucci)", country: "Itália", flag: "🇮🇹" },
  { iata: "NAP", city: "Nápoles", name: "Capodichino", country: "Itália", flag: "🇮🇹" },
  { iata: "BLQ", city: "Bolonha", name: "Guglielmo Marconi", country: "Itália", flag: "🇮🇹" },
  { iata: "LIS", city: "Lisboa", name: "Humberto Delgado", country: "Portugal", flag: "🇵🇹" },
  { iata: "OPO", city: "Porto", name: "Francisco Sá Carneiro", country: "Portugal", flag: "🇵🇹" },
  { iata: "MAD", city: "Madrid", name: "Adolfo Suárez Madrid-Barajas", country: "Espanha", flag: "🇪🇸" },
  { iata: "BCN", city: "Barcelona", name: "El Prat", country: "Espanha", flag: "🇪🇸" },
  { iata: "PAR", city: "Paris", name: "Todos os aeroportos (CDG, ORY, BVA)", country: "França", flag: "🇫🇷", isMetropolitan: true },
  { iata: "CDG", city: "Paris", name: "Charles de Gaulle", country: "França", flag: "🇫🇷" },
  { iata: "ORY", city: "Paris", name: "Orly", country: "França", flag: "🇫🇷" },
  { iata: "NCE", city: "Nice", name: "Côte d'Azur", country: "França", flag: "🇫🇷" },
  { iata: "LON", city: "Londres", name: "Todos os aeroportos (LHR, LGW, STN, LTN)", country: "Reino Unido", flag: "🇬🇧", isMetropolitan: true },
  { iata: "LHR", city: "Londres", name: "Heathrow", country: "Reino Unido", flag: "🇬🇧" },
  { iata: "LGW", city: "Londres", name: "Gatwick", country: "Reino Unido", flag: "🇬🇧" },
  { iata: "STN", city: "Londres", name: "Stansted", country: "Reino Unido", flag: "🇬🇧" },
  { iata: "LTN", city: "Londres", name: "Luton", country: "Reino Unido", flag: "🇬🇧" },
  { iata: "AMS", city: "Amsterdã", name: "Schiphol", country: "Holanda", flag: "🇳🇱" },
  { iata: "FRA", city: "Frankfurt", name: "Frankfurt am Main", country: "Alemanha", flag: "🇩🇪" },
  { iata: "MUC", city: "Munique", name: "Franz Josef Strauss", country: "Alemanha", flag: "🇩🇪" },
  { iata: "BER", city: "Berlim", name: "Berlin Brandenburg", country: "Alemanha", flag: "🇩🇪" },
  { iata: "ZRH", city: "Zurique", name: "Kloten", country: "Suíça", flag: "🇨🇭" },
  { iata: "GVA", city: "Genebra", name: "Cointrin", country: "Suíça", flag: "🇨🇭" },
  { iata: "BRU", city: "Bruxelas", name: "Zaventem", country: "Bélgica", flag: "🇧🇪" },
  { iata: "VIE", city: "Viena", name: "Schwechat", country: "Áustria", flag: "🇦🇹" },
  { iata: "ATH", city: "Atenas", name: "Eleftherios Venizelos", country: "Grécia", flag: "🇬🇷" },
  { iata: "DUB", city: "Dublin", name: "Dublin Airport", country: "Irlanda", flag: "🇮🇪" },
  { iata: "CPH", city: "Copenhague", name: "Kastrup", country: "Dinamarca", flag: "🇩🇰" },
  { iata: "ARN", city: "Estocolmo", name: "Arlanda", country: "Suécia", flag: "🇸🇪" },
  { iata: "OSL", city: "Oslo", name: "Gardermoen", country: "Noruega", flag: "🇳🇴" },
  { iata: "HEL", city: "Helsinque", name: "Vantaa", country: "Finlândia", flag: "🇫🇮" },
  { iata: "PRG", city: "Praga", name: "Václav Havel", country: "República Tcheca", flag: "🇨🇿" },
  { iata: "BUD", city: "Budapeste", name: "Ferenc Liszt", country: "Hungria", flag: "🇭🇺" },
  { iata: "WAW", city: "Varsóvia", name: "Chopin", country: "Polônia", flag: "🇵🇱" },
  { iata: "IST", city: "Istambul", name: "Istanbul Airport", country: "Turquia", flag: "🇹🇷" },
  { iata: "SAW", city: "Istambul", name: "Sabiha Gökçen", country: "Turquia", flag: "🇹🇷" },

  // --- AMÉRICA DO NORTE ---
  { iata: "MIA", city: "Miami", name: "Miami Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "MCO", city: "Orlando", name: "Orlando Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "NYC", city: "Nova York", name: "Todos os aeroportos (JFK, EWR, LGA)", country: "Estados Unidos", flag: "🇺🇸", isMetropolitan: true },
  { iata: "JFK", city: "Nova York", name: "John F. Kennedy", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "EWR", city: "Nova York / Newark", name: "Newark Liberty", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "LGA", city: "Nova York", name: "LaGuardia", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "LAX", city: "Los Angeles", name: "Los Angeles Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "SFO", city: "São Francisco", name: "San Francisco Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "ORD", city: "Chicago", name: "O'Hare", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "ATL", city: "Atlanta", name: "Hartsfield-Jackson", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "BOS", city: "Boston", name: "Logan Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "IAH", city: "Houston", name: "George Bush Intercontinental", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "DFW", city: "Dallas", name: "Dallas/Fort Worth", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "LAS", city: "Las Vegas", name: "Harry Reid Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "IAD", city: "Washington D.C.", name: "Dulles Internacional", country: "Estados Unidos", flag: "🇺🇸" },
  { iata: "YYZ", city: "Toronto", name: "Pearson Internacional", country: "Canadá", flag: "🇨🇦" },
  { iata: "YVR", city: "Vancouver", name: "Vancouver Internacional", country: "Canadá", flag: "🇨🇦" },
  { iata: "YUL", city: "Montreal", name: "Pierre Elliott Trudeau", country: "Canadá", flag: "🇨🇦" },
  { iata: "MEX", city: "Cidade do México", name: "Benito Juárez", country: "México", flag: "🇲🇽" },
  { iata: "CUN", city: "Cancún", name: "Cancún Internacional", country: "México", flag: "🇲🇽" },

  // --- AMÉRICA DO SUL & CENTRAL ---
  { iata: "BUE", city: "Buenos Aires", name: "Todos os aeroportos (EZE, AEP)", country: "Argentina", flag: "🇦🇷", isMetropolitan: true },
  { iata: "EZE", city: "Buenos Aires", name: "Ezeiza - Ministro Pistarini", country: "Argentina", flag: "🇦🇷" },
  { iata: "AEP", city: "Buenos Aires", name: "Aeroparque Jorge Newbery", country: "Argentina", flag: "🇦🇷" },
  { iata: "SCL", city: "Santiago", name: "Arturo Merino Benítez", country: "Chile", flag: "🇨🇱" },
  { iata: "MVD", city: "Montevidéu", name: "Carrasco", country: "Uruguai", flag: "🇺🇾" },
  { iata: "PDP", city: "Punta del Este", name: "Capitán de Corbeta Carlos A. Curbelo", country: "Uruguai", flag: "🇺🇾" },
  { iata: "LIM", city: "Lima", name: "Jorge Chávez", country: "Peru", flag: "🇵🇪" },
  { iata: "BOG", city: "Bogotá", name: "El Dorado", country: "Colômbia", flag: "🇨🇴" },
  { iata: "MDE", city: "Medellín", name: "José María Córdova", country: "Colômbia", flag: "🇨🇴" },
  { iata: "CTG", city: "Cartagena", name: "Rafael Núñez", country: "Colômbia", flag: "🇨🇴" },
  { iata: "PTY", city: "Cidade do Panamá", name: "Tocumen", country: "Panamá", flag: "🇵🇦" },
  { iata: "ASU", city: "Assunção", name: "Silvio Pettirossi", country: "Paraguai", flag: "🇵🇾" },
  { iata: "UIO", city: "Quito", name: "Mariscal Sucre", country: "Equador", flag: "🇪🇨" },
  { iata: "GYE", city: "Guayaquil", name: "José Joaquín de Olmedo", country: "Equador", flag: "🇪🇨" },
  { iata: "SJO", city: "San José", name: "Juan Santamaría", country: "Costa Rica", flag: "🇨🇷" },
  { iata: "PUJ", city: "Punta Cana", name: "Punta Cana Internacional", country: "República Dominicana", flag: "🇩🇴" },

  // --- ÁSIA, ORIENTE MÉDIO, ÁFRICA & OCEANIA ---
  { iata: "DXB", city: "Dubai", name: "Dubai Internacional", country: "Emirados Árabes", flag: "🇦🇪" },
  { iata: "DOH", city: "Doha", name: "Hamad Internacional", country: "Catar", flag: "🇶🇦" },
  { iata: "TYO", city: "Tóquio", name: "Todos os aeroportos (HND, NRT)", country: "Japão", flag: "🇯🇵", isMetropolitan: true },
  { iata: "HND", city: "Tóquio", name: "Haneda", country: "Japão", flag: "🇯🇵" },
  { iata: "NRT", city: "Tóquio", name: "Narita", country: "Japão", flag: "🇯🇵" },
  { iata: "KIX", city: "Osaka", name: "Kansai", country: "Japão", flag: "🇯🇵" },
  { iata: "ICN", city: "Seul", name: "Incheon", country: "Coreia do Sul", flag: "🇰🇷" },
  { iata: "SIN", city: "Singapura", name: "Changi", country: "Singapura", flag: "🇸🇬" },
  { iata: "BKK", city: "Bangkok", name: "Suvarnabhumi", country: "Tailândia", flag: "🇹🇭" },
  { iata: "DPS", city: "Bali", name: "Ngurah Rai", country: "Indonésia", flag: "🇮🇩" },
  { iata: "SYD", city: "Sydney", name: "Kingsford Smith", country: "Austrália", flag: "🇦🇺" },
  { iata: "MEL", city: "Melbourne", name: "Melbourne Airport", country: "Austrália", flag: "🇦🇺" },
  { iata: "AKL", city: "Auckland", name: "Auckland Airport", country: "Nova Zelândia", flag: "🇳🇿" },
  { iata: "JNB", city: "Joanesburgo", name: "O.R. Tambo", country: "África do Sul", flag: "🇿🇦" },
  { iata: "CPT", city: "Cidade do Cabo", name: "Cape Town Internacional", country: "África do Sul", flag: "🇿🇦" },
  { iata: "CAI", city: "Cairo", name: "Cairo Internacional", country: "Egito", flag: "🇪🇬" },
  { iata: "RAK", city: "Marrakech", name: "Menara", country: "Marrocos", flag: "🇲🇦" },
];

/**
 * Remove acentos e caracteres especiais para busca normalizada
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Busca preditiva de aeroportos por código IATA, cidade ou país
 */
export function searchAirports(query: string, limit = 8): AirportInfo[] {
  if (!query || !query.trim()) {
    // Retorna os principais de padrão, priorizando áreas metropolitanas e hubs
    return AIRPORTS.slice(0, limit);
  }

  const cleanQuery = normalizeText(query.trim());

  // 1. Prioriza match exato de código IATA
  const exactIata = AIRPORTS.filter((a) => a.iata.toLowerCase() === cleanQuery);
  if (exactIata.length > 0) return exactIata;

  // 2. Busca aeroportos que começam com o IATA ou cujo nome/cidade contém o termo
  const matches = AIRPORTS.filter((a) => {
    const iata = a.iata.toLowerCase();
    const city = normalizeText(a.city);
    const name = normalizeText(a.name);
    const country = normalizeText(a.country);

    // Matches especiais para abreviações comuns brasileiras
    if (cleanQuery === "sp" && (iata === "sao" || city.includes("sao paulo"))) return true;
    if (cleanQuery === "rj" && (iata === "rio" || city.includes("rio de janeiro"))) return true;
    if (cleanQuery === "bh" && (iata === "bhz" || city.includes("belo horizonte"))) return true;
    if (cleanQuery === "ny" && (iata === "nyc" || city.includes("nova york"))) return true;

    return (
      iata.startsWith(cleanQuery) ||
      city.includes(cleanQuery) ||
      name.includes(cleanQuery) ||
      country.includes(cleanQuery)
    );
  });

  // Ordena para que opções metropolitanas (ex: SAO, RIO) apareçam no topo quando a cidade for pesquisada
  matches.sort((a, b) => {
    if (a.isMetropolitan && !b.isMetropolitan) return -1;
    if (!a.isMetropolitan && b.isMetropolitan) return 1;
    return 0;
  });

  return matches.slice(0, limit);
}
