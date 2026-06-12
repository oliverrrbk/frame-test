// Fælles Dinero/Visma-token-håndtering.
//
// Dinero's access_token (via Visma Connect) udløber typisk efter ~1 time. Tidligere
// brugte funktionerne bare det gemte token direkte — så Dinero holdt op med at virke
// ca. en time efter tilkobling (401). Denne hjælper forny'er automatisk token'et med
// det gemte refresh_token (offline_access er allerede anmodet om ved login) og gemmer
// det opdaterede token tilbage i carpenter_secrets.
//
// deno-lint-ignore-file no-explicit-any

const BUFFER_MS = 2 * 60 * 1000; // forny hvis under 2 min tilbage

interface DineroToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;   // sekunder
  timestamp?: number;    // ms (Date.getTime() da token blev hentet/fornyet)
}

// Returnerer et gyldigt access_token for den givne carpenter — forny'er hvis nødvendigt.
export async function getValidDineroToken(supabaseClient: any, carpenterId: string): Promise<string> {
  const { data: secret, error } = await supabaseClient
    .from('carpenter_secrets')
    .select('dinero_api_key')
    .eq('carpenter_id', carpenterId)
    .single();

  if (error || !secret?.dinero_api_key) {
    throw new Error("Ingen Dinero-forbindelse fundet for profilen");
  }

  let token: DineroToken;
  try {
    token = JSON.parse(secret.dinero_api_key);
  } catch {
    throw new Error("Ugyldigt Dinero-token format i databasen");
  }

  if (!token.access_token) throw new Error("Mangler access_token i Dinero-profilen");

  // Er token'et stadig gyldigt (med buffer)? Hvis vi ikke kan afgøre udløb, og der
  // findes et refresh_token, forny'er vi for en sikkerheds skyld.
  const now = Date.now();
  const knowsExpiry = typeof token.expires_in === 'number' && typeof token.timestamp === 'number';
  const expiresAt = knowsExpiry ? (token.timestamp! + token.expires_in! * 1000) : 0;
  const stillValid = knowsExpiry && (expiresAt - now > BUFFER_MS);

  if (stillValid) return token.access_token;

  // Ingen mulighed for fornyelse → bed brugeren om at forbinde igen (klar besked frem for 401)
  if (!token.refresh_token) {
    if (knowsExpiry) {
      throw new Error("Dinero-forbindelsen er udløbet. Forbind Dinero igen under Indstillinger.");
    }
    // Gammelt format uden udløbsinfo og uden refresh_token — prøv det vi har.
    return token.access_token;
  }

  // Forny via Visma Connect
  const clientId = (globalThis as any).Deno?.env.get('DINERO_CLIENT_ID');
  const clientSecret = (globalThis as any).Deno?.env.get('DINERO_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error("Dinero credentials mangler i miljøvariablerne");

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch('https://connect.visma.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Dinero token-fornyelse fejlede:", res.status, text);
    throw new Error("Dinero-forbindelsen kunne ikke fornyes. Forbind Dinero igen under Indstillinger.");
  }

  const fresh = await res.json();
  const updated: DineroToken = {
    access_token: fresh.access_token,
    // Visma roterer ofte refresh_token; behold det gamle hvis intet nyt returneres.
    refresh_token: fresh.refresh_token || token.refresh_token,
    expires_in: fresh.expires_in,
    timestamp: Date.now(),
  };

  // Gem det fornyede token tilbage (service role — RLS omgås)
  const { error: saveErr } = await supabaseClient
    .from('carpenter_secrets')
    .upsert({ carpenter_id: carpenterId, dinero_api_key: JSON.stringify(updated) });
  if (saveErr) console.error("Kunne ikke gemme fornyet Dinero-token:", saveErr.message);

  if (!updated.access_token) throw new Error("Visma returnerede intet nyt access_token");
  return updated.access_token;
}
