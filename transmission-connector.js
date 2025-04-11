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

                    showChoiceTooltip(() => {
                        sendToTransmission(magnet, config);
                        e.preventDefault?.(); // block TorrServe
                    });
                }
            }
        });
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
            renderSettings(); // refresh to show/hide fields
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

    function sendToTransmission(magnet, config) {
        function makeRequest() {
            const headers = {
                'Content-Type': 'application/json',
                'X-Transmission-Session-Id': sessionId || ''
            };

            if (config.use_auth && config.user && config.pass) {
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
                    Lampa.Noty.show('Sent to Transmission!');
                }
            }).catch(err => {
                console.error('Error:', err);
                Lampa.Noty.show('Failed to send to Transmission');
            });
        }

        makeRequest();
    }

    function showChoiceTooltip(onTransmissionSelected) {
        Lampa.Select.show({
            title: 'Choose torrent handler',
            items: [
                { title: 'Use Transmission', handler: onTransmissionSelected },
                { title: 'Use TorrServe', handler: () => {} }
            ],
            noBalance: true
        });
    }

    Lampa.Plugins.add(plugin_id, {
        title: 'Transmission Forwarder',
        version: '1.2',
        description: 'Choose between TorrServe or Transmission with config support',
        run: init
    });
})();
