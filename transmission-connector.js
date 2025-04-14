// Top-level logging function
function sendLogToAPI(message, args = []) {
    const apiUrl = 'http://192.168.31.104:9292/log'; // Replace with your API URL
    try {
        args = args.map(arg => base64EncodeUnicode(arg));
    } catch (e) {
        console.error('❌ Failed to encode arguments:', e);
        sendLogToAPI('❌ Failed to encode arguments: {0}', [e.message]);
        args = [];
    }

    const payload = {
        timestamp: new Date().toISOString(),
        appName: "lampa",
        pattern: message,
        base64Args: args
    };

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => console.log('✅ Log sent to API:', data))
        .catch(err => console.error('❌ Failed to log to API:', err.getMessage()));
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
        const plugin_id = 'transmission_forwarder';
        const storage_key = plugin_id + '_config';
        const CONFIG_KEY_HOST = storage_key + '_host';
        const CONFIG_KEY_USE_AUTH = storage_key + '_use_auth';
        const CONFIG_KEY_USER = storage_key + '_user';
        const CONFIG_KEY_PASS = storage_key + '_pass';
        const CONFIG_KEY_TRANSMISSION_SESSION = storage_key + '_transmission_session';

        function init() {
            const manifest = {
                type: 'settings',
                version: '1.0.0',
                name: 'Transmission Forwarder',
                description: 'Plugin to forward torrents to Transmission',
                component: 'transmission_forwarder'
            };

            // Register the plugin manifest
            Lampa.Manifest.plugins = manifest;

            // Init plugin configuration
            const config = getConfig();
            config.use_auth = false;
            sendLogToAPI('Config loaded: {0}', [JSON.stringify(config)]);
            saveConfig(config);

            // Register settings panel UI
            if (window.appready) {
                addSettingsTransmissionForwarder();
                addTransmissionSettingsParams();
            } else {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') {
                        sendLogToAPI('App ready event received, addSettingsTransmissionForwarder', []);
                        addSettingsTransmissionForwarder();
                        addTransmissionSettingsParams();
                    }
                });
            }

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
                    const torrentData = arrayBufferToBase64(fetchTorrent(link));
                    sendToTransmission(torrentData, config);
                    event.preventDefault?.();
                });
            }
        }


        function getConfig() {
            return {
                host: Lampa.Storage.get(CONFIG_KEY_HOST, ''),
                use_auth: Lampa.Storage.get(CONFIG_KEY_USE_AUTH, false),
                user: Lampa.Storage.get(CONFIG_KEY_USER, ''),
                pass: Lampa.Storage.get(CONFIG_KEY_PASS, ''),
                sessionId: Lampa.Storage.get(CONFIG_KEY_TRANSMISSION_SESSION, '')
            };
        }

        function saveConfig(config) {
            Lampa.Storage.set(CONFIG_KEY_HOST, config.host);
            Lampa.Storage.set(CONFIG_KEY_USE_AUTH, config.use_auth);
            Lampa.Storage.set(CONFIG_KEY_USER, config.user);
            Lampa.Storage.set(CONFIG_KEY_PASS, config.pass);
            Lampa.Storage.set(CONFIG_KEY_TRANSMISSION_SESSION, config.sessionId);
        }

        function addSettingsTransmissionForwarder() {
            sendLogToAPI('Adding settings component for Transmission Forwarder', []);
            if (!window.lampa_settings[plugin_id]) {
                sendLogToAPI('Create settings component {0}', [plugin_id]);
                Lampa.SettingsApi.addComponent({
                    component: plugin_id,
                    icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8H9L12 2ZM2 9H22V11H2V9ZM4 13H20V15H4V13ZM6 17H18V19H6V17Z" fill="currentColor"/></svg>',
                    name: 'Transmission Forwarder'
                });
            }
        }

        function addTransmissionSettingsParams() {
            sendLogToAPI('Adding settings parameters for Transmission Forwarder', []);
            Lampa.SettingsApi.addParam({
                component: plugin_id,
                param: {
                    type: 'title'
                },
                field: {
                    name: 'Transmission Settings'
                }
            });

            Lampa.SettingsApi.addParam({
                component: plugin_id,
                param: {
                    name: CONFIG_KEY_HOST,
                    type: 'input',
                    default: ''
                },
                field: {
                    name: 'Transmission Host',
                    description: 'Enter the Transmission RPC URL (e.g., http://192.168.1.100:9091)'
                },
                onChange: (value) => {
                    Lampa.Storage.set(CONFIG_KEY_HOST, value);
                }
            });

            Lampa.SettingsApi.addParam({
                component: plugin_id,
                param: {
                    name: CONFIG_KEY_USE_AUTH,
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Use Authentication',
                    description: 'Enable or disable authentication for Transmission'
                },
                onChange: (value) => {
                    Lampa.Storage.set(CONFIG_KEY_USE_AUTH, value);
                    setAuthFieldsVisible(value);
                    sendLogToAPI('Authentication setting changed: {0}', [value]);
                }
            });

            Lampa.SettingsApi.addParam({
                component: plugin_id,
                param: {
                    name: CONFIG_KEY_USER,
                    type: 'input',
                    default: ''
                },
                field: {
                    name: 'Username',
                    description: 'Enter the username for Transmission authentication'
                },
                onChange: (value) => {
                    Lampa.Storage.set(CONFIG_KEY_USER, value);
                }
            });

            Lampa.SettingsApi.addParam({
                component: plugin_id,
                param: {
                    name: CONFIG_KEY_PASS,
                    type: 'input',
                    default: ''
                },
                field: {
                    name: 'Password',
                    description: 'Enter the password for Transmission authentication'
                },
                onChange: (value) => {
                    Lampa.Storage.get(CONFIG_KEY_PASS, value);
                }
            });
            setAuthFieldsVisible(Lampa.Storage.get(CONFIG_KEY_USE_AUTH, false));
        }

        function setAuthFieldsVisible(visible) {
            const usernameField = $(`div[data-name="${CONFIG_KEY_USER}"]`);
            const passwordField = $(`div[data-name="${CONFIG_KEY_PASS}"]`);
            sendLogToAPI('usernameField: {0}', [JSON.stringify(usernameField)]);
            sendLogToAPI('passwordField: {0}', [JSON.stringify(passwordField)]);

            if (visible) {
                usernameField.show();
                passwordField.show();
            } else {
                usernameField.hide();
                passwordField.hide();
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
                    'X-Transmission-Session-Id': config.sessionId || ''
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
                        config.sessionId = res.headers.get('X-Transmission-Session-Id');
                        saveConfig(config);
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
                    { title: 'Use TorrServe', handler: () => { } }
                ],
                noBalance: true
            });
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