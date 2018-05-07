const Express = require('express');
const { Client } = require('pg')
const Linebot = require('linebot');//Line Bot API
const request = require('request');
const SqlManager = require('./sql_manager');


//Create linebot parser
var bot = Linebot({
    channelId: process.env.CHANNEL_ID,
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

var ngrokUrl = '';
var homeIotConfig = {};

bot.on('message', function (event) {
    if (ngrokUrl.length>0) {
        var options = {
            url: ngrokUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({'data': event.message.text})
            // body: JSON.stringify({'data': encodeURIComponent(event.message.text)})
        };
        request(options, (reqErr, reqRes, body) => {
            var replyStr = '';
            if (!reqErr && reqRes.statusCode == 200) {
                console.log(body);
                replyStr = body;
            } else if (reqErr) {
                console.log('Error. Request ngrok_url error.\n' + reqErr.stack);
                replyStr = 'Request ngrok_url error.';
            } else {
                console.log('Request ngrok_url with error code:' + reqRes.statusCode);
                replyStr = 'Request ngrok_url with error code: ' + reqRes.statusCode;
            }
            event.reply(decodeURIComponent(replyStr))
                .catch(function (err) {
                    // Line event send error
                    console.log('Error.\n' + err.stack);
                });
        });
    } else {
        console.log('Error.\n' + sqlErr.stack);
        event.reply('No ngrok_url in database.')
            .catch((err) => {
                // Line event send error
                console.log('Error.\n' + err.stack);
            });
    }

    // event.reply(event.message.text)
    //     .then(function (data) {
    //         // success
    //     }).catch(function (error) {
    //         // error
    //     });
});

const linebotParser = bot.parser();

//Express init.
const app = Express();

app.post('/ngrok/url', (req, res) => {
    let bodyStr = '';
    req.on('data', chunk => {
        console.log('data received: ' + chunk.toString());
        bodyStr += chunk.toString();
    });
    req.on('end', ()=>{
        var bodyJsonObj = JSON.parse(bodyStr);
        var options = {
            url: bodyJsonObj.data,
            method: 'GET',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }
        };
        console.log(options);
        request(options, (reqErr, reqRes, body) => {
            if (!reqErr && reqRes.statusCode == 200) {
                console.log(body);
                sqlManager.insertSetting({ key: 'ngrok_url', value: options.url }, (sqlErr, sqlRes) => {
                    if (!sqlErr) {
                        console.log('Success insert ngrok_url.\n' + JSON.stringify(sqlRes));
                        res.send('Success');
                        ngrokUrl = options.url;
                    } else {
                        console.log('Error insert ngrok_url.\n' + sqlErr.stack);
                    }
                });
                sqlManager.insertSetting({ key: 'home_iot', value: body }, (sqlErr, sqlRes) => {
                    if (!sqlErr) {
                        console.log('Success insert home_iot.\n' + JSON.stringify(sqlRes));
                        homeIotConfig = JSON.parse(body);
                    } else {
                        console.log('Error insert home_iot.\n' + sqlErr.stack);
                    }
                });
            } else if (reqErr) {
                console.log('Error.\n' + reqErr.stack);
                res.send('Error');
            } else {
                console.log('Fail with error code: ' + reqRes.statusCode);
                res.send('Fail with error code: ' + reqRes.statusCode);
            }
        });
    });
});

app.get('/sql/settings/:setting_key', (req, res) => {
    sqlManager.getSetting(req.params.setting_key, (err, sqlRes) => {
        if (err) {
            console.log('Error.\n' + err.stack);
        } else {
            console.log('Success.\n' + JSON.stringify(sqlRes));
            res.send(sqlRes);
        }
    });
});

app.post('/', linebotParser);

const connectSqlAsyncRun = async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, });
    await client.connect();
    //Init sql manager
    sqlManager = new SqlManager(client);
    return sqlManager;
}

connectSqlAsyncRun().then((sqlManager) => {
    console.log('SQL connect success. App start.');
    var server = app.listen(process.env.PORT || 8080, () => {
        var port = server.address().port;
        console.log("App now running on port", port);

        sqlManager.createTables((err, res) => {
            if (err) {
                console.log('Create table error.\n' + err.stack);
            } else {
                if (res == true) {
                    console.log('Table exists');
                    sqlManager.getSetting('ngrok_url', (err, sqlRes) => {
                        if (!err) {
                            console.log('Success.\n' + JSON.stringify(sqlRes));
                            if (sqlRes.rows[0]) ngrokUrl = sqlRes.rows[0].value;
                            console.log(ngrokUrl);
                        } else {
                            console.log('Error.\n' + err.stack);
                        }
                    });
                    sqlManager.getSetting('home_iot', (err, sqlRes) => {
                        if (!err) {
                            console.log('Success.\n' + JSON.stringify(sqlRes));
                            if (sqlRes.rows[0]) homeIotConfig = JSON.parse(sqlRes.rows[0].value);
                            console.log(homeIotConfig);
                        } else {
                            console.log('Error.\n' + err.stack);
                        }
                    });
                }
                else console.log('Create table success.\n' + JSON.stringify(res));
            }
        });
    });
}).catch(err => {
    console.log('SQL connect fail.\n' + err.stack);
})

