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
        let sessionId = null;

        function init() {
            // Register settings panel UI
            if (window.appready) addSettingsTransmissionForwarder();
            else {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready'){
                        sendLogToAPI('App ready event received, addSettingsTransmissionForwarder', []);
                        addSettingsTransmissionForwarder();
                    }
                });
            }

            // Just to init the settings panel
            const config = getConfig();
            config.use_auth = false;
            sendLogToAPI('Config loaded: {0}', [JSON.stringify(config)]);
            saveConfig(config);

            Lampa.Settings.listener.follow('open', (e) => {
                console.log('Settings tab opened:', e.name); // Debug log
                sendLogToAPI('Settings tab opened: {0}', [e.name]);
                renderSettings(e);
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
                    const torrentData = arrayBufferToBase64(fetchTorrent(link));
                    sendToTransmission(torrentData, config);
                    event.preventDefault?.();
                });
            }
        }


        function getConfig() {
            return {
                host: Lampa.Storage.get(storage_key + "_host", ''),
                use_auth: Lampa.Storage.get(storage_key + "_use_auth", false),
                user: Lampa.Storage.get(storage_key + "_user", ''),
                pass: Lampa.Storage.get(storage_key + "_pass", '')
            };
        }

        function saveConfig(config) {
            Lampa.Storage.set(storage_key + "_host", config.host);
            Lampa.Storage.set(storage_key + "_use_auth", config.use_auth);
            Lampa.Storage.set(storage_key + "_user", config.user);
            Lampa.Storage.set(storage_key + "_pass", config.pass);
        }

        function addSettingsTransmissionForwarder() {
            if (Lampa.Settings.main && Lampa.Settings.main() && !Lampa.Settings.main().render().find('[data-component="transmission_forwarder"]').length) {
                sendLogToAPI('Translate field', []);
                const field = $(Lampa.Lang.translate(`
                    <div class="settings-folder selector" data-component="transmission_forwarder">
                        <div class="settings-folder__icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L15 8H9L12 2ZM2 9H22V11H2V9ZM4 13H20V15H4V13ZM6 17H18V19H6V17Z" fill="white"/>
                            </svg>
                        </div>
                        <div class="settings-folder__name">Transmission Forwarder</div>
                    </div>
                `));

                sendLogToAPI('Render field', []);
                Lampa.Settings.main().render().find('[data-component="more"]').after(field);
                sendLogToAPI('Update field', []);
                Lampa.Settings.main().update();
            }
        }


        function renderSettings(e) {
            if (e.name !== undefined && e.name.includes(plugin_id)){
                sendLogToAPI('Received event: {0}', [e.name]);
            }
            if (e.name !== plugin_id) return;

            sendLogToAPI('Try render settings', []);

            const config = getConfig();

            const renderTarget = e.body;
            sendLogToAPI('renderTarget: {0}', [renderTarget]);
            const template = Lampa.Template.get('settings_transmission_forwarder', {});
            sendLogToAPI('template: {0}', [template]);
            renderTarget.html(template);

            const hostInput = renderTarget.find(`[data-name="${storage_key}_host"]`);
            const authToggle = renderTarget.find(`[data-name="${storage_key}_use_auth"]`);
            const userInput = renderTarget.find(`[data-name="${storage_key}_user"]`);
            const passInput = renderTarget.find(`[data-name="${storage_key}_pass"]`);

            // Initialize inputs with current config values
            hostInput.text(config.host);
            authToggle.find('.settings-param__value').text(config.use_auth ? '✔' : '✖');
            if (config.use_auth) {
                userInput.show().find('.settings-param__input').text(config.user);
                passInput.show().find('.settings-param__input').text(config.pass);
            }

            // Add event listeners for inputs
            hostInput.on('hover:enter', () => {
                Lampa.Utils.input('Transmission Host', config.host, (newVal) => {
                    config.host = newVal;
                    saveConfig(config);
                    hostInput.text(newVal);
                });
            });

            authToggle.on('hover:enter', () => {
                config.use_auth = !config.use_auth;
                saveConfig(config);
                authToggle.find('.settings-param__value').text(config.use_auth ? '✔' : '✖');
                if (config.use_auth) {
                    userInput.show();
                    passInput.show();
                } else {
                    userInput.hide();
                    passInput.hide();
                }
            });

            userInput.on('hover:enter', () => {
                Lampa.Utils.input('Username', config.user, (newVal) => {
                    config.user = newVal;
                    saveConfig(config);
                    userInput.find('.settings-param__input').text(newVal);
                });
            });

            passInput.on('hover:enter', () => {
                Lampa.Utils.input('Password', config.pass, (newVal) => {
                    config.pass = newVal;
                    saveConfig(config);
                    passInput.find('.settings-param__input').text(newVal);
                });
            });
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
                    { title: 'Use TorrServe', handler: () => { } }
                ],
                noBalance: true
            });
        }

        const settingsTemplate =
        `    <div class="settings-screen">
                <div class="settings-header">
                    <div class="settings-header__title">Transmission Forwarder</div>
                </div>
                <div class="settings-body">
                    <div class="settings-param">
                        <div class="settings-param__name">Transmission Host (e.g. http://192.168.1.100:9091)</div>
                        <div class="settings-param__input" data-name="${storage_key}_host"></div>
                    </div>
                    <div class="settings-param selector" data-name="${storage_key}_use_auth">
                        <div class="settings-param__name">Use Authentication</div>
                        <div class="settings-param__value"></div>
                    </div>
                    <div class="settings-param" data-name="${storage_key}_user" style="display: none;">
                        <div class="settings-param__name">Username</div>
                        <div class="settings-param__input"></div>
                    </div>
                    <div class="settings-param" data-name="${storage_key}_pass" style="display: none;">
                        <div class="settings-param__name">Password</div>
                        <div class="settings-param__input"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Register the template with Lampa
        Lampa.Template.add('settings_transmission_forwarder', settingsTemplate);
        sendLogToAPI('settings_transmission_forwarder template registered', []);
        init(); // run immediately
    })();
} catch (err) {
    console.error('❌ Plugin Error:', err);
    sendLogToAPI('❌ Plugin Error: {0}', [err.message]);
    if (typeof Lampa !== 'undefined' && Lampa.Noty) {
        Lampa.Noty.show('❌ Error: ' + err.message);
    }
}