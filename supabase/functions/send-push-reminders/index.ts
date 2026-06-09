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
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            // Hent alle brugere der har calendar_events
            const { data: carpenters } = await supabaseClient
                .from('carpenters')
                .select('id, raw_data');

            if (carpenters && carpenters.length > 0) {
                for (const carpenter of carpenters) {
                    const events = carpenter.raw_data?.calendar_events || [];
                    
                    for (const event of events) {
                        const pref = event.notification_preference || 'day_before';
                        if (pref === 'none') continue;

                        let shouldSend = false;
                        let pushTitle = 'Kalender Påmindelse';
                        let pushBody = `${event.title} kl. ${event.startTime}`;

                        // Dagen Før tjek
                        if (event.date === tomorrowStr && (pref === 'day_before' || pref === 'both')) {
                            shouldSend = true;
                            pushTitle = 'Aftale i morgen';
                        }
                        
                        // 1 time før tjek
                        if (event.date === todayStr && (pref === '1_hour' || pref === 'both')) {
                            const [eventHour] = event.startTime.split(':').map(Number);
                            const currentHour = now.getHours();
                            if (eventHour - currentHour === 1) {
                                shouldSend = true;
                                pushTitle = 'Aftale om 1 time';
                            }
                        }

                        if (shouldSend && event.participants && Array.isArray(event.participants)) {
                            for (const userId of event.participants) {
                                if (userId === 'all') continue;
                                
                                const { data: subs } = await supabaseClient
                                    .from('push_subscriptions')
                                    .select('subscription_data')
                                    .eq('user_id', userId);
                                    
                                if (subs && subs.length > 0) {
                                    for (const sub of subs) {
                                        const payload = JSON.stringify({
                                            title: pushTitle,
                                            body: pushBody,
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
