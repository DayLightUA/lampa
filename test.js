(function(){
    console.log('💡 Plugin test.js loaded!');

    Lampa.Plugins.add('hello-test',{
        title: 'Hello Test Plugin',
        version: '1.0',
        description: 'Just a test plugin',
        run: function(){
            console.log('🚀 Running hello-test plugin!');
            try {
                Lampa.Noty.show('Hello from Test Plugin!');
            } catch (e) {
                console.error('❌ Error in plugin:', e);
            }
        }
    });
})();