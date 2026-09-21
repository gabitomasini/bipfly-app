/**
 * Utilitários de Validação de Dados de Usuário e Rotas
 */

const POPULAR_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.com.br",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "live.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "globo.com",
];

const KNOWN_TYPO_MAP: Record<string, string> = {
  // Gmail typos
  "gmail.com.br": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cpm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmaul.com": "gmail.com",
  "gemail.com": "gmail.com",
  "gmeil.com": "gmail.com",

  // Hotmail typos
  "hotmai.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cpm": "hotmail.com",
  "hotmeil.com": "hotmail.com",
  "hotmiel.com": "hotmail.com",

  // Outlook typos
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlock.com": "outlook.com",
  "outlook.con.br": "outlook.com.br",

  // Yahoo typos
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yaho.com.br": "yahoo.com.br",
  "yahooo.com": "yahoo.com",
  "yahool.com": "yahoo.com",

  // iCloud typos
  "iclou.com": "icloud.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
  "icloud.co": "icloud.com",
  "iclould.com": "icloud.com",

  // Live typos
  "live.con": "live.com",
  "live.co": "live.com",

  // Brazilian providers
  "uol.com": "uol.com.br",
  "bol.com": "bol.com.br",
};

/**
 * Calcula a distância de Levenshtein entre duas strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestedValue?: string;
}

/**
 * Valida se o usuário preencheu Nome e Sobrenome (mínimo de 2 palavras com 2+ caracteres cada)
 */
export function validateFullName(name: string, locale: "pt" | "en" = "pt"): ValidationResult {
  const trimmed = (name || "").trim();

  if (!trimmed) {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "Please enter your full name (first and last name)."
          : "Por favor, informe seu nome e sobrenome completos.",
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "Please include both your first name and last name."
          : "Por favor, inclua seu nome e sobrenome.",
    };
  }

  // Verifica se cada parte tem pelo menos 2 caracteres
  const isTooShort = parts.some((p) => p.length < 2);
  if (isTooShort) {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "Each name part must contain at least 2 characters."
          : "Cada parte do nome deve ter pelo menos 2 letras.",
    };
  }

  return { isValid: true };
}

/**
 * Valida formato do e-mail e detecta erros de digitação em provedores populares
 */
export function validateEmail(email: string, locale: "pt" | "en" = "pt"): ValidationResult {
  const trimmed = (email || "").trim().toLowerCase();

  if (!trimmed) {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "Please enter your email address."
          : "Por favor, informe seu endereço de e-mail.",
    };
  }

  // RFC 5322 regex padrão
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "Please enter a valid email address format (e.g. name@domain.com)."
          : "Formato de e-mail inválido. Exemplo: nome@dominio.com.",
    };
  }

  const [localPart, domainPart] = trimmed.split("@");

  if (!localPart || !domainPart) {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "Please enter a complete email address."
          : "Por favor, informe um endereço de e-mail completo.",
    };
  }

  // Checagem 1: Mapa direto de erros conhecidos (ex: gmail.com.br -> gmail.com)
  if (KNOWN_TYPO_MAP[domainPart]) {
    const correctedDomain = KNOWN_TYPO_MAP[domainPart];
    const suggested = `${localPart}@${correctedDomain}`;
    return {
      isValid: false,
      error:
        locale === "en"
          ? `The email domain looks incorrect. Did you mean ${suggested}?`
          : `O domínio do e-mail parece incorreto. Você quis dizer ${suggested}?`,
      suggestedValue: suggested,
    };
  }

  // Checagem 2: Levenshtein distance para provedores populares
  if (!POPULAR_DOMAINS.includes(domainPart)) {
    let closestDomain: string | null = null;
    let minDistance = 999;

    for (const popDomain of POPULAR_DOMAINS) {
      const dist = levenshteinDistance(domainPart, popDomain);
      if (dist < minDistance && dist <= 2) {
        minDistance = dist;
        closestDomain = popDomain;
      }
    }

    if (closestDomain && minDistance <= 2) {
      const suggested = `${localPart}@${closestDomain}`;
      return {
        isValid: false,
        error:
          locale === "en"
            ? `The email domain looks like a typo. Did you mean ${suggested}?`
            : `O domínio do e-mail parece conter um erro de digitação. Você quis dizer ${suggested}?`,
        suggestedValue: suggested,
      };
    }
  }

  // Checagem 3: TLD mínimo (ex: .c ou .con não comuns sem ser provedor conhecido)
  const tldParts = domainPart.split(".");
  const tld = tldParts[tldParts.length - 1];
  if (tld.length < 2 || tld === "con" || tld === "cpm" || tld === "coom") {
    return {
      isValid: false,
      error:
        locale === "en"
          ? "The email domain ending looks invalid (e.g. .con). Please check your email."
          : "A terminação do e-mail parece inválida (ex: .con). Verifique se digitou corretamente.",
    };
  }

  return { isValid: true };
}
