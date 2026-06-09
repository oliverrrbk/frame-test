import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import webPush from "npm:web-push";

// Konfigurer Web Push med VAPID keys fra miljøvariabler
const publicVapidKey = Deno.env.get('PUBLIC_VAPID_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const privateVapidKey = Deno.env.get('PRIVATE_VAPID_KEY') || '';

// Sæt subject til din app's URL eller en kontakt e-mail
webPush.setVapidDetails('mailto:support@bisonframe.dk', publicVapidKey, privateVapidKey);

serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        
        // Sikkerhedstjek (Valgfrit men godt: Kræv Service Role Key eller at det kaldes via Supabase Cron)
        if (!authHeader || !authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')) {
             console.log("WARNING: Request without valid service role key");
             // Vi tillader det fortsat for testing, men i produktion bør dette afvises:
             // return new Response('Unauthorized', { status: 401 });
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { type } = await req.json().catch(() => ({ type: 'all' })); // 'timesheet' eller 'calendar' eller 'all'

        let sentCount = 0;

        // --- 1. TIMEREGISTRERING (Kl 15) ---
        if (type === 'timesheet' || type === 'all') {
            const today = new Date().toISOString().split('T')[0];
            
            // Hent alle brugere med aktive subscriptions
            const { data: subs, error: subsError } = await supabaseClient.from('push_subscriptions').select('user_id, subscription_data');
            
            if (subs && !subsError) {
                // Vi tjekker, hvem der mangler at indtaste timer for i dag
                for (const sub of subs) {
                    const { data: timesheets } = await supabaseClient
                        .from('timesheets')
                        .select('id')
                        .eq('employee_id', sub.user_id)
                        .eq('date', today);
                        
                    if (!timesheets || timesheets.length === 0) {
                        // Mangler timer! Send notifikation
                        const payload = JSON.stringify({
                            title: 'Bison Frame',
                            body: 'Husk at indtaste dine timer for i dag! ⏱️',
                            url: '/dashboard'
                        });
                        
                        try {
                            if (privateVapidKey) {
                                await webPush.sendNotification(sub.subscription_data, payload);
                                sentCount++;
                            }
                        } catch (err) {
                            console.error('Push failed for user', sub.user_id, err);
                        }
                    }
                }
            }
        }

        // --- 2. KALENDER MØDER ---
        if (type === 'calendar' || type === 'all') {
            // Find morgendagens events
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const { data: events } = await supabaseClient
                .from('calendar_events')
                .select('*')
                .eq('date', tomorrowStr);

            if (events && events.length > 0) {
                // For hvert event
                for (const event of events) {
                    // Hvis deltagerne er specificeret (participants-array)
                    if (event.participants && Array.isArray(event.participants)) {
                        for (const userId of event.participants) {
                            if (userId === 'all') continue; // Ignorer 'all' for push for ikke at spamme alle (eller send til alle?)
                            
                            const { data: subs } = await supabaseClient
                                .from('push_subscriptions')
                                .select('subscription_data')
                                .eq('user_id', userId);
                                
                            if (subs && subs.length > 0) {
                                for (const sub of subs) {
                                    const payload = JSON.stringify({
                                        title: 'Aftale i morgen',
                                        body: `${event.title} kl. ${event.startTime}`,
                                        url: '/dashboard'
                                    });
                                    try {
                                        if (privateVapidKey) {
                                            await webPush.sendNotification(sub.subscription_data, payload);
                                            sentCount++;
                                        }
                                    } catch(err) {
                                        console.error('Push failed', err);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true, sentCount }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
