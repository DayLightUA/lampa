(function(){
    console.log('🔎 Plugin Loaded: Watching ALL events');

    try {
        const events = [
            'app', 'select', 'play', 'start', 'stop',
            'navigation', 'activity', 'parser', 'search',
            'view', 'back', 'open', 'torrent', 'video'
        ];

        events.forEach(evt => {
            Lampa.Listener.follow(evt, function(data){
                console.log(`📡 Event: "${evt}"`, data);
                if (data && data.title) {
                    Lampa.Noty.show(`📡 ${evt}: ${data.title}`);
                } else if (data && data.url) {
                    Lampa.Noty.show(`📡 ${evt}: ${data.url}`);
                }
            });
        });
    } catch (err) {
        console.error('❌ Plugin Error:', err);
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show('❌ Error: ' + err.message);
        }
    }
})();
