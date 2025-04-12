(function(){
    console.log('💡 Plugin Loaded: Watching for select events');

    try {
        Lampa.Listener.follow('select', function(e){
            console.log('📥 Select Event:', e);

            if (e && e.url) {
                // Show a notification popup
                Lampa.Noty.show('🎬 Selected: ' + (e.title || e.url));

                // Optional: You can now send this to Transmission
                // We'll handle this in next steps
            }
        });
    } catch (err) {
        console.error('❌ Plugin Error:', err);
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show('❌ Error: ' + err.message);
        }
    }
})();
