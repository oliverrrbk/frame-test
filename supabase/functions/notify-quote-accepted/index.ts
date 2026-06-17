// Push-notifikation når en kunde godkender et tilbud.
//
// Kaldes fra den offentlige accept-side (QuoteAcceptPage/EstimateAcceptPage) efter
// at status er sat til 'Bekræftet opgave'. Sender en system-notifikation til
// firmaets folk (ejer + tildelt projektleder/svende + opretter), så de ser med det
// samme at tilbuddet er godkendt — også uden appen åben.
//
// Genbruger samme web-push/VAPID-opsætning som send-push-reminders.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import webPush from "npm:web-push";

const publicVapidKey = Deno.env.get("PUBLIC_VAPID_KEY") || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const privateVapidKey = Deno.env.get("PRIVATE_VAPID_KEY") || "";

webPush.setVapidDetails("mailto:support@bisonframe.dk", publicVapidKey, privateVapidKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { leadId, kind } = await req.json().catch(() => ({}));
        if (!leadId) return json({ error: "Missing leadId" }, 400);
        if (!privateVapidKey) return json({ skipped: "PRIVATE_VAPID_KEY mangler" }, 200);

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") || "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        );

        const { data: lead } = await supabase
            .from("leads")
            .select("id, carpenter_id, customer_name, raw_data")
            .eq("id", leadId)
            .single();

        if (!lead) return json({ error: "Lead not found" }, 404);

        // Modtagere: ejer + tildelt PM/svende + opretter (dedupliceret)
        const ids = new Set<string>();
        if (lead.carpenter_id) ids.add(String(lead.carpenter_id));
        const pm = lead.raw_data?.assigned_pm;
        (Array.isArray(pm) ? pm : (pm ? [pm] : [])).forEach((x: unknown) => ids.add(String(x)));
        (lead.raw_data?.assigned_workers || []).forEach((x: unknown) => ids.add(String(x)));
        if (lead.raw_data?.created_by) ids.add(String(lead.raw_data.created_by));

        if (ids.size === 0) return json({ sent: 0 });

        const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("subscription_data, user_id")
            .in("user_id", Array.from(ids));

        if (!subs || subs.length === 0) return json({ sent: 0 });

        // Serveren bestemmer teksten (ingen vilkårlig tekst fra offentlig side).
        const who = lead.customer_name || "En kunde";
        const message = kind === "new_request"
            ? { title: "Ny forespørgsel 📥", body: `${who} vil gå videre med overslaget.` }
            : { title: "Tilbud godkendt! 🎉", body: `${who} har godkendt tilbuddet.` };
        const payload = JSON.stringify({ ...message, url: "/" });

        let sent = 0;
        for (const sub of subs) {
            try {
                await webPush.sendNotification(sub.subscription_data, payload);
                sent += 1;
            } catch (err) {
                const code = (err as { statusCode?: number })?.statusCode;
                // Ryd udløbne/ugyldige abonnementer
                if (code === 404 || code === 410) {
                    await supabase
                        .from("push_subscriptions")
                        .delete()
                        .eq("user_id", sub.user_id)
                        .eq("subscription_data->>endpoint", sub.subscription_data?.endpoint);
                }
            }
        }

        return json({ sent });
    } catch (e) {
        return json({ error: (e as Error)?.message || String(e) }, 500);
    }
});
