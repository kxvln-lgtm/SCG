
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function getAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const secretDict = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const serviceKey = secretDict.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("Supabase server key is unavailable");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const admin = getAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
    const user = authData.user;

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone_number || "").trim();
    const consent = body.consent === true;

    if (!consent) {
      return json({ error: "Consent is required to receive a Telegram verification code." }, 400);
    }
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return json({ error: "Phone number must be in E.164 format, e.g. +77001234567." }, 400);
    }

    if(Deno.env.get("SCG_TELEGRAM_GATEWAY_ENABLED")!=="true")return json({error:"Phone verification is disabled until usage costs are approved."},503);
    const token = Deno.env.get("TELEGRAM_GATEWAY_TOKEN");
    if (!token) return json({ error: "Telegram Gateway is not configured yet." }, 503);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const [{ count: userCount }, { count: phoneRecentCount }] = await Promise.all([
      admin
        .from("telegram_gateway_verifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo),
      admin
        .from("telegram_gateway_verifications")
        .select("id", { count: "exact", head: true })
        .eq("phone_number", phone)
        .gte("created_at", sixtySecondsAgo),
    ]);

    if ((userCount || 0) >= 5) {
      return json({ error: "Too many verification requests. Try again later." }, 429);
    }
    if ((phoneRecentCount || 0) >= 1) {
      return json({ error: "Please wait before requesting another code." }, 429);
    }

    const gatewayRes = await fetch("https://gatewayapi.telegram.org/sendVerificationMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone,
        code_length: 6,
        ttl: 300,
        payload: user.id,
      }),
    });

    const gateway = await gatewayRes.json().catch(() => ({}));
    if (!gatewayRes.ok || gateway.ok !== true || !gateway.result?.request_id) {
      const message = String(gateway?.error || "Telegram Gateway request failed");
      await admin.from("telegram_gateway_verifications").insert({
        user_id: user.id,
        phone_number: phone,
        request_id: crypto.randomUUID(),
        status: "failed",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        error: message.slice(0, 500),
      });
      return json({ error: message }, 400);
    }

    const result = gateway.result;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await admin
      .from("telegram_gateway_verifications")
      .insert({
        user_id: user.id,
        phone_number: phone,
        request_id: result.request_id,
        status: "sent",
        request_cost: result.request_cost ?? null,
        remaining_balance: result.remaining_balance ?? null,
        expires_at: expiresAt,
      });

    if (insertError) {
      return json({ error: "Could not save verification request." }, 500);
    }

    return json({
      ok: true,
      request_id: result.request_id,
      expires_in: 300,
      delivery_status: result.delivery_status?.status ?? "sent",
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});

