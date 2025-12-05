/**
 * Service Worker Registration
 * Registers the service worker for offline support
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        registerServiceWorker();
    });
}

async function registerServiceWorker() {
    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
        });

        console.log('✅ Service Worker registered successfully:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🔄 Service Worker update found');

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('📦 New version available');
                    showUpdateNotification();
                }
            });
        });

        // Check for updates every hour
        setInterval(() => {
            registration.update();
        }, 60 * 60 * 1000);

    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
    }
}

function showUpdateNotification() {
    if (window.UXEnhancements && window.UXEnhancements.toast) {
        const toast = window.UXEnhancements.toast.info(
            'New version available! Click to update.',
            0 // Don't auto-dismiss
        );
        
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', () => {
            window.location.reload();
        });
    } else {
        // Fallback if toast system not available
        if (confirm('A new version of Math Master is available. Reload now?')) {
            window.location.reload();
        }
    }
}

// Utility function to clear service worker cache
window.clearServiceWorkerCache = async function() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
            const messageChannel = new MessageChannel();
            
            registration.active.postMessage({
                type: 'CLEAR_CACHE'
            }, [messageChannel.port2]);

            messageChannel.port1.onmessage = (event) => {
                if (event.data.success) {
                    console.log('✅ Service Worker cache cleared');
                    if (window.UXEnhancements && window.UXEnhancements.toast) {
                        window.UXEnhancements.toast.success('Cache cleared successfully!');
                    }
                }
            };
        }
    }
};

console.log('📱 Service Worker registration script loaded');
