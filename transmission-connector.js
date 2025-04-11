(function () {
    const plugin_id = 'transmission-forwarder';
    const storage_key = plugin_id + '_config';

    let sessionId = null;

    function init() {
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === plugin_id) renderSettings();
        });

        Lampa.Settings.add({
            name: plugin_id,
            title: 'Transmission Forwarder',
            component: renderSettings,
            onBack: () => {},
        });

        Lampa.Listener.follow('torrent', (e) => {
            if (e.type === 'open') {
                let magnet = e.data?.file || e.data?.url;
                if (magnet) {
                    const config = getConfig();
                    if (!config.host) {
                        Lampa.Noty.show('Transmission host not configured!');
                        return;
                    }
                    sendToTransmission(magnet, config);
                    e.preventDefault?.();
                }
            }
        });
    }

    function getConfig() {
        return Lampa.Storage.get(storage_key, {
            host: '',
            user: '',
            pass: ''
        });
    }

    function saveConfig(config) {
        Lampa.Storage.set(storage_key, config);
    }

    function renderSettings() {
        const config = getConfig();

        const fields = [
            {
                title: 'Transmission Host (e.g. http://192.168.1.100:9091)',
                value: config.host,
                onChange: (value) => {
                    config.host = value;
                    saveConfig(config);
                }
            },
            {
                title: 'Username (optional)',
                value: config.user,
                onChange: (value) => {
                    config.user = value;
                    saveConfig(config);
                }
            },
            {
                title: 'Password (optional)',
                value: config.pass,
                onChange: (value) => {
                    config.pass = value;
                    saveConfig(config);
                }
            }
        ];

        const container = $('<div class="settings-param selector focusable" style="flex-direction: column; gap: 10px;"></div>');
        fields.forEach((field) => {
            const item = $('<div class="settings-param__value">' + field.title + '</div>');
            const input = $('<input type="text" class="settings-param__input">').val(field.value);
            input.on('input', function () {
                field.onChange(this.value);
            });
            container.append(item, input);
        });

        $('body').append(container);
    }

    function sendToTransmission(magnet, config) {
        function makeRequest() {
            const headers = {
                'Content-Type': 'application/json',
                'X-Transmission-Session-Id': sessionId || ''
            };

            if (config.user && config.pass) {
                headers['Authorization'] = 'Basic ' + btoa(config.user + ':' + config.pass);
            }

            fetch(config.host + '/transmission/rpc', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    method: 'torrent-add',
                    arguments: {
                        filename: magnet
                    }
                })
            }).then(async res => {
                if (res.status === 409) {
                    sessionId = res.headers.get('X-Transmission-Session-Id');
                    makeRequest(); // retry
                } else {
                    const data = await res.json();
                    console.log('Transmission response:', data);
                    Lampa.Noty.show('Torrent sent to Transmission!');
                }
            }).catch(err => {
                console.error('Error:', err);
                Lampa.Noty.show('Failed to send to Transmission');
            });
        }

        makeRequest();
    }

    Lampa.Plugins.add(plugin_id, {
        title: 'Transmission Forwarder',
        version: '1.1',
        description: 'Send torrents to Transmission with settings',
        run: init
    });
})();
