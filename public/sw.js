self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                vibrate: [100, 50, 100],
                data: {
                    url: data.url || '/'
                }
            };
            event.waitUntil(
                self.registration.showNotification(data.title || 'Bison Frame', options)
            );
        } catch (e) {
            // Fallback for plain text
            event.waitUntil(
                self.registration.showNotification('Bison Frame', {
                    body: event.data.text(),
                    icon: '/icon-192x192.png',
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Tjek om vi allerede har en tab åben
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Hvis ikke, åbn et nyt vindue
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
