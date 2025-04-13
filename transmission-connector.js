// Top-level logging function
function sendLogToAPI(message, args = []) {
    const apiUrl = 'http://192.168.31.104:9292/log'; // Replace with your API URL
    const payload = {
        timestamp: new Date().toISOString(),
        appName: "lampa",
        pattern: message,
        base64Args: args.map(arg => base64EncodeUnicode(arg))
    };

    fetch(apiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => console.log('✅ Log sent to API:', data))
    .catch(err => console.error('❌ Failed to log to API:', err));
}

function base64EncodeUnicode(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return '';
    }
}


// Self executing function to encapsulate the plugin logic
try {
(function () {
    const plugin_id = 'transmission-forwarder';
    const storage_key = plugin_id + '_config';
    let sessionId = null;

    function init() {
        // Register settings panel UI
        Lampa.Settings.listener.follow('open', function (event) {
            if (event.name === plugin_id) renderSettings();
        });

        // Add plugin entry to settings list
        Lampa.SettingsApi.add({
            component: plugin_id,
            name: plugin_id,
            type: 'card',
            title: 'Transmission Forwarder',
            subtitle: 'Choose between TorrServe or Transmission with config support'
        });

        // Handle torrent event
        Lampa.Listener.follow('torrent', onTorrentOpen);
    }

    // Torrent event handler
    function onTorrentOpen(event) {
        if (event.type === 'open') {
            const link = event.data?.file || event.data?.url || event.data?.link;
            if (!link) return;

            const config = getConfig();
            if (!config.host) {
                Lampa.Noty.show('Transmission host not configured!');
                return;
            }

            showChoiceTooltip(() => {
                sendToTransmission(link, config);
                event.preventDefault?.();
            });
        }
    }


    function getConfig() {
        return Lampa.Storage.get(storage_key, {
            host: '',
            use_auth: false,
            user: '',
            pass: ''
        });
    }

    function saveConfig(config) {
        Lampa.Storage.set(storage_key, config);
    }

    function renderSettings() {
        const config = getConfig();
        const container = $('<div class="settings-param" style="flex-direction: column; gap: 15px;"></div>');

        const createInput = (label, value, onChange) => {
            const wrapper = $('<div></div>');
            const title = $(`<div class="settings-param__name">${label}</div>`);
            const input = $('<input type="text" class="settings-param__input">').val(value);
            input.on('input', function () {
                onChange(this.value);
            });
            wrapper.append(title, input);
            return wrapper;
        };

        const hostInput = createInput('Transmission Host (e.g. http://192.168.1.100:9091)', config.host, (val) => {
            config.host = val;
            saveConfig(config);
        });

        const authCheckbox = $(`
            <div class="settings-param selector">
                <div class="settings-param__name">Use Authentication</div>
                <div class="settings-param__value">${config.use_auth ? '✔' : '✖'}</div>
            </div>
        `);

        authCheckbox.on('hover:enter', function () {
            config.use_auth = !config.use_auth;
            saveConfig(config);
            $(this).find('.settings-param__value').text(config.use_auth ? '✔' : '✖');
            renderSettings();
        });

        container.append(hostInput, authCheckbox);

        if (config.use_auth) {
            const userInput = createInput('Username', config.user, (val) => {
                config.user = val;
                saveConfig(config);
            });

            const passInput = createInput('Password', config.pass, (val) => {
                config.pass = val;
                saveConfig(config);
            });

            container.append(userInput, passInput);
        }

        $('body').append(container);
    }

    async function fetchTorrent(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch torrent: ${response.statusText}`);
        }
        return await response.arrayBuffer();
    }

    function arrayBufferToBase64(buffer) {
        const binary = String.fromCharCode(...new Uint8Array(buffer));
        return btoa(binary);
    }

    function sendToTransmission(base64Torrent, config) {
        function makeRequest() {
            const headers = {
                'Content-Type': 'application/json',
                'X-Transmission-Session-Id': sessionId || ''
            };

            if (config.use_auth && config.user && config.pass) {
                headers['Authorization'] = 'Basic ' + btoa(config.user + ':' + config.pass);
            }

            const body = {
                method: 'torrent-add',
                arguments: {
                    'download-dir': '/downloads/',
                    metainfo: base64Torrent,
                    paused: false
                }
            };

            fetch(config.host + '/transmission/rpc', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            }).then(async res => {
                if (res.status === 409) {
                    sessionId = res.headers.get('X-Transmission-Session-Id');
                    makeRequest(); // retry
                } else {
                    const data = await res.json();
                    sendLogToAPI('📤 Transmission response: {0}', [JSON.stringify(data)]);
                    if (data.result === 'success') {
                        Lampa.Noty.show('✅ Sent to Transmission!');
                    } else {
                        Lampa.Noty.show('⚠️ Transmission error: ' + data.result);
                    }
                }
            }).catch(err => {
                sendLogToAPI('❌ Transmission send failed: {0}', [err.message]);
                console.error('Transmission send failed:', err);
                Lampa.Noty.show('❌ Failed to send to Transmission');
            });
        }

        makeRequest();
    }

    function showChoiceTooltip(onTransmissionSelected) {
        sendLogToAPI('🧲 Showing choice tooltip for torrent handler', []);
        Lampa.Select.show({
            title: 'Choose torrent handler',
            items: [
                { title: 'Use Transmission', handler: onTransmissionSelected },
                { title: 'Use TorrServe', handler: () => {} }
            ],
            noBalance: true
        });
    }

    // --- Remote Logging ---
    function base64EncodeUnicode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    
    function sendLogToAPI(message, args = []) {
        const apiUrl = 'http://192.168.31.104:9292/log'; // Replace with your API URL
    
        const payload = {
            timestamp: new Date().toISOString(),
            appName: "lampa",
            pattern: message,
            base64Args: args.map(arg => base64EncodeUnicode(arg))
        };
    
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

    init(); // run immediately
})();
} catch (err) {
    console.error('❌ Plugin Error:', err);
    sendLogToAPI('❌ Plugin Error: {0}', [err.message]);
    if (typeof Lampa !== 'undefined' && Lampa.Noty) {
        Lampa.Noty.show('❌ Error: ' + err.message);
    }
}