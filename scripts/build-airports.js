const https = require("https");
const fs = require("fs");
const path = require("path");

const ISO_COUNTRIES_PT = {
  "AF": "Afeganistão", "AL": "Albânia", "DE": "Alemanha", "AD": "Andorra", "AO": "Angola",
  "AI": "Anguilla", "AQ": "Antártida", "AG": "Antígua e Barbuda", "SA": "Arábia Saudita",
  "DZ": "Argélia", "AR": "Argentina", "AM": "Armênia", "AW": "Aruba", "AU": "Austrália",
  "AT": "Áustria", "AZ": "Azerbaijão", "BS": "Bahamas", "BD": "Bangladesh", "BB": "Barbados",
  "BH": "Bahrein", "BE": "Bélgica", "BZ": "Belize", "BJ": "Benin", "BM": "Bermudas",
  "BY": "Bielorrússia", "BO": "Bolívia", "BA": "Bósnia e Herzegovina", "BW": "Botsuana",
  "BR": "Brasil", "BN": "Brunei", "BG": "Bulgária", "BF": "Burkina Faso", "BI": "Burundi",
  "BT": "Butão", "CV": "Cabo Verde", "KH": "Camboja", "CM": "Camarões", "CA": "Canadá",
  "QA": "Catar", "KZ": "Cazaquistão", "TD": "Chade", "CL": "Chile", "CN": "China",
  "CY": "Chipre", "CO": "Colômbia", "KM": "Comores", "CG": "Congo", "CD": "República Democrática do Congo",
  "KP": "Coreia do Norte", "KR": "Coreia do Sul", "CI": "Costa do Marfim", "CR": "Costa Rica",
  "HR": "Croácia", "CU": "Cuba", "CW": "Curaçao", "DK": "Dinamarca", "DJ": "Djibuti",
  "DM": "Dominica", "EG": "Egito", "SV": "El Salvador", "AE": "Emirados Árabes Unidos",
  "EC": "Equador", "ER": "Eritreia", "SK": "Eslováquia", "SI": "Eslovênia", "ES": "Espanha",
  "US": "Estados Unidos", "EE": "Estônia", "ET": "Etiópia", "FJ": "Fiji", "PH": "Filipinas",
  "FI": "Finlândia", "FR": "França", "GA": "Gabão", "GM": "Gâmbia", "GH": "Gana",
  "GE": "Geórgia", "GI": "Gibraltar", "GD": "Granada", "GR": "Grécia", "GL": "Groenlândia",
  "GP": "Guadalupe", "GU": "Guam", "GT": "Guatemala", "GG": "Guernsey", "GY": "Guiana",
  "GF": "Guiana Francesa", "GN": "Guiné", "GQ": "Guiné Equatorial", "GW": "Guiné-Bissau",
  "HT": "Haiti", "HN": "Honduras", "HK": "Hong Kong", "HU": "Hungria", "YE": "Iêmen",
  "KY": "Ilhas Cayman", "CK": "Ilhas Cook", "FO": "Ilhas Faroe", "FK": "Ilhas Malvinas",
  "MH": "Ilhas Marshall", "SB": "Ilhas Salomão", "VI": "Ilhas Virgens Americanas",
  "VG": "Ilhas Virgens Britânicas", "IN": "Índia", "ID": "Indonésia", "IR": "Irã",
  "IQ": "Iraque", "IE": "Irlanda", "IS": "Islândia", "IL": "Israel", "IT": "Itália",
  "JM": "Jamaica", "JP": "Japão", "JE": "Jersey", "JO": "Jordânia", "KW": "Kuwait",
  "LA": "Laos", "LS": "Lesoto", "LV": "Letônia", "LB": "Líbano", "LR": "Libéria",
  "LY": "Líbia", "LI": "Liechtenstein", "LT": "Lituânia", "LU": "Luxemburgo", "MO": "Macau",
  "MK": "Macedônia do Norte", "MG": "Madagascar", "MY": "Malásia", "MW": "Malaui",
  "MV": "Maldivas", "ML": "Mali", "MT": "Malta", "MA": "Marrocos", "MQ": "Martinica",
  "MU": "Maurício", "MR": "Mauritânia", "MX": "México", "MM": "Mianmar", "FM": "Micronésia",
  "MZ": "Moçambique", "MD": "Moldávia", "MC": "Mônaco", "MN": "Mongólia", "ME": "Montenegro",
  "MS": "Montserrat", "NA": "Namíbia", "NR": "Nauru", "NP": "Nepal", "NI": "Nicarágua",
  "NE": "Níger", "NG": "Nigéria", "NO": "Noruega", "NC": "Nova Caledônia", "NZ": "Nova Zelândia",
  "OM": "Omã", "NL": "Holanda / Países Baixos", "PW": "Palau", "PS": "Palestina",
  "PA": "Panamá", "PG": "Papua-Nova Guiné", "PK": "Paquistão", "PY": "Paraguai",
  "PE": "Peru", "PF": "Polinésia Francesa", "PL": "Polônia", "PR": "Porto Rico",
  "PT": "Portugal", "KE": "Quênia", "KG": "Quirguistão", "KI": "Quiribati",
  "GB": "Reino Unido", "CF": "República Centro-Africana", "CZ": "República Tcheca",
  "DO": "República Dominicana", "RE": "Reunião", "RO": "Romênia", "RW": "Ruanda",
  "RU": "Rússia", "EH": "Saara Ocidental", "WS": "Samoa", "AS": "Samoa Americana",
  "LC": "Santa Lúcia", "KN": "São Cristóvão e Névis", "SM": "San Marino",
  "MF": "São Martinho", "ST": "São Tomé e Príncipe", "VC": "São Vicente e Granadinas",
  "SN": "Senegal", "SL": "Serra Leoa", "RS": "Sérvia", "SC": "Seychelles",
  "SG": "Singapura", "SX": "Sint Maarten", "SY": "Síria", "SO": "Somália",
  "LK": "Sri Lanka", "SZ": "Suazilândia / Essuatíni", "SD": "Sudão", "SS": "Sudão do Sul",
  "SE": "Suécia", "CH": "Suíça", "SR": "Suriname", "TH": "Tailândia", "TW": "Taiwan",
  "TJ": "Tajiquistão", "TZ": "Tanzânia", "TL": "Timor-Leste", "TG": "Togo",
  "TO": "Tonga", "TT": "Trinidad e Tobago", "TN": "Tunísia", "TM": "Turcomenistão",
  "TR": "Turquia", "TV": "Tuvalu", "UA": "Ucrânia", "UG": "Uganda", "UY": "Uruguai",
  "UZ": "Uzbequistão", "VU": "Vanuatu", "VA": "Vaticano", "VE": "Venezuela",
  "VN": "Vietnã", "ZM": "Zâmbia", "ZW": "Zimbábue"
};

function getFlag(code) {
  if (!code || code.length !== 2) return "✈️";
  return code.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// Macro-códigos metropolitanos essenciais para busca de voos
const METROPOLITAN_AIRPORTS = [
  { iata: "SAO", city: "São Paulo", cityEn: "Sao Paulo", name: "Todos os aeroportos (GRU, CGH, VCP)", country: "Brasil", countryEn: "Brazil", flag: "🇧🇷", isMetropolitan: true },
  { iata: "RIO", city: "Rio de Janeiro", cityEn: "Rio de Janeiro", name: "Todos os aeroportos (GIG, SDU)", country: "Brasil", countryEn: "Brazil", flag: "🇧🇷", isMetropolitan: true },
  { iata: "BHZ", city: "Belo Horizonte", cityEn: "Belo Horizonte", name: "Todos os aeroportos (CNF, PLU)", country: "Brasil", countryEn: "Brazil", flag: "🇧🇷", isMetropolitan: true },
  { iata: "NYC", city: "Nova York", cityEn: "New York", name: "Todos os aeroportos (JFK, EWR, LGA)", country: "Estados Unidos", countryEn: "United States", flag: "🇺🇸", isMetropolitan: true },
  { iata: "LON", city: "Londres", cityEn: "London", name: "Todos os aeroportos (LHR, LGW, STN, LTN, LCY)", country: "Reino Unido", countryEn: "United Kingdom", flag: "🇬🇧", isMetropolitan: true },
  { iata: "PAR", city: "Paris", cityEn: "Paris", name: "Todos os aeroportos (CDG, ORY, BVA)", country: "França", countryEn: "France", flag: "🇫🇷", isMetropolitan: true },
  { iata: "ROM", city: "Roma", cityEn: "Rome", name: "Todos os aeroportos (FCO, CIA)", country: "Itália", countryEn: "Italy", flag: "🇮🇹", isMetropolitan: true },
  { iata: "MIL", city: "Milão", cityEn: "Milan", name: "Todos os aeroportos (MXP, LIN, BGY)", country: "Itália", countryEn: "Italy", flag: "🇮🇹", isMetropolitan: true },
  { iata: "BUE", city: "Buenos Aires", cityEn: "Buenos Aires", name: "Todos os aeroportos (EZE, AEP)", country: "Argentina", countryEn: "Argentina", flag: "🇦🇷", isMetropolitan: true },
  { iata: "TYO", city: "Tóquio", cityEn: "Tokyo", name: "Todos os aeroportos (HND, NRT)", country: "Japão", countryEn: "Japan", flag: "🇯🇵", isMetropolitan: true },
  { iata: "CHI", city: "Chicago", cityEn: "Chicago", name: "Todos os aeroportos (ORD, MDW)", country: "Estados Unidos", countryEn: "United States", flag: "🇺🇸", isMetropolitan: true },
  { iata: "WAS", city: "Washington D.C.", cityEn: "Washington", name: "Todos os aeroportos (IAD, DCA, BWI)", country: "Estados Unidos", countryEn: "United States", flag: "🇺🇸", isMetropolitan: true },
  { iata: "MOW", city: "Moscou", cityEn: "Moscow", name: "Todos os aeroportos (SVO, DME, VKO)", country: "Rússia", countryEn: "Russia", flag: "🇷🇺", isMetropolitan: true },
  { iata: "YTO", city: "Toronto", cityEn: "Toronto", name: "Todos os aeroportos (YYZ, YTZ)", country: "Canadá", countryEn: "Canada", flag: "🇨🇦", isMetropolitan: true },
  { iata: "YMQ", city: "Montreal", cityEn: "Montreal", name: "Todos os aeroportos (YUL, YHU)", country: "Canadá", countryEn: "Canada", flag: "🇨🇦", isMetropolitan: true },
  { iata: "STO", city: "Estocolmo", cityEn: "Stockholm", name: "Todos os aeroportos (ARN, BMA, NYO)", country: "Suécia", countryEn: "Sweden", flag: "🇸🇪", isMetropolitan: true },
];

// Curadoria de aeroportos brasileiros mais frequentes para garantir grafia perfeita em português
const BRAZIL_CURATED = {
  "GRU": { city: "São Paulo", name: "Guarulhos Internacional (Cumbica)", country: "Brasil", flag: "🇧🇷" },
  "CGH": { city: "São Paulo", name: "Congonhas", country: "Brasil", flag: "🇧🇷" },
  "VCP": { city: "Campinas / São Paulo", name: "Viracopos Internacional", country: "Brasil", flag: "🇧🇷" },
  "GIG": { city: "Rio de Janeiro", name: "Galeão Internacional (Tom Jobim)", country: "Brasil", flag: "🇧🇷" },
  "SDU": { city: "Rio de Janeiro", name: "Santos Dumont", country: "Brasil", flag: "🇧🇷" },
  "CNF": { city: "Belo Horizonte", name: "Confins - Tancredo Neves", country: "Brasil", flag: "🇧🇷" },
  "PLU": { city: "Belo Horizonte", name: "Pampulha - Carlos Drummond de Andrade", country: "Brasil", flag: "🇧🇷" },
  "BSB": { city: "Brasília", name: "Presidente Juscelino Kubitschek", country: "Brasil", flag: "🇧🇷" },
  "SSA": { city: "Salvador", name: "Deputado Luís Eduardo Magalhães", country: "Brasil", flag: "🇧🇷" },
  "REC": { city: "Recife", name: "Guararapes - Gilberto Freyre", country: "Brasil", flag: "🇧🇷" },
  "FOR": { city: "Fortaleza", name: "Pinto Martins", country: "Brasil", flag: "🇧🇷" },
  "POA": { city: "Porto Alegre", name: "Salgado Filho Internacional", country: "Brasil", flag: "🇧🇷" },
  "CWB": { city: "Curitiba", name: "Afonso Pena Internacional", country: "Brasil", flag: "🇧🇷" },
  "FLN": { city: "Florianópolis", name: "Hercílio Luz Internacional", country: "Brasil", flag: "🇧🇷" },
  "NAT": { city: "Natal", name: "Governador Aluízio Alves", country: "Brasil", flag: "🇧🇷" },
  "MCZ": { city: "Maceió", name: "Zumbi dos Palmares", country: "Brasil", flag: "🇧🇷" },
  "BEL": { city: "Belém", name: "Val-de-Cans / Júlio Cezar Ribeiro", country: "Brasil", flag: "🇧🇷" },
  "MAO": { city: "Manaus", name: "Eduardo Gomes Internacional", country: "Brasil", flag: "🇧🇷" },
  "GYN": { city: "Goiânia", name: "Santa Genoveva", country: "Brasil", flag: "🇧🇷" },
  "VIX": { city: "Vitória", name: "Eurico de Aguiar Salles", country: "Brasil", flag: "🇧🇷" },
  "CGB": { city: "Cuiabá", name: "Marechal Rondon", country: "Brasil", flag: "🇧🇷" },
  "CGR": { city: "Campo Grande", name: "Campo Grande Internacional", country: "Brasil", flag: "🇧🇷" },
  "NVT": { city: "Navegantes", name: "Ministro Victor Konder", country: "Brasil", flag: "🇧🇷" },
  "IGU": { city: "Foz do Iguaçu", name: "Foz do Iguaçu Internacional", country: "Brasil", flag: "🇧🇷" },
  "JPA": { city: "João Pessoa", name: "Presidente Castro Pinto", country: "Brasil", flag: "🇧🇷" },
  "AJU": { city: "Aracaju", name: "Santa Maria", country: "Brasil", flag: "🇧🇷" },
  "SLZ": { city: "São Luís", name: "Marechal Cunha Machado", country: "Brasil", flag: "🇧🇷" },
  "THE": { city: "Teresina", name: "Senador Petrônio Portella", country: "Brasil", flag: "🇧🇷" },
  "UDI": { city: "Uberlândia", name: "Ten.-Cel.-Av. César Bombonato", country: "Brasil", flag: "🇧🇷" },
  "RAO": { city: "Ribeirão Preto", name: "Dr. Leite Lopes", country: "Brasil", flag: "🇧🇷" },
  "BPS": { city: "Porto Seguro", name: "Porto Seguro Internacional", country: "Brasil", flag: "🇧🇷" },
  "CXJ": { city: "Caxias do Sul", name: "Hugo Cantergiani", country: "Brasil", flag: "🇧🇷" },
  "XAP": { city: "Chapecó", name: "Serafin Enoss Bertaso", country: "Brasil", flag: "🇧🇷" },
  "JOI": { city: "Joinville", name: "Lauro Carneiro de Loyola", country: "Brasil", flag: "🇧🇷" },
  "IMP": { city: "Imperatriz", name: "Prefeito Renato Moreira", country: "Brasil", flag: "🇧🇷" },
  "JDO": { city: "Juazeiro do Norte", name: "Orlando Bezerra de Menezes", country: "Brasil", flag: "🇧🇷" },
  "CPV": { city: "Campina Grande", name: "Presidente João Suassuna", country: "Brasil", flag: "🇧🇷" },
  "IOS": { city: "Ilhéus", name: "Jorge Amado", country: "Brasil", flag: "🇧🇷" },
  "PVH": { city: "Porto Velho", name: "Governador Jorge Teixeira de Oliveira", country: "Brasil", flag: "🇧🇷" },
  "RBR": { city: "Rio Branco", name: "Plácido de Castro", country: "Brasil", flag: "🇧🇷" },
  "MCP": { city: "Macapá", name: "Alberto Alcolumbre", country: "Brasil", flag: "🇧🇷" },
  "BVB": { city: "Boa Vista", name: "Atlas Brasil Cantanhede", country: "Brasil", flag: "🇧🇷" },
  "PMW": { city: "Palmas", name: "Brigadeiro Lysias Rodrigues", country: "Brasil", flag: "🇧🇷" },
  "FEN": { city: "Fernando de Noronha", name: "Governador Carlos Wilson", country: "Brasil", flag: "🇧🇷" },
  "SJL": { city: "São José do Rio Preto", name: "Prof. Eribelto Manoel Reino", country: "Brasil", flag: "🇧🇷" },
  "MGF": { city: "Maringá", name: "Sílvio Name Júnior", country: "Brasil", flag: "🇧🇷" },
  "LDB": { city: "Londrina", name: "Governador José Richa", country: "Brasil", flag: "🇧🇷" },
  "PET": { city: "Pelotas", name: "João Simões Lopes Neto", country: "Brasil", flag: "🇧🇷" },
  "CCM": { city: "Criciúma / Forquilhinha", name: "Diomício Freitas", country: "Brasil", flag: "🇧🇷" },
  "JJG": { city: "Jaguaruna", name: "Humberto Ghizzo Bortoluzzi", country: "Brasil", flag: "🇧🇷" },
  "SMT": { city: "Santa Maria", name: "Santa Maria", country: "Brasil", flag: "🇧🇷" },
  "PPB": { city: "Presidente Prudente", name: "Adhemar de Barros", country: "Brasil", flag: "🇧🇷" },
  "BAU": { city: "Bauru", name: "Bauru-Arealva", country: "Brasil", flag: "🇧🇷" },
  "JTC": { city: "Bauru", name: "Comandante João Ribeiro de Barros", country: "Brasil", flag: "🇧🇷" },
  "CFB": { city: "Cabo Frio", name: "Cabo Frio Internacional", country: "Brasil", flag: "🇧🇷" },
  "MEA": { city: "Macaé", name: "Benedito Lacerda", country: "Brasil", flag: "🇧🇷" },
  "OPS": { city: "Sinop", name: "Presidente João Figueiredo", country: "Brasil", flag: "🇧🇷" },
  "ROO": { city: "Rondonópolis", name: "Maestro Marinho Franco", country: "Brasil", flag: "🇧🇷" },
  "ATM": { city: "Altamira", name: "Altamira", country: "Brasil", flag: "🇧🇷" },
  "STM": { city: "Santarém", name: "Maestro Wilson Fonseca", country: "Brasil", flag: "🇧🇷" },
  "MAB": { city: "Marabá", name: "João Correa da Rocha", country: "Brasil", flag: "🇧🇷" },
  "CZS": { city: "Cruzeiro do Sul", name: "Cruzeiro do Sul", country: "Brasil", flag: "🇧🇷" }
};

// Curadoria de aeroportos globais populares
const GLOBAL_POPULAR = {
  "LIS": { city: "Lisboa", name: "Humberto Delgado", country: "Portugal", flag: "🇵🇹" },
  "OPO": { city: "Porto", name: "Francisco Sá Carneiro", country: "Portugal", flag: "🇵🇹" },
  "FAO": { city: "Faro", name: "Gago Coutinho (Algarve)", country: "Portugal", flag: "🇵🇹" },
  "FNC": { city: "Funchal (Madeira)", name: "Cristiano Ronaldo", country: "Portugal", flag: "🇵🇹" },
  "MAD": { city: "Madrid", name: "Adolfo Suárez Madrid-Barajas", country: "Espanha", flag: "🇪🇸" },
  "BCN": { city: "Barcelona", name: "Josep Tarradellas Barcelona-El Prat", country: "Espanha", flag: "🇪🇸" },
  "CDG": { city: "Paris", name: "Charles de Gaulle", country: "França", flag: "🇫🇷" },
  "ORY": { city: "Paris", name: "Orly", country: "França", flag: "🇫🇷" },
  "FCO": { city: "Roma", name: "Fiumicino (Leonardo da Vinci)", country: "Itália", flag: "🇮🇹" },
  "CIA": { city: "Roma", name: "Ciampino", country: "Itália", flag: "🇮🇹" },
  "MXP": { city: "Milão", name: "Malpensa", country: "Itália", flag: "🇮🇹" },
  "LIN": { city: "Milão", name: "Linate", country: "Itália", flag: "🇮🇹" },
  "BGY": { city: "Milão / Bérgamo", name: "Orio al Serio", country: "Itália", flag: "🇮🇹" },
  "VCE": { city: "Veneza", name: "Marco Polo", country: "Itália", flag: "🇮🇹" },
  "FLR": { city: "Florença", name: "Peretola (Amerigo Vespucci)", country: "Itália", flag: "🇮🇹" },
  "NAP": { city: "Nápoles", name: "Capodichino", country: "Itália", flag: "🇮🇹" },
  "BLQ": { city: "Bolonha", name: "Guglielmo Marconi", country: "Itália", flag: "🇮🇹" },
  "LHR": { city: "Londres", name: "Heathrow", country: "Reino Unido", flag: "🇬🇧" },
  "LGW": { city: "Londres", name: "Gatwick", country: "Reino Unido", flag: "🇬🇧" },
  "STN": { city: "Londres", name: "Stansted", country: "Reino Unido", flag: "🇬🇧" },
  "AMS": { city: "Amsterdã", name: "Schiphol", country: "Holanda / Países Baixos", flag: "🇳🇱" },
  "FRA": { city: "Frankfurt", name: "Frankfurt am Main", country: "Alemanha", flag: "🇩🇪" },
  "MUC": { city: "Munique", name: "Franz Josef Strauss", country: "Alemanha", flag: "🇩🇪" },
  "BER": { city: "Berlim", name: "Berlin Brandenburg", country: "Alemanha", flag: "🇩🇪" },
  "ZRH": { city: "Zurique", name: "Zurich Kloten", country: "Suíça", flag: "🇨🇭" },
  "GVA": { city: "Genebra", name: "Geneva Cointrin", country: "Suíça", flag: "🇨🇭" },
  "VIE": { city: "Viena", name: "Vienna International", country: "Áustria", flag: "🇦🇹" },
  "DUB": { city: "Dublin", name: "Dublin Airport", country: "Irlanda", flag: "🇮🇪" },
  "ATH": { city: "Atenas", name: "Eleftherios Venizelos", country: "Grécia", flag: "🇬🇷" },
  "JTR": { city: "Santorini", name: "Santorini (Thira)", country: "Grécia", flag: "🇬🇷" },
  "JMK": { city: "Mykonos", name: "Mykonos Airport", country: "Grécia", flag: "🇬🇷" },
  "MIA": { city: "Miami", name: "Miami International", country: "Estados Unidos", flag: "🇺🇸" },
  "MCO": { city: "Orlando", name: "Orlando International", country: "Estados Unidos", flag: "🇺🇸" },
  "FLL": { city: "Fort Lauderdale", name: "Fort Lauderdale-Hollywood", country: "Estados Unidos", flag: "🇺🇸" },
  "JFK": { city: "Nova York", name: "John F. Kennedy International", country: "Estados Unidos", flag: "🇺🇸" },
  "EWR": { city: "Nova York / Newark", name: "Newark Liberty International", country: "Estados Unidos", flag: "🇺🇸" },
  "LGA": { city: "Nova York", name: "LaGuardia", country: "Estados Unidos", flag: "🇺🇸" },
  "LAX": { city: "Los Angeles", name: "Los Angeles International", country: "Estados Unidos", flag: "🇺🇸" },
  "SFO": { city: "São Francisco", name: "San Francisco International", country: "Estados Unidos", flag: "🇺🇸" },
  "LAS": { city: "Las Vegas", name: "Harry Reid International", country: "Estados Unidos", flag: "🇺🇸" },
  "ORD": { city: "Chicago", name: "O'Hare International", country: "Estados Unidos", flag: "🇺🇸" },
  "BOS": { city: "Boston", name: "Logan International", country: "Estados Unidos", flag: "🇺🇸" },
  "ATL": { city: "Atlanta", name: "Hartsfield-Jackson Atlanta", country: "Estados Unidos", flag: "🇺🇸" },
  "IAH": { city: "Houston", name: "George Bush Intercontinental", country: "Estados Unidos", flag: "🇺🇸" },
  "DFW": { city: "Dallas", name: "Dallas/Fort Worth International", country: "Estados Unidos", flag: "🇺🇸" },
  "EZE": { city: "Buenos Aires", name: "Ministro Pistarini (Ezeiza)", country: "Argentina", flag: "🇦🇷" },
  "AEP": { city: "Buenos Aires", name: "Aeroparque Jorge Newbery", country: "Argentina", flag: "🇦🇷" },
  "SCL": { city: "Santiago", name: "Arturo Merino Benítez", country: "Chile", flag: "🇨🇱" },
  "MVD": { city: "Montevidéu", name: "Carrasco Internacional", country: "Uruguai", flag: "🇺🇾" },
  "PDP": { city: "Punta del Este", name: "Capitán de Corbeta Carlos A. Curbelo", country: "Uruguai", flag: "🇺🇾" },
  "LIM": { city: "Lima", name: "Jorge Chávez Internacional", country: "Peru", flag: "🇵🇪" },
  "CUZ": { city: "Cusco", name: "Alejandro Velasco Astete", country: "Peru", flag: "🇵🇪" },
  "BOG": { city: "Bogotá", name: "El Dorado Internacional", country: "Colômbia", flag: "🇨🇴" },
  "MDE": { city: "Medellín", name: "José María Córdova", country: "Colômbia", flag: "🇨🇴" },
  "CTG": { city: "Cartagena", name: "Rafael Núñez", country: "Colômbia", flag: "🇨🇴" },
  "PTY": { city: "Cidade do Panamá", name: "Tocumen Internacional", country: "Panamá", flag: "🇵🇦" },
  "CUN": { city: "Cancún", name: "Cancún Internacional", country: "México", flag: "🇲🇽" },
  "MEX": { city: "Cidade do México", name: "Benito Juárez Internacional", country: "México", flag: "🇲🇽" },
  "DXB": { city: "Dubai", name: "Dubai International", country: "Emirados Árabes Unidos", flag: "🇦🇪" },
  "AUH": { city: "Abu Dhabi", name: "Zayed International", country: "Emirados Árabes Unidos", flag: "🇦🇪" },
  "DOH": { city: "Doha", name: "Hamad International", country: "Catar", flag: "🇶🇦" },
  "IST": { city: "Istambul", name: "Istanbul Airport", country: "Turquia", flag: "🇹🇷" },
  "SAW": { city: "Istambul", name: "Sabiha Gökçen", country: "Turquia", flag: "🇹🇷" },
  "HND": { city: "Tóquio", name: "Haneda", country: "Japão", flag: "🇯🇵" },
  "NRT": { city: "Tóquio", name: "Narita", country: "Japão", flag: "🇯🇵" },
  "KIX": { city: "Osaka", name: "Kansai International", country: "Japão", flag: "🇯🇵" },
  "ICN": { city: "Seul", name: "Incheon International", country: "Coreia do Sul", flag: "🇰🇷" },
  "BKK": { city: "Bangcoc", name: "Suvarnabhumi", country: "Tailândia", flag: "🇹🇭" },
  "DMK": { city: "Bangcoc", name: "Don Mueang", country: "Tailândia", flag: "🇹🇭" },
  "HKT": { city: "Phuket", name: "Phuket International", country: "Tailândia", flag: "🇹🇭" },
  "DPS": { city: "Bali", name: "Ngurah Rai International", country: "Indonésia", flag: "🇮🇩" },
  "SIN": { city: "Singapura", name: "Changi", country: "Singapura", flag: "🇸🇬" },
  "SYD": { city: "Sydney", name: "Kingsford Smith", country: "Austrália", flag: "🇦🇺" },
  "MEL": { city: "Melbourne", name: "Tullamarine", country: "Austrália", flag: "🇦🇺" },
  "AKL": { city: "Auckland", name: "Auckland Airport", country: "Nova Zelândia", flag: "🇳🇿" },
  "JNB": { city: "Joanesburgo", name: "O.R. Tambo International", country: "África do Sul", flag: "🇿🇦" },
  "CPT": { city: "Cidade do Cabo", name: "Cape Town International", country: "África do Sul", flag: "🇿🇦" },
  "CAI": { city: "Cairo", name: "Cairo International", country: "Egito", flag: "🇪🇬" },
  "TLV": { city: "Tel Aviv", name: "Ben Gurion", country: "Israel", flag: "🇮🇱" }
};

console.log("Fetching global dataset from mwgg/Airports...");
https.get("https://raw.githubusercontent.com/mwgg/Airports/master/airports.json", (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log("Parsing dataset...");
    const raw = JSON.parse(data);

    const resultMap = new Map();

    // 1. Injeta os Metropolitanos no topo
    for (const m of METROPOLITAN_AIRPORTS) {
      resultMap.set(m.iata.toUpperCase(), m);
    }

    // 2. Injeta a curadoria brasileira
    for (const iata in BRAZIL_CURATED) {
      resultMap.set(iata.toUpperCase(), {
        iata: iata.toUpperCase(),
        ...BRAZIL_CURATED[iata]
      });
    }

    // 3. Injeta a curadoria global
    for (const iata in GLOBAL_POPULAR) {
      if (!resultMap.has(iata.toUpperCase())) {
        resultMap.set(iata.toUpperCase(), {
          iata: iata.toUpperCase(),
          ...GLOBAL_POPULAR[iata]
        });
      }
    }

    // 4. Processa todos os aeroportos do dataset mundial
    let countNew = 0;
    for (const key in raw) {
      const item = raw[key];
      if (!item.iata || item.iata.length !== 3 || item.iata === "\\N" || item.iata === "000") {
        continue;
      }
      const iata = item.iata.toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(iata)) continue;

      const countryCode = (item.country || "").toUpperCase().trim();
      const countryPt = ISO_COUNTRIES_PT[countryCode] || countryCode || "Internacional";
      const flag = getFlag(countryCode);
      const rawCity = (item.city || item.state || item.name || iata).trim();
      const rawName = (item.name || rawCity).trim();

      if (resultMap.has(iata)) {
        // Enriquecer aeroportos curados com keywords em inglês se disponíveis
        const existing = resultMap.get(iata);
        existing.cityEn = rawCity;
        existing.countryEn = item.country || existing.country;
        if (typeof item.lat === "number") existing.lat = item.lat;
        if (typeof item.lon === "number") existing.lon = item.lon;
      } else {
        resultMap.set(iata, {
          iata,
          city: rawCity,
          name: rawName,
          country: countryPt,
          countryEn: countryCode,
          flag: flag,
          lat: typeof item.lat === "number" ? item.lat : undefined,
          lon: typeof item.lon === "number" ? item.lon : undefined
        });
        countNew++;
      }
    }

    const airportsArray = Array.from(resultMap.values());
    console.log(`Total airports compiled: ${airportsArray.length} (${countNew} from raw dataset)`);

    // Gera o arquivo JSON otimizado
    const outJsonPath = path.join(__dirname, "../src/lib/airports.json");
    fs.writeFileSync(outJsonPath, JSON.stringify(airportsArray, null, 2), "utf8");
    console.log(`Saved JSON dataset to ${outJsonPath} (${(fs.statSync(outJsonPath).size / 1024).toFixed(1)} KB)`);

    // Gera o mapa rápido para utils.ts
    const namesMap = {};
    for (const a of airportsArray) {
      if (a.isMetropolitan) {
        namesMap[a.iata] = `${a.city} (${a.name})`;
      } else {
        namesMap[a.iata] = a.city !== a.name ? `${a.city} (${a.name})` : a.name;
      }
    }
    const outNamesPath = path.join(__dirname, "../src/lib/airports-map.json");
    fs.writeFileSync(outNamesPath, JSON.stringify(namesMap), "utf8");
    console.log(`Saved names lookup map to ${outNamesPath}`);
  });
}).on("error", (err) => {
  console.error("Failed to download dataset:", err);
});
