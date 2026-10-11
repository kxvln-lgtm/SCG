import {identity,originAllowed} from '../_shared/security.ts';
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if(!originAllowed(req))return json({error:"Origin forbidden"},403);
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const {db}=await identity(req);
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!botToken || !serviceRole || !supabaseUrl) return json({ error: "Telegram/Supabase secrets are not configured" }, 500);

    const supabase = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json();
    const type = body.type === "announcement" ? "announcement" : "project";
    const id = String(body.id || "");
    const publicUrl = "https://stagecraft.kz/backstage/";
    const permitted=await db.rpc("scg_notify_allowed",{p_kind:type,p_id:id});
    if(permitted.error||!permitted.data)return json({error:"Forbidden"},403);
    if (!id) return json({ error: "id required" }, 400);

    let title = "", text = "", department: string | null = null, region: string | null = null;
    if (type === "project") {
      const { data, error } = await supabase.from("projects").select("id,title,description,location,event_date,department,region,volunteers_required,status").eq("id", id).single();
      if (error || !data) return json({ error: error?.message || "Project not found" }, 404);
      title = data.title;
      department = data.department || null;
      region = data.region || null;
      const date = data.event_date ? new Date(data.event_date).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }) : "Дата уточняется";
      text = `📣 <b>${escapeHtml(data.title)}</b>\n\n${escapeHtml(data.description || "Новый проект Backstage.")}\n\n📅 ${escapeHtml(date)}\n📍 ${escapeHtml(data.location || "Место уточняется")}${data.volunteers_required ? `\n👥 Нужно волонтёров: ${data.volunteers_required}` : ""}`;
    } else {
      const { data, error } = await supabase.from("announcements").select("id,title,body,department,region").eq("id", id).single();
      if (error || !data) return json({ error: error?.message || "Announcement not found" }, 404);
      title = data.title;
      department = data.department || null;
      region = data.region || null;
      text = `📢 <b>${escapeHtml(data.title)}</b>\n\n${escapeHtml(data.body)}`;
    }

    let query = supabase.from("profiles").select("id,telegram_id").in("status", ["одобрено", "активен"]).not("telegram_id", "is", null).eq("telegram_notifications_enabled",true).eq(type==="project"?"project_notifications_enabled":"announcement_notifications_enabled",true);
    if (department) query = query.or(`department.eq.${escapeFilter(department)},division.eq.${escapeFilter(department)}`);
    if (region) query = query.eq("region", region);
    const { data: profiles, error: profilesError } = await query;
    if (profilesError) return json({ error: profilesError.message }, 500);

    const recipients = [...new Map((profiles || []).filter(p => p.telegram_id).map(p => [String(p.telegram_id), p])).values()];
    let sent = 0, failed = 0;
    for (const p of recipients) {
      try {
        const reply_markup = publicUrl ? { inline_keyboard: [[{ text: type === "project" ? "Открыть проект" : "Открыть Backstage", url: publicUrl }]] } : undefined;
        const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: p.telegram_id, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup }),
        });
        const result = await r.json();
        await supabase.from("telegram_notification_log").insert({ project_id: type === "project" ? id : null, telegram_id: p.telegram_id, status: result.ok ? "sent" : "failed", error: result.ok ? null : JSON.stringify(result) });
        if (result.ok) sent++; else failed++;
      } catch (e) {
        failed++;
        await supabase.from("telegram_notification_log").insert({ project_id: type === "project" ? id : null, telegram_id: p.telegram_id, status: "failed", error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (type === "project" && sent > 0) await supabase.from("projects").update({ telegram_notified_at: new Date().toISOString() }).eq("id", id);
    return json({ success: true, type, title, recipients: recipients.length, sent, failed });
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});

function escapeHtml(value: unknown) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function escapeFilter(value: string) { return value.replace(/,/g, "").replace(/\./g, "").replace(/\(/g, "").replace(/\)/g, ""); }

