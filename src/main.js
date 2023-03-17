var config = require('./config.js');
var utils = require('./utils.js');

function supportLanguages() {
    return config.supportedLanguages.map(([standardLang]) => standardLang);
}

function tts(query, completion) {
    (async () => {
        const targetLanguage = utils.langMap.get(query.lang);
        if (!targetLanguage) {
            const err = new Error();
            Object.assign(err, {
                _type: 'unsupportLanguage',
                _message: '不支持该语种',
            });
            throw err;
        }
        const originText = '[' + targetLanguage + ']' + query.text + '[' + targetLanguage + ']'
        let base64Result = ''
        try {
            $log.error(originText)
            const speaker = $option.speaker;

            const socket = $websocket.new({
                url: "wss://skytnt-moe-tts.hf.space/queue/join",
                allowSelfSignedSSLCertificates: true,
                timeoutInterval: 100
            })
            socket.open()
            socket.listenReceiveString(function (socket, string) {
                $log.error(`did receive string: ${string}`);
                if (JSON.parse(string).msg == 'send_hash') {
                    socket.sendString('{"session_hash":"ivnr592j25","fn_index":1}');
                } else if (JSON.parse(string).msg == 'send_data') {
                    let s = '{"fn_index":45,"data":["' + originText + '","' + speaker + '",1,false],"session_hash":"ivnr592j25"}';
                    console.error(s)
                    socket.sendString(s);
                } else if (JSON.parse(string).msg == 'process_completed') {
                    $log.error('***********Client received a message==>' + JSON.parse(string).output.data[1])
                    base64Result = JSON.parse(string).output.data[1].split('base64,')[1]
                    // socket.close()
                    completion({
                        result: {
                            "type": "base64",
                            "value": base64Result,
                            "raw": {}
                        },
                    });
                }
            })
        } catch (e) {
            $log.error(e)
        }

    })().catch((err) => {
        completion({
            error: {
                type: err._type || 'unknown',
                message: err._message || '未知错误',
                addtion: err._addtion,
            },
        });
    });
}

exports.supportLanguages = supportLanguages;
exports.tts = tts;
