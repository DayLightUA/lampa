(function(){
    console.log('💡 Test Plugin Loaded');

    try {
        Lampa.Listener.follow('app', function(e){
            console.log('🚀 App event triggered', e);
            Lampa.Noty.show('🚀 LAMPA App Ready!');
        });
    } catch (err) {
        console.error('❌ Plugin runtime error:', err);
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show('❌ Plugin error: ' + err.message);
        }
    }
})();
