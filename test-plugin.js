(function(){
    console.log('💡 Test Plugin Loaded');

    // Hook into LAMPA 'select' event
    Lampa.Listener.follow('app', function(e){
        console.log('🚀 LAMPA App Ready', e);
        Lampa.Noty.show('🚀 LAMPA App Ready!');
    });
})();
