import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import webPush from "npm:web-push";

const publicVapidKey = Deno.env.get("PUBLIC_VAPID_KEY") || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
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

        const { type } = await req.json().catch(() => ({ type: "all" }));
        const now = new Date();
        const todayStr = getLocalDate(now);
        const tomorrowStr = addDays(todayStr, 1);
        const { hour, totalMinutes } = getLocalTimeParts(now);

        if ((type === "timesheet" || type === "all") && isLocalWeekday(now) && hour >= 15 && hour < 18) {
            const registeredToday = new Set<string>();
            const collectEntries = (rows: any[] | null) => {
                for (const row of rows || []) {
                    const entries = row.raw_data?.time_entries || [];
                    for (const entry of entries) {
                        if (entry.date === todayStr && entry.employeeId) {
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
                        url: "/dashboard"
                    }
                });
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
                                    url: "/dashboard"
                                }
                            });
                        }
                    }
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
