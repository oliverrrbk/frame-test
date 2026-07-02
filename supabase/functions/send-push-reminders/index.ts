// Inkl. "unplanned_case"-påmindelse (dagen efter bekræftelse) — auto-deployet via CI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import webPush from "npm:web-push";

const publicVapidKey = Deno.env.get("PUBLIC_VAPID_KEY") || "BKLNPYR40nKRfERxXXWctbVztLnvUJTBMaacXoOr_z16Jf-1T7Ou-oBWZNoJ5W7c_av8L3G3qNlww5KJr15u36U";
const privateVapidKey = Deno.env.get("PRIVATE_VAPID_KEY") || "";
const timezone = Deno.env.get("PUSH_TIMEZONE") || "Europe/Copenhagen";

webPush.setVapidDetails("mailto:support@bisonframe.dk", publicVapidKey, privateVapidKey);

type PushPayload = {
    title: string;
    body: string;
    url?: string;
};

type ReminderStats = {
    sentCount: number;
    skippedDuplicates: number;
    failedCount: number;
    missingLogTable: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
});

const getLocalDate = (date = new Date()) => dateFormatter.format(date);
const getLocalTimeParts = (date = new Date()) => {
    const [hour, minute] = timeFormatter.format(date).split(":").map(Number);
    return { hour, minute, totalMinutes: hour * 60 + minute };
};
const isLocalWeekday = (date = new Date()) => !["Sat", "Sun"].includes(weekdayFormatter.format(date));

const addDays = (dateStr: string, days: number) => {
    const date = new Date(`${dateStr}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split("T")[0];
};

const parseEventMinutes = (event: any) => {
    if (event?.allDay) return null;
    const time = event?.startTime || "10:00";
    const [hour, minute] = String(time).split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
};

const eventTimeLabel = (event: any) => {
    if (event?.allDay) return "hele dagen";
    return `kl. ${event?.startTime || "10:00"}`;
};

const cleanText = (value: any) => String(value || "").trim();

const getEventBody = (event: any, prefix: string) => {
    const title = cleanText(event?.title) || "Kalenderaftale";
    const location = cleanText(event?.location);
    const time = eventTimeLabel(event);
    return `${prefix}: ${title} ${time}${location ? ` · ${location}` : ""}`;
};

const getNotificationKey = (userId: string, type: string, relatedId: string, slot: string) =>
    `${userId}:${type}:${relatedId}:${slot}`;

async function reserveNotification(supabaseClient: any, stats: ReminderStats, params: {
    userId: string;
    type: string;
    relatedId: string;
    key: string;
    payload: PushPayload;
}) {
    const { error } = await supabaseClient
        .from("sent_push_notifications")
        .insert({
            user_id: params.userId,
            notification_type: params.type,
            related_id: params.relatedId,
            notification_key: params.key,
            payload: params.payload,
            status: "reserved"
        });

    if (!error) return true;
    if (error.code === "23505") {
        stats.skippedDuplicates += 1;
        return false;
    }
    if (error.code === "42P01") {
        stats.missingLogTable = true;
        console.warn("sent_push_notifications table is missing. Push can send, but anti-spam log is disabled.");
        return true;
    }

    console.error("Could not reserve notification", error);
    stats.failedCount += 1;
    return false;
}

async function markNotification(supabaseClient: any, key: string, status: "sent" | "failed", errorMessage = "") {
    const update = status === "sent"
        ? { status, sent_at: new Date().toISOString(), error_message: null }
        : { status, error_message: errorMessage.slice(0, 500) };

    await supabaseClient
        .from("sent_push_notifications")
        .update(update)
        .eq("notification_key", key);
}

async function removeInvalidSubscription(supabaseClient: any, userId: string, endpoint: string) {
    if (!endpoint) return;
    await supabaseClient
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("subscription_data->>endpoint", endpoint);
}

async function sendToUser(supabaseClient: any, stats: ReminderStats, params: {
    userId: string;
    type: string;
    relatedId: string;
    slot: string;
    payload: PushPayload;
}) {
    if (!privateVapidKey) {
        console.warn("PRIVATE_VAPID_KEY is missing. Push skipped.");
        return;
    }

    const { data: subs, error } = await supabaseClient
        .from("push_subscriptions")
        .select("subscription_data")
        .eq("user_id", params.userId);

    if (error || !subs || subs.length === 0) return;

    const key = getNotificationKey(params.userId, params.type, params.relatedId, params.slot);
    const reserved = await reserveNotification(supabaseClient, stats, {
        userId: params.userId,
        type: params.type,
        relatedId: params.relatedId,
        key,
        payload: params.payload
    });
    if (!reserved) return;

    let sentAny = false;
    let lastError = "";

    for (const sub of subs) {
        try {
            await webPush.sendNotification(sub.subscription_data, JSON.stringify(params.payload));
            stats.sentCount += 1;
            sentAny = true;
        } catch (err) {
            const statusCode = (err as any)?.statusCode;
            lastError = (err as Error)?.message || String(err);
            stats.failedCount += 1;
            if (statusCode === 404 || statusCode === 410) {
                await removeInvalidSubscription(supabaseClient, params.userId, sub.subscription_data?.endpoint);
            }
            console.error("Push failed", params.userId, lastError);
        }
    }

    await markNotification(supabaseClient, key, sentAny ? "sent" : "failed", lastError);
}

async function getRecipientsForEvent(supabaseClient: any, companyId: string, event: any) {
    if (!Array.isArray(event?.participants)) return [];

    let recipientIds = event.participants.filter((p: any) => p && p !== "all").map(String);

    if (event.participants.includes("all")) {
        const { data: teamMembers } = await supabaseClient
            .from("carpenters")
            .select("id")
            .eq("company_id", companyId);
        recipientIds.push(companyId, ...((teamMembers || []).map((m: any) => String(m.id))));
    }

    return [...new Set(recipientIds)];
}

// Modtagere for sags-/faktura-/tilbudshændelser: ejeren (mester) + firmaets admins
// og bogholdere. Samme mønster som lead_notification og den lokale getPlanners.
async function getOwnerAndAdmins(supabaseClient: any, ownerId: string) {
    const ids = [String(ownerId)];
    const { data: team } = await supabaseClient
        .from("carpenters")
        .select("id, role")
        .eq("company_id", ownerId);
    for (const m of team || []) {
        if (["admin", "accountant"].includes(m.role)) ids.push(String(m.id));
    }
    return [...new Set(ids)];
}

serve(async (req) => {
    const stats: ReminderStats = {
        sentCount: 0,
        skippedDuplicates: 0,
        failedCount: 0,
        missingLogTable: false
    };

    try {
        const authHeader = req.headers.get("Authorization");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

        if (!authHeader || !authHeader.includes(serviceRoleKey)) {
            console.log("WARNING: Request without valid service role key");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            serviceRoleKey
        );

        const bodyData = await req.json().catch(() => ({ type: "all" }));
        const type = bodyData?.type || "all";

        if (type === "lead_notification") {
            const leadId = bodyData?.lead_id;
            if (!leadId) {
                return new Response(JSON.stringify({ error: "Missing lead_id", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 400
                });
            }

            const { data: lead, error: leadError } = await supabaseClient
                .from("leads")
                .select("id, status, customer_name, project_category, carpenter_id, raw_data")
                .eq("id", leadId)
                .single();

            if (leadError || !lead) {
                console.error("Error fetching lead", leadError);
                return new Response(JSON.stringify({ error: "Lead not found", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 404
                });
            }

            const carpenterId = lead.carpenter_id;
            if (!carpenterId) {
                return new Response(JSON.stringify({ success: true, message: "No carpenter assigned to lead", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200
                });
            }

            let title = "";
            let bodyText = "";
            let slot = "";
            let notificationType = "";

            if (lead.status === "Ny forespørgsel") {
                title = "Ny forespørgsel";
                bodyText = `${lead.customer_name || 'En kunde'} har sendt en forespørgsel på ${lead.project_category || 'projekt'}.`;
                slot = "new_lead";
                notificationType = "lead_request";
            } else if (lead.status === "Bekræftet opgave") {
                // Manuelt oprettede sager (uden tilbud) er IKKE en kundebekræftelse — man
                // opretter dem jo selv og ved godt de findes. Notifikationen "Tilbud godkendt"
                // sendes derfor kun, når en kunde faktisk har bekræftet et tilbud.
                if (lead.raw_data?.is_manual_case === true) {
                    return new Response(JSON.stringify({ success: true, message: "Manuelt oprettet sag — ingen bekræftelses-notifikation", ...stats }), {
                        headers: { "Content-Type": "application/json" },
                        status: 200
                    });
                }
                title = "Tilbud godkendt";
                bodyText = `${lead.customer_name || 'Kunden'} har bekræftet tilbuddet på ${lead.project_category || 'projekt'}.`;
                slot = "quote_accepted";
                notificationType = "lead_accept";
            } else {
                return new Response(JSON.stringify({ success: true, message: "Status not trigger-worthy", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200
                });
            }

            const recipientIds = [String(carpenterId)];

            const { data: team } = await supabaseClient
                .from("carpenters")
                .select("id, role, company_id")
                .eq("company_id", carpenterId);

            if (team && team.length > 0) {
                // Sørg for også at tilføje ejeren selv via company_id, hvis vi ikke allerede havde den
                recipientIds.push(String(carpenterId)); 
                
                // Tilføj alle admins og bogholdere
                for (const member of team) {
                    if (["admin", "accountant"].includes(member.role)) {
                        recipientIds.push(String(member.id));
                    }
                }
            }

            const uniqueRecipients = [...new Set(recipientIds)];

            for (const userId of uniqueRecipients) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: notificationType,
                    relatedId: String(lead.id),
                    slot,
                    payload: {
                        title,
                        body: bodyText,
                        url: `/dashboard?leadId=${lead.id}`
                    }
                });
            }

            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        }

        if (type === "new_assignment") {
            const leadId = bodyData?.lead_id;
            const addedWorkers = Array.isArray(bodyData?.added_workers) ? bodyData.added_workers.map(String) : [];
            const addedPms = Array.isArray(bodyData?.added_pms) ? bodyData.added_pms.map(String) : [];
            const allAdded = [...new Set([...addedWorkers, ...addedPms])];

            if (!leadId || allAdded.length === 0) {
                return new Response(JSON.stringify({ success: true, message: "No new assignments or missing leadId", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200
                });
            }

            const { data: lead, error: leadError } = await supabaseClient
                .from("leads")
                .select("id, project_category, raw_data")
                .eq("id", leadId)
                .single();

            if (leadError || !lead) {
                console.error("Error fetching lead for assignment notification", leadError);
                return new Response(JSON.stringify({ error: "Lead not found", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 404
                });
            }

            const projectTitle = lead.raw_data?.project_title || lead.project_category || "ny opgave";
            const title = "Ny sag tildelt";
            const bodyText = `Du er blevet tilføjet til sagen: ${projectTitle}.`;

            for (const userId of allAdded) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "new_assignment",
                    relatedId: String(lead.id),
                    slot: `assigned-${lead.id}-${userId}`,
                    payload: {
                        title,
                        body: bodyText,
                        url: `/dashboard?leadId=${lead.id}`
                    }
                });
            }

            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        }

        if (type === "guest_new_project") {
            // En gæst er tilføjet på en NY sag (uden genaktivering). Send en let push.
            const userId = String(bodyData?.user_id || "");
            const leadId = String(bodyData?.lead_id || "");
            const companyName = bodyData?.company_name || "En virksomhed";
            const projectTitle = bodyData?.project_title || "et projekt";
            if (userId) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "guest_new_project",
                    relatedId: leadId,
                    slot: `guest-project-${leadId}-${userId}`,
                    payload: {
                        title: "Ny sag i Bison Frame",
                        body: `${companyName} har tilføjet dig på ${projectTitle}.`,
                        url: "/dashboard"
                    }
                });
            }
            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        }

        if (type === "case_message_notification") {
            const leadId = bodyData?.lead_id;
            const message = bodyData?.message;

            if (!leadId || !message) {
                return new Response(JSON.stringify({ error: "Missing lead_id or message", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 400
                });
            }

            const { data: lead, error: leadError } = await supabaseClient
                .from("leads")
                .select("id, project_category, raw_data")
                .eq("id", leadId)
                .single();

            if (leadError || !lead) {
                console.error("Error fetching lead for message notification", leadError);
                return new Response(JSON.stringify({ error: "Lead not found", ...stats }), {
                    headers: { "Content-Type": "application/json" },
                    status: 404
                });
            }

            const projectTitle = lead.raw_data?.project_title || lead.project_category || "sagen";
            const authorName = message.authorName || "Mester";
            const title = `Ny besked på sag: ${projectTitle}`;
            const bodyText = `${authorName} skriver: ${message.text || ""}`;

            let recipientIds: string[] = [];
            if (message.forId) {
                recipientIds = [String(message.forId)];
            } else {
                const assignedWorkers = Array.isArray(lead.raw_data?.assigned_workers) ? lead.raw_data.assigned_workers.map(String) : [];
                const assignedPm = Array.isArray(lead.raw_data?.assigned_pm) ? lead.raw_data.assigned_pm.map(String) : (lead.raw_data?.assigned_pm ? [String(lead.raw_data.assigned_pm)] : []);
                recipientIds = [...new Set([...assignedWorkers, ...assignedPm])];
            }

            for (const userId of recipientIds) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "case_message_notification",
                    relatedId: String(message.id || lead.id),
                    slot: `msg-${message.id || Date.now()}-${userId}`,
                    payload: {
                        title,
                        body: bodyText,
                        url: `/dashboard?leadId=${lead.id}`
                    }
                });
            }

            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        }

        if (type === "chat_message") {
            const threadId = bodyData?.thread_id;
            const senderId = String(bodyData?.sender_id || "");
            const messageId = bodyData?.message_id;

            if (!threadId || !messageId) {
                return new Response(JSON.stringify({ error: "Missing thread_id or message_id", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 400
                });
            }

            // Beskedens indhold (til preview)
            const { data: msg } = await supabaseClient
                .from("chat_messages")
                .select("text_content, message_type")
                .eq("id", messageId)
                .single();

            // Afsenderens navn
            const { data: sender } = await supabaseClient
                .from("carpenters")
                .select("owner_name, company_name")
                .eq("id", senderId)
                .single();
            const senderName = sender?.owner_name || sender?.company_name || "En kollega";

            // Trådens deltagere (undtagen afsenderen)
            const { data: thread } = await supabaseClient
                .from("chat_threads")
                .select("type, company_id")
                .eq("id", threadId)
                .single();

            let recipientIds: string[] = [];

            if (thread?.type === "company" && thread?.company_id) {
                // For firma-chat skal vi sende til alle aktive brugere i firmaet
                const { data: teamMembers } = await supabaseClient
                    .from("carpenters")
                    .select("id")
                    .eq("company_id", thread.company_id);
                recipientIds = [thread.company_id, ...((teamMembers || []).map((m: any) => String(m.id)))];
            } else {
                const { data: parts } = await supabaseClient
                    .from("chat_participants")
                    .select("user_id")
                    .eq("thread_id", threadId);
                recipientIds = (parts || []).map((p: any) => String(p.user_id));
            }
            
            recipientIds = [...new Set(recipientIds)].filter(id => id !== senderId);

            const preview = msg?.message_type === "image" ? "📷 Sendte et billede"
                : msg?.message_type === "voice" ? "🎤 Sendte en talebesked"
                : (msg?.text_content || "Ny besked");

            for (const userId of recipientIds) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "chat_message",
                    relatedId: String(messageId),
                    slot: `chat-${messageId}-${userId}`,
                    payload: {
                        title: `Ny besked fra ${senderName}`,
                        body: preview,
                        url: `/dashboard?chatThread=${threadId}`
                    }
                });
            }

            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" }, status: 200
            });
        }

        // A1. Faktura betalt — fyres af accounting-webhooks når en faktura markeres betalt.
        if (type === "invoice_paid") {
            const leadId = bodyData?.lead_id;
            const invoiceId = bodyData?.invoice_id;
            if (!leadId || !invoiceId) {
                return new Response(JSON.stringify({ error: "Missing lead_id/invoice_id", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 400
                });
            }
            const { data: lead } = await supabaseClient
                .from("leads")
                .select("id, customer_name, project_category, carpenter_id")
                .eq("id", leadId)
                .single();
            if (!lead?.carpenter_id) {
                return new Response(JSON.stringify({ success: true, message: "No lead/carpenter", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 200
                });
            }
            const recipients = await getOwnerAndAdmins(supabaseClient, String(lead.carpenter_id));
            for (const userId of recipients) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "invoice_paid",
                    relatedId: String(invoiceId),
                    slot: `invoice-paid-${invoiceId}`,
                    payload: {
                        title: "Faktura betalt 🎉",
                        body: `Fakturaen på ${lead.project_category || 'sagen'}${lead.customer_name ? ` fra ${lead.customer_name}` : ''} er betalt.`,
                        url: `/dashboard?leadId=${lead.id}`
                    }
                });
            }
            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" }, status: 200
            });
        }

        // A3. Ekstraarbejde godkendt — fyres af DB-trigger når en aftaleseddel bekræftes.
        if (type === "agreement_confirmed") {
            const leadId = bodyData?.lead_id;
            const agreementId = bodyData?.agreement_id;
            if (!leadId || !agreementId) {
                return new Response(JSON.stringify({ error: "Missing lead_id/agreement_id", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 400
                });
            }
            const { data: lead } = await supabaseClient
                .from("leads")
                .select("id, customer_name, carpenter_id, raw_data")
                .eq("id", leadId)
                .single();
            if (!lead?.carpenter_id) {
                return new Response(JSON.stringify({ success: true, message: "No lead/carpenter", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 200
                });
            }
            const agr = (lead.raw_data?.extra_agreements || []).find((a: any) => String(a.id) === String(agreementId));
            const title = agr?.title || "ekstraarbejde";
            let amountText = "";
            if (agr) {
                if (agr.priceType === "fast_pris" && Number(agr.amount) > 0) {
                    amountText = ` (+${Number(agr.amount).toLocaleString("da-DK")} kr.)`;
                } else if (agr.priceType === "efter_regning") {
                    amountText = " (efter regning)";
                }
            }
            const recipients = await getOwnerAndAdmins(supabaseClient, String(lead.carpenter_id));
            for (const userId of recipients) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "agreement_confirmed",
                    relatedId: String(agreementId),
                    slot: `agreement-${agreementId}`,
                    payload: {
                        title: "Ekstraarbejde godkendt ✅",
                        body: `${lead.customer_name || 'Kunden'} godkendte aftalesedlen "${title}"${amountText}.`,
                        url: `/dashboard?leadId=${lead.id}`
                    }
                });
            }
            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" }, status: 200
            });
        }

        // A4. Kunde har åbnet tilbud — fyres af DB-trigger første gang opened_at sættes.
        if (type === "quote_opened") {
            const leadId = bodyData?.lead_id;
            if (!leadId) {
                return new Response(JSON.stringify({ error: "Missing lead_id", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 400
                });
            }
            const { data: lead } = await supabaseClient
                .from("leads")
                .select("id, customer_name, project_category, carpenter_id")
                .eq("id", leadId)
                .single();
            if (!lead?.carpenter_id) {
                return new Response(JSON.stringify({ success: true, message: "No lead/carpenter", ...stats }), {
                    headers: { "Content-Type": "application/json" }, status: 200
                });
            }
            const recipients = await getOwnerAndAdmins(supabaseClient, String(lead.carpenter_id));
            for (const userId of recipients) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "quote_opened",
                    relatedId: String(lead.id),
                    slot: `quote-opened-${lead.id}`,
                    payload: {
                        title: "Kunden har åbnet dit tilbud 👀",
                        body: `${lead.customer_name || 'Kunden'} har lige åbnet tilbuddet på ${lead.project_category || 'projektet'}.`,
                        url: `/dashboard?leadId=${lead.id}`
                    }
                });
            }
            return new Response(JSON.stringify({ success: true, ...stats }), {
                headers: { "Content-Type": "application/json" }, status: 200
            });
        }

        const now = new Date();
        const todayStr = getLocalDate(now);
        const tomorrowStr = addDays(todayStr, 1);
        const { hour, minute, totalMinutes } = getLocalTimeParts(now);

        // A. Dagens Morgenbriefing (Kl. 06:00 - 06:59, bypass hour check if explicitly triggered as morning_briefing)
        if ((type === "all" && hour === 6) || type === "morning_briefing") {
            const { data: subs } = await supabaseClient
                .from("push_subscriptions")
                .select("user_id");

            const uniqueUserIds = [...new Set((subs || []).map((sub: any) => String(sub.user_id)))];
            const { data: leads } = await supabaseClient
                .from("leads")
                .select("id, project_category, raw_data")
                .in("status", ["Bekræftet opgave", "Sæt i bero"]);

            for (const userId of uniqueUserIds) {
                const myCases = (leads || []).filter(lead => {
                    const workers = Array.isArray(lead.raw_data?.assigned_workers) ? lead.raw_data.assigned_workers.map(String) : [];
                    const pms = Array.isArray(lead.raw_data?.assigned_pm) ? lead.raw_data.assigned_pm.map(String) : (lead.raw_data?.assigned_pm ? [String(lead.raw_data.assigned_pm)] : []);
                    return workers.includes(userId) || pms.includes(userId);
                });

                let msgCount = 0;
                const caseNotes: string[] = [];

                for (const lead of myCases) {
                    const messages = lead.raw_data?.case_messages || [];
                    const daily = lead.raw_data?.daily_message;

                    if (daily?.text && daily.date && daily.date.startsWith(todayStr)) {
                        if (!daily.seen_by || !daily.seen_by.includes(userId)) {
                            msgCount++;
                            caseNotes.push(String(daily.text));
                        }
                    }

                    for (const m of messages) {
                        if (m.date && m.date.startsWith(todayStr)) {
                            if (!m.forId || String(m.forId) === userId) {
                                msgCount++;
                                caseNotes.push(String(m.text));
                            }
                        }
                    }
                }

                if (msgCount > 0) {
                    const bodyText = msgCount === 1 
                        ? `Huskeseddel: "${caseNotes[0].slice(0, 60)}${caseNotes[0].length > 60 ? '...' : ''}"`
                        : `Du har ${msgCount} beskeder/aftaler på dine sager i dag.`;

                    await sendToUser(supabaseClient, stats, {
                        userId,
                        type: "morning_briefing",
                        relatedId: todayStr,
                        slot: `morning-briefing-${todayStr}-${userId}`,
                        payload: {
                            title: "Dagens huskeseddel",
                            body: bodyText,
                            url: "/dashboard"
                        }
                    });
                }
            }
        }

        // B. Ugentlig fredags-påmindelse: Husk ugeseddel (Fredag kl. 13:30 - 13:59, bypass weekday/hour check if explicitly triggered as timesheet_weekly)
        const isFriday = weekdayFormatter.format(now) === "Fri";
        if ((type === "all" && isFriday && hour === 13 && minute >= 30) || type === "timesheet_weekly") {
            const { data: subs } = await supabaseClient
                .from("push_subscriptions")
                .select("user_id");

            const uniqueUserIds = [...new Set((subs || []).map((sub: any) => String(sub.user_id)))];
            for (const userId of uniqueUserIds) {
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "timesheet_weekly",
                    relatedId: todayStr,
                    slot: `weekly-timesheet-${todayStr}-${userId}`,
                    payload: {
                        title: "Ugeseddel klar til godkendelse",
                        body: "Husk at godkende dine timer for denne uge, så lønnen kan køres.",
                        url: "/dashboard?tab=timesheet"
                    }
                });
            }
        }

        if ((type === "timesheet" || type === "all") && isLocalWeekday(now) && hour >= 15 && hour < 18) {
            const registeredToday = new Set<string>();
            const collectEntries = (rows: any[] | null) => {
                for (const row of rows || []) {
                    const entries = row.raw_data?.time_entries || [];
                    for (const entry of entries) {
                        // Underleverandør-timer (syntetiske 'sub:'-id'er) hører ikke til
                        // eget firmas timeregistrering og må ikke påvirke "mangler timer".
                        if (entry.date === todayStr && entry.employeeId && !String(entry.employeeId).startsWith('sub:')) {
                            registeredToday.add(String(entry.employeeId));
                        }
                    }
                }
            };

            const { data: leadsRows } = await supabaseClient.from("leads").select("raw_data");
            collectEntries(leadsRows);
            const { data: carpenterRows } = await supabaseClient.from("carpenters").select("raw_data");
            collectEntries(carpenterRows);

            const { data: subs } = await supabaseClient
                .from("push_subscriptions")
                .select("user_id");

            const uniqueUserIds = [...new Set((subs || []).map((sub: any) => String(sub.user_id)))];
            for (const userId of uniqueUserIds) {
                if (registeredToday.has(userId)) continue;
                await sendToUser(supabaseClient, stats, {
                    userId,
                    type: "timesheet_missing",
                    relatedId: todayStr,
                    slot: "workday-15",
                    payload: {
                        title: "Mangler timer",
                        body: "Du mangler at registrere timer for i dag.",
                        url: "/dashboard?tab=timesheet"
                    }
                });
            }
        }

        // C. Påmindelse: bekræftede sager der mangler at blive planlagt i kalenderen.
        //    Sendes tidligst DAGEN EFTER bekræftelsen (ikke med det samme), så det føles
        //    som et venligt "hov — den skal lige i kalenderen", ikke som spam.
        if ((type === "all" && hour === 8) || type === "unplanned_case") {
            const { data: leads } = await supabaseClient
                .from("leads")
                .select("id, project_category, customer_name, carpenter_id, created_at, raw_data")
                .eq("status", "Bekræftet opgave");

            // Kun sager uden startdato, hvor bekræftelsen lå på en tidligere kalenderdag.
            const overdue = (leads || []).filter((lead: any) => {
                if (lead.raw_data?.start_date) return false;
                const stamp = lead.raw_data?.confirmed_at || lead.created_at;
                if (!stamp) return false;
                return getLocalDate(new Date(stamp)) < todayStr; // mindst dagen efter
            });

            // Modtagere pr. firma: ejeren (mester) + admins/bogholdere, som planlægger.
            const plannerCache = new Map<string, string[]>();
            const getPlanners = async (ownerId: string) => {
                if (plannerCache.has(ownerId)) return plannerCache.get(ownerId)!;
                const { data: team } = await supabaseClient
                    .from("carpenters")
                    .select("id, role")
                    .eq("company_id", ownerId);
                const planners = [...new Set([
                    String(ownerId),
                    ...((team || []).filter((m: any) => ["admin", "accountant"].includes(m.role)).map((m: any) => String(m.id)))
                ])];
                plannerCache.set(ownerId, planners);
                return planners;
            };

            for (const lead of overdue) {
                if (!lead.carpenter_id) continue;
                const planners = await getPlanners(String(lead.carpenter_id));
                const projectTitle = lead.raw_data?.project_title || lead.project_category || "en sag";
                for (const userId of planners) {
                    await sendToUser(supabaseClient, stats, {
                        userId,
                        type: "unplanned_case",
                        relatedId: String(lead.id),
                        slot: `unplanned-${todayStr}`,
                        payload: {
                            title: "Sag mangler planlægning",
                            body: `Husk at lægge "${projectTitle}"${lead.customer_name ? ` for ${lead.customer_name}` : ""} ind i kalenderen.`,
                            url: "/dashboard?tab=calendar"
                        }
                    });
                }
            }
        }

        if (type === "calendar" || type === "all") {
            const { data: carpenters } = await supabaseClient
                .from("carpenters")
                .select("id, raw_data");

            for (const carpenter of carpenters || []) {
                const events = carpenter.raw_data?.calendar_events || [];

                for (const event of events) {
                    const pref = event.notification_preference || "day_before";
                    if (pref === "none") continue;

                    const eventId = String(event.id || `${event.title}-${event.startDate || event.date}`);
                    const eventDate = event.startDate || event.date;
                    const recipients = await getRecipientsForEvent(supabaseClient, String(carpenter.id), event);
                    if (recipients.length === 0) continue;

                    const reminders: Array<{ type: string; slot: string; title: string; body: string }> = [];

                    if (eventDate === tomorrowStr && (pref === "day_before" || pref === "both") && hour >= 14 && hour < 18) {
                        reminders.push({
                            type: "calendar_day_before",
                            slot: tomorrowStr,
                            title: event.type === "Materialelevering" ? "Materialer i morgen" : "Aftale i morgen",
                            body: getEventBody(event, "I morgen")
                        });
                    }

                    const eventMinutes = parseEventMinutes(event);
                    const minutesUntil = eventMinutes === null ? null : eventMinutes - totalMinutes;
                    if (eventDate === todayStr && minutesUntil !== null && minutesUntil >= 45 && minutesUntil <= 75 && (pref === "1_hour" || pref === "both")) {
                        reminders.push({
                            type: "calendar_one_hour",
                            slot: `${todayStr}-${event.startTime || "time"}`,
                            title: event.type === "Materialelevering" ? "Materialer om ca. 1 time" : "Aftale om ca. 1 time",
                            body: getEventBody(event, "Om ca. 1 time")
                        });
                    }

                    if (event.type === "Materialelevering" && eventDate === todayStr && pref === "both" && hour >= 6 && hour < 9) {
                        reminders.push({
                            type: "material_delivery_morning",
                            slot: `${todayStr}-morning`,
                            title: "Materialer i dag",
                            body: getEventBody(event, "Levering i dag")
                        });
                    }

                    for (const reminder of reminders) {
                        for (const userId of recipients) {
                            await sendToUser(supabaseClient, stats, {
                                userId,
                                type: reminder.type,
                                relatedId: eventId,
                                slot: reminder.slot,
                                payload: {
                                    title: reminder.title,
                                    body: reminder.body,
                                    url: "/dashboard?tab=calendar"
                                }
                            });
                        }
                    }
                }
            }
        }

        // A2. Faktura forfalden (én gang) — dagligt kl. 9. Fakturaer gemmes i
        //     raw_data.invoice_history; forfald = due_date, eller (fallback) fakturadato + 14 dage.
        if ((type === "all" && hour === 9) || type === "invoice_overdue") {
            const DAY_MS = 86400000;
            const { data: leads } = await supabaseClient
                .from("leads")
                .select("id, customer_name, project_category, carpenter_id, raw_data");

            for (const lead of leads || []) {
                if (!lead.carpenter_id) continue;
                const history = lead.raw_data?.invoice_history || [];
                const overdueInvoices = history.filter((inv: any) => {
                    if (inv.status !== "booked") return false; // kun sendt/bogført, ikke betalt/kladde
                    const dueStr = inv.due_date || (inv.date ? new Date(new Date(inv.date).getTime() + 14 * DAY_MS).toISOString() : null);
                    if (!dueStr) return false;
                    return getLocalDate(new Date(dueStr)) < todayStr;
                });
                if (overdueInvoices.length === 0) continue;

                const recipients = await getOwnerAndAdmins(supabaseClient, String(lead.carpenter_id));
                for (const inv of overdueInvoices) {
                    const amountText = Number(inv.amount) > 0 ? ` på ${Number(inv.amount).toLocaleString("da-DK")} kr.` : "";
                    for (const userId of recipients) {
                        await sendToUser(supabaseClient, stats, {
                            userId,
                            type: "invoice_overdue",
                            relatedId: String(inv.id),
                            slot: `invoice-overdue-${inv.id}`,
                            payload: {
                                title: "Faktura forfalden",
                                body: `Fakturaen${amountText}${lead.customer_name ? ` til ${lead.customer_name}` : ""} er forfalden og endnu ikke betalt.`,
                                url: `/dashboard?leadId=${lead.id}`
                            }
                        });
                    }
                }
            }
        }

        // A5. Tilbud udløber snart (4–5 dage før) — dagligt kl. 9. Kun sendte, ubekræftede tilbud.
        if ((type === "all" && hour === 9) || type === "quote_expiring") {
            const DAY_MS = 86400000;
            const { data: leads } = await supabaseClient
                .from("leads")
                .select("id, customer_name, project_category, carpenter_id, created_at, raw_data")
                .eq("status", "Sendt tilbud");

            for (const lead of leads || []) {
                if (!lead.carpenter_id) continue;
                const settings = lead.raw_data?.quote_settings || {};
                const validityDays = Number(settings.validityDays) || 14;
                const validUntil = settings.validUntil ? new Date(settings.validUntil) : null;
                const sentAt = lead.raw_data?.quote_sent_at ? new Date(lead.raw_data.quote_sent_at) : (lead.created_at ? new Date(lead.created_at) : null);
                let expiresAt: Date | null = null;
                if (validUntil && !isNaN(validUntil.getTime())) expiresAt = validUntil;
                else if (sentAt && !isNaN(sentAt.getTime())) expiresAt = new Date(sentAt.getTime() + validityDays * DAY_MS);
                if (!expiresAt) continue;

                const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
                if (daysLeft < 1 || daysLeft > 5) continue;

                const recipients = await getOwnerAndAdmins(supabaseClient, String(lead.carpenter_id));
                for (const userId of recipients) {
                    await sendToUser(supabaseClient, stats, {
                        userId,
                        type: "quote_expiring",
                        relatedId: String(lead.id),
                        slot: `quote-expiring-${lead.id}`,
                        payload: {
                            title: "Tilbud udløber snart",
                            body: `Tilbuddet${lead.customer_name ? ` til ${lead.customer_name}` : ""} udløber om ${daysLeft} ${daysLeft === 1 ? "dag" : "dage"} — de har ikke bekræftet endnu. Følg op?`,
                            url: `/dashboard?leadId=${lead.id}`
                        }
                    });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, ...stats }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: (err as Error).message, ...stats }), {
            headers: { "Content-Type": "application/json" },
            status: 500
        });
    }
});
