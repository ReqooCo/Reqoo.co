export function jsonOk(data = {}, status = 200, extra = {}) {
  return json({ ok: true, ...data }, status, extra);
}

export function jsonError(code, message, status = 500, extra = {}) {
  return json({ ok: false, error: { code, message } }, status, extra);
}

export function json(data, status = 200, extra = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  });
  return new Response(JSON.stringify(data), { status, headers });
}

export function safeError(error, fallback = 'Permintaan gagal. Sila cuba lagi.') {
  const message = String(error?.message || '').trim();
  const safe = /^(Cart kosong|Nama dan telefon diperlukan|Product tidak tersedia|Product ID tidak sah|Harga product tidak sah|Unauthorized|Forbidden|Not found|Method not allowed)/i.test(message);
  return safe && message ? message : fallback;
}
