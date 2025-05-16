(function () {
    const plugin_id = 'transmission_forwarder';
    const ELEMENT_HOST = plugin_id + '_host';
    const ELEMENT_USE_AUTH = plugin_id + '_use_auth';
    const ELEMENT_USER = plugin_id + '_user';
    const ELEMENT_PASS = plugin_id + '_pass';
    const ELEMENT_SESSION = plugin_id + '_session';

    function init() {
        // Register the plugin manifest
        Lampa.Manifest.plugins = {
            type: 'settings',
            version: '1.0.0',
            name: 'Transmission Forwarder',
            description: 'Plugin to forward torrents to Transmission',
            component: 'transmission_forwarder'
        };

        // Register settings panel UI
        if (window.appready) {
            addSettingsTransmissionForwarder();
            addTransmissionSettingsParams();
        } else {
            Lampa.Listener.follow('app', async function (e) {
                if (e.type === 'ready') {
                    addSettingsTransmissionForwarder();
                    addTransmissionSettingsParams();
                }
            });
        }

        const oldTorrentStart = Lampa.Torrent.start;
        Lampa.Torrent.start = function (element, movie) {
            onTorrentOpen(element, movie, oldTorrentStart);
        }
    }

    // Torrent event handler
    function onTorrentOpen(element, movie, oldTorrentStart) {
        const link = !element.Link ? element.MagnetUri : element.Link;
        if (!link) return;
        const host = Lampa.Storage.get(ELEMENT_HOST, undefined);
        if (!host) {
            Lampa.Noty.show('Transmission host not configured!');
            return;
        }
        showChoiceTooltip(() => {
            fetchTorrent(link).then((buffer) => {
                    const torrentData = arrayBufferToBase64(buffer); // Convert to base64
                    sendToTransmission(torrentData); // Send to Transmission
                }
            ).catch(
                (error) => {
                    console.error('Error fetching torrent:', error);
                    Lampa.Noty.show('❌ Failed to fetch torrent');
                }
            );
        }, () => {
            oldTorrentStart(element, movie)
        });
    }


    function addSettingsTransmissionForwarder() {
        function createSettingsComponent() {
            Lampa.SettingsApi.addComponent({
                component: plugin_id,
                icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8H9L12 2ZM2 9H22V11H2V9ZM4 13H20V15H4V13ZM6 17H18V19H6V17Z" fill="currentColor"/></svg>',
                name: 'Transmission Forwarder'
            });
        }

        if (!window.lampa_settings[plugin_id]) {
            createSettingsComponent();
        } else {
            createSettingsComponent()
        }
    }

    function addTransmissionSettingsParams() {
        Lampa.Params.trigger(ELEMENT_USE_AUTH, false);
        Lampa.Params.select(ELEMENT_HOST, undefined, '');
        Lampa.Params.select(ELEMENT_USER, undefined, '');
        Lampa.Params.select(ELEMENT_PASS, undefined, '');
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
                name: ELEMENT_HOST,
                type: 'input',
                values: 'text',
                default: 'http://192.168.1.100:9091'
            },
            field: {
                name: 'Transmission Host',
                description: 'Enter the Transmission RPC URL (e.g., http://192.168.1.100:9091)'
            },
            onChange: (value) => {
                Lampa.Storage.set(ELEMENT_HOST, value ? value : '', false);
            },

        });

        Lampa.SettingsApi.addParam({
            component: plugin_id,
            param: {
                name: ELEMENT_USE_AUTH,
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Use Authentication',
                description: 'Enable or disable authentication for Transmission'
            },
            onChange: (value) => {
                Lampa.Storage.set(ELEMENT_USE_AUTH, value ? value : '', false);
                setAuthFieldsVisible(value);
            },
            onRender: (item) => {setAuthFieldsVisible(Lampa.Storage.get(ELEMENT_USE_AUTH, undefined));}
        });

        Lampa.SettingsApi.addParam({
            component: plugin_id,
            param: {
                name: ELEMENT_USER,
                type: 'input',
                values: 'text',
                default: ''
            },
            field: {
                name: 'User name',
                description: 'Enter the username for Transmission authentication'
            },
            onChange: (value) => {
                Lampa.Storage.set(ELEMENT_USER, value ? value : '', false);
            },
            onRender: (item) => {setAuthFieldsVisible(Lampa.Storage.get(ELEMENT_USE_AUTH, undefined));}
        });

        Lampa.SettingsApi.addParam({
            component: plugin_id,
            param: {
                name: ELEMENT_PASS,
                type: 'input',
                values: 'password',
                default: ''
            },
            field: {
                name: 'Password',
                description: 'Enter the password for Transmission authentication'
            },
            onChange: (value) => {
                Lampa.Storage.set(ELEMENT_PASS, value ? value : '', false);
            },
            onRender: (item) => {setAuthFieldsVisible(Lampa.Storage.get(ELEMENT_USE_AUTH, undefined));}
        });
    }

    function setAuthFieldsVisible(visible) {
        setTimeout(() => {
            const usernameField = $(`div[data-name="${ELEMENT_USER}"]`);
            const passwordField = $(`div[data-name="${ELEMENT_PASS}"]`);

            if (usernameField === undefined || passwordField === undefined || usernameField.length === 0 || passwordField.length === 0) {
                return;
            }

            if (`${visible}` === 'true') {
                usernameField.show();
                passwordField.show();
            } else {
                usernameField.hide();
                passwordField.hide();
            }
        }, 100); // Delay by 100ms to allow DOM rendering
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

    function sendToTransmission(base64Torrent) {
        function makeRequest() {
            const headers = {
                'Content-Type': 'application/json',
                'X-Transmission-Session-Id': Lampa.Storage.get(ELEMENT_SESSION, undefined) || ''
            };
            const host = Lampa.Storage.get(ELEMENT_HOST, undefined);
            const useAuth = Lampa.Storage.get(ELEMENT_USE_AUTH, undefined) === 'true';
            const user = Lampa.Storage.get(ELEMENT_USER, undefined);
            const pass = Lampa.Storage.get(ELEMENT_PASS, undefined);

            if (useAuth && user && pass) {
                headers['Authorization'] = 'Basic ' + btoa(user + ':' + pass);
            }

            const body = {
                method: 'torrent-add',
                arguments: {
                    'download-dir': '/downloads/',
                    metainfo: base64Torrent,
                    paused: false
                }
            };

            fetch(host + '/transmission/rpc', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            }).then(async res => {
                if (res.status === 409) {
                    Lampa.Storage.set(ELEMENT_SESSION, res.headers.get('X-Transmission-Session-Id'), false)
                    makeRequest(); // retry
                } else {
                    const data = await res.json();
                    if (data.result === 'success') {
                        Lampa.Noty.show('✅ Sent to Transmission!');
                    } else {
                        Lampa.Noty.show('⚠️ Transmission error: ' + data.result);
                    }
                }
            }).catch(err => {
                console.error('Transmission send failed:', err);
                Lampa.Noty.show('❌ Failed to send to Transmission');
            });
        }

        makeRequest();
    }

    function showChoiceTooltip(onTransmissionSelected, onDefaultSelected) {
        Lampa.Select.show({
            title: 'Choose torrent handler',
            items: [
                {title: 'Use Transmission', confirm: true},
                {title: 'Use TorrServe'}
            ],
            onSelect: (a) => {
                if (a.confirm) {
                    onTransmissionSelected()
                } else {
                    onDefaultSelected()
                }
            },
        });
    }

    init(); // run immediately
})();