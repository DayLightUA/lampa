(function () {
    console.log('💡 Plugin Loaded: Sending formatted logs to Spring Boot API');

    try {
        Lampa.Listener.follow('torrent', function (data) {
            if (data && data.type === 'onenter') {
                try {
                    // Convert to formatted JSON
                    console.log('🧲 Sending Torrent Event Data to API:');
                    const formatted = JSON.stringify(data, null, 2);
                    sendLogToAPI("Event: {0}", [formatted]);
                } catch (jsonErr) {
                    console.error('❌ JSON stringify failed:', jsonErr);
                }
            }
        });

        function base64EncodeUnicode(str) {
            return btoa(unescape(encodeURIComponent(str)));
        }

        // Function to send log data to your Spring Boot API
        function sendLogToAPI(message, args) {
            const apiUrl = 'http://192.168.31.104:9292/log'; // Replace with your API URL
            const base64Args = [];
            for (const arg of args) {
                base64Args.push(base64EncodeUnicode(arg));
            }
            const payload = [{
                timestamp: new Date().toISOString(),
                appName: "lampa",
                pattern: message,
                base64Args: base64Args
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
