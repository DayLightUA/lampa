(function(){
    console.log('💡 Plugin Loaded: Sending formatted logs to Spring Boot API');

    try {
        Lampa.Listener.follow('torrent', function(data){
            if (data && data.type === 'onenter') {
                try {
                    // Convert to formatted JSON
                    console.log('🧲 Sending Torrent Event Data to API:');
                    const formatted = JSON.stringify(data, null, 2);
                    sendLogToAPI(formatted);
                } catch (jsonErr) {
                    console.error('❌ JSON stringify failed:', jsonErr);
                }
            }
        });

        // Function to send log data to your Spring Boot API
        function sendLogToAPI(logLine) {
            const apiUrl = 'http://192.168.31.104:9292/log'; // Replace with your API URL
            const payload = [{
                timestamp: new Date().toISOString(),
                appName: "lampa",
                msg: logLine
            }];

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => console.log('✅ Log sent to Spring Boot API:', data))
            .catch(err => console.error('❌ Failed to send log to API:', err));
        }
    } catch (err) {
        console.error('❌ Plugin Error:', err);
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show('❌ Error: ' + err.message);
        }
    }
})();
