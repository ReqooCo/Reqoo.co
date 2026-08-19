const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function now() {
  return new Date().toISOString();
}

function id(prefix = "") {
  return `${prefix}${crypto.randomUUID().replaceAll("-", "")}`;
}

function cleanString(value, max = 500) {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

function money(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function adminAuthorized(request, env) {
  const configured = env.ADMIN_API_KEY;
  if (!configured) return { ok: false, status: 503, code: "PRODUCT_ADMIN_AUTH_NOT_CONFIGURED" };
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${configured}`
    ? { ok: true }
    : { ok: false, status: 401, code: "PRODUCT_ADMIN_UNAUTHORIZED" };
}

function parseJsonObject(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function validateProduct(input, partial = false) {
  const errors = [];
  if (!partial || input.name !== undefined) {
    if (!cleanString(input.name, 200)) errors.push("name is required");
  }
  if (!partial || input.product_type !== undefined) {
    const allowed = ["physical", "digital", "licensed", "play_access", "service"];
    if (!allowed.includes(input.product_type)) errors.push("invalid product_type");
  }
  if (!partial || input.fulfillment_type !== undefined) {
    const allowed = ["physical_shipping", "digital_delivery", "licensed_access", "play_access", "service_custom"];
    if (!allowed.includes(input.fulfillment_type)) errors.push("invalid fulfillment_type");
  }
  if (input.base_price_minor !== undefined && money(input.base_price_minor) === null) errors.push("invalid base_price_minor");
  if (input.sale_price_minor !== undefined && input.sale_price_minor !== null && money(input.sale_price_minor) === null) errors.push("invalid sale_price_minor");
  return errors;
}

async function productById(db, productId) {
  return db.prepare(`SELECT * FROM products WHERE id = ?`).bind(productId).first();
}

async function fullProduct(db, productId) {
  const product = await productById(db, productId);
  if (!product) return null;
  const [images, variations, customFields, addons] = await Promise.all([
    db.prepare(`SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, created_at`).bind(productId).all(),
    db.prepare(`SELECT * FROM product_variations WHERE product_id = ? ORDER BY created_at`).bind(productId).all(),
    db.prepare(`SELECT * FROM product_custom_fields WHERE product_id = ? ORDER BY sort_order, created_at`).bind(productId).all(),
    db.prepare(`SELECT * FROM product_addons WHERE product_id = ? ORDER BY sort_order, created_at`).bind(productId).all()
  ]);
  return { ...product, images: images.results || [], variations: variations.results || [], custom_fields: customFields.results || [], addons: addons.results || [] };
}

async function createProduct(request, env) {
  const auth = adminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.code }, auth.status);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const errors = validateProduct(input);
  if (errors.length) return json({ ok: false, error: "VALIDATION_FAILED", details: errors }, 400);

  const db = env.DB;
  const productId = id("prd_");
  const timestamp = now();
  const sku = cleanString(input.sku, 100);
  const slug = cleanString(input.slug, 160);
  const status = input.status || "draft";
  const allowedStatus = ["draft", "active", "hidden", "out_of_stock", "archived"];
  if (!allowedStatus.includes(status)) return json({ ok: false, error: "INVALID_STATUS" }, 400);

  try {
    await db.prepare(`INSERT INTO products (id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(productId, sku, cleanString(input.name, 200), slug, input.product_type, input.fulfillment_type, cleanString(input.description, 5000), cleanString(input.short_description, 1000), money(input.base_price_minor) ?? 0, input.sale_price_minor == null ? null : money(input.sale_price_minor), cleanString(input.currency, 10) || "MYR", status, cleanString(input.internal_notes, 5000), cleanString(input.production_instructions, 5000), cleanString(input.seo_title, 200), cleanString(input.seo_description, 1000), timestamp, timestamp)
      .run();

    const traceId = crypto.randomUUID();
    await db.prepare(`INSERT INTO activity_events (id,event_type,product_id,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)`)
      .bind(id("evt_"), "product.created", productId, traceId, JSON.stringify({ actor: "admin" }), timestamp).run();

    return json({ ok: true, trace_id: traceId, product: await fullProduct(db, productId) }, 201);
  } catch (error) {
    return json({ ok: false, error: "PRODUCT_CREATE_FAILED", message: String(error?.message || error) }, 500);
  }
}

async function updateProduct(request, env, productId) {
  const auth = adminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.code }, auth.status);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const errors = validateProduct(input, true);
  if (errors.length) return json({ ok: false, error: "VALIDATION_FAILED", details: errors }, 400);

  const db = env.DB;
  const existing = await productById(db, productId);
  if (!existing) return json({ ok: false, error: "PRODUCT_NOT_FOUND" }, 404);

  const fields = [];
  const values = [];
  const map = {
    sku: ["sku", v => cleanString(v, 100)], name: ["name", v => cleanString(v, 200)], slug: ["slug", v => cleanString(v, 160)],
    product_type: ["product_type", v => v], fulfillment_type: ["fulfillment_type", v => v], description: ["description", v => cleanString(v, 5000)],
    short_description: ["short_description", v => cleanString(v, 1000)], base_price_minor: ["base_price_minor", v => money(v)], sale_price_minor: ["sale_price_minor", v => v == null ? null : money(v)],
    currency: ["currency", v => cleanString(v, 10)], status: ["status", v => v], internal_notes: ["internal_notes", v => cleanString(v, 5000)],
    production_instructions: ["production_instructions", v => cleanString(v, 5000)], seo_title: ["seo_title", v => cleanString(v, 200)], seo_description: ["seo_description", v => cleanString(v, 1000)]
  };
  for (const [key, [column, convert]] of Object.entries(map)) {
    if (input[key] !== undefined) {
      const value = convert(input[key]);
      if (key.endsWith("_minor") && input[key] != null && value === null) return json({ ok: false, error: `INVALID_${key.toUpperCase()}` }, 400);
      fields.push(`${column} = ?`); values.push(value ?? null);
    }
  }
  if (fields.length === 0) return json({ ok: true, trace_id: crypto.randomUUID(), product: await fullProduct(db, productId) });
  fields.push("updated_at = ?"); values.push(now(), productId);

  try {
    await db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const traceId = crypto.randomUUID();
    await db.prepare(`INSERT INTO activity_events (id,event_type,product_id,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)`)
      .bind(id("evt_"), "product.updated", productId, traceId, JSON.stringify({ actor: "admin", fields: fields.map(x => x.split(" = ")[0]) }), now()).run();
    return json({ ok: true, trace_id: traceId, product: await fullProduct(db, productId) });
  } catch (error) {
    return json({ ok: false, error: "PRODUCT_UPDATE_FAILED", message: String(error?.message || error) }, 500);
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: "CORE_DB_BINDING_MISSING" }, 503);
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const productId = parts.length > 2 ? parts[2] : null;

  if (request.method === "GET") {
    if (productId) {
      const product = await fullProduct(env.DB, productId);
      return product ? json({ ok: true, product }) : json({ ok: false, error: "PRODUCT_NOT_FOUND" }, 404);
    }
    const status = url.searchParams.get("status") || "active";
    const result = await env.DB.prepare(`SELECT id,sku,name,slug,product_type,fulfillment_type,short_description,base_price_minor,sale_price_minor,currency,status,created_at,updated_at FROM products WHERE status = ? ORDER BY created_at DESC`).bind(status).all();
    return json({ ok: true, products: result.results || [] });
  }

  if (request.method === "POST" && !productId) return createProduct(request, env);
  if ((request.method === "PUT" || request.method === "PATCH") && productId) return updateProduct(request, env, productId);
  return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
}
