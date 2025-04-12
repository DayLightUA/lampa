(function(){
    Lampa.Plugins.add('hello-test',{
        title: 'Hello Test Plugin',
        version: '1.0',
        description: 'Just a test',
        run: function(){
            Lampa.Noty.show('Hello from plugin!');
        }
    });
})();