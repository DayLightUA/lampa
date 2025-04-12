(function(){
    console.log('💡 Plugin Loaded: Watching "torrent" event');

    try {
        Lampa.Listener.follow('torrent', function(data){
            console.log('🧲 Torrent Event Triggered:', data);

            if (data && data.file) {
                Lampa.Noty.show('🧲 Torrent file: ' + data.file);
            } else {
                Lampa.Noty.show('🧲 Torrent event triggered');
            }
        });
    } catch (err) {
        console.error('❌ Plugin Error:', err);
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show('❌ Error: ' + err.message);
        }
    }
})();
