(function(){
    console.log('💡 Test Plugin Loaded');

    // Hook into LAMPA 'select' event
    Lampa.Listener.follow('select', function(e){
        console.log('🔄 Select event triggered!', e);
        Lampa.Noty.show('✅ Select event triggered!');
    });
})();
