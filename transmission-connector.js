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
        if (window.appready) addSettingsTransmissionForwarder();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addSettingsTransmissionForwarder();
            });
        }

        Lampa.Settings.listener.follow('open', renderSettings);

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
                const torrentData = fetchTorrent(link);
                sendToTransmission(torrentData, config);
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

    function addSettingsTransmissionForwarder() {
        if (Lampa.Settings.main && Lampa.Settings.main() && !Lampa.Settings.main().render().find('[data-component="' + plugin_id + '"]').length) {
            const field = $(Lampa.Lang.translate(`
                <div class="settings-folder selector" data-component="${plugin_id}">
                    <div class="settings-folder__icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L15 8H9L12 2ZM2 9H22V11H2V9ZM4 13H20V15H4V13ZM6 17H18V19H6V17Z" fill="white"/></svg>
                    </div>
                    <div class="settings-folder__name">Transmission Forwarder</div>
                </div>
            `));

            Lampa.Settings.main().render().find('[data-component="more"]').after(field);
            Lampa.Settings.main().update();
        }
    }

    function renderSettings(e) {
        if (e.name !== plugin_id) return;

        const config = getConfig();

        const createInput = (label, value, onChange) => {
            const inputWrapper = $(`
                <div class="settings-param">
                    <div class="settings-param__name">${label}</div>
                    <div class="settings-param__input">${value}</div>
                </div>
            `);

            inputWrapper.on('hover:enter', () => {
                Lampa.Utils.input(label, value, (newVal) => {
                    onChange(newVal);
                    inputWrapper.find('.settings-param__input').text(newVal);
                });
            });

            return inputWrapper;
        };

        const hostInput = createInput('Transmission Host (e.g. http://192.168.1.100:9091)', config.host, (val) => {
            config.host = val;
            saveConfig(config);
        });

        const authToggle = $(`
            <div class="settings-param selector" data-name="${plugin_id}_auth_toggle">
                <div class="settings-param__name">Use Authentication</div>
                <div class="settings-param__value">${config.use_auth ? '✔' : '✖'}</div>
            </div>
        `);

        authToggle.on('hover:enter', () => {
            config.use_auth = !config.use_auth;
            saveConfig(config);
            authToggle.find('.settings-param__value').text(config.use_auth ? '✔' : '✖');
            Lampa.Settings.update(); // trigger re-render
        });

        const userInput = createInput('Username', config.user, (val) => {
            config.user = val;
            saveConfig(config);
        });

        const passInput = createInput('Password', config.pass, (val) => {
            config.pass = val;
            saveConfig(config);
        });

        const renderTarget = e.body;

        renderTarget.append(hostInput);
        renderTarget.append(authToggle);

        if (config.use_auth) {
            renderTarget.append(userInput);
            renderTarget.append(passInput);
        }
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