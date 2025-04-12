(function(){
    console.log('💡 Plugin Loaded: Pretty print "torrent" event on onenter');

    try {
        Lampa.Listener.follow('torrent', function(data){
            if (data && data.type === 'onenter') {
                try {
                    const formatted = JSON.stringify(data, null, 2); // 2-space indentation
                    console.log('🧲 Torrent Event Data (formatted):');

                    // Log each line separately
                    formatted.split('\n').forEach(line => console.log(line));
                } catch (jsonErr) {
                    console.error('❌ JSON stringify failed:', jsonErr);
                }
            }
        });
    } catch (err) {
        console.error('❌ Plugin Error:', err);
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show('❌ Error: ' + err.message);
        }
    }
})();
