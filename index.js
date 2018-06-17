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

const lineNotify = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
}

var ngrokUrl = '';
var homeIotConfig = {};

bot.on('message', function (event) {
    if (ngrokUrl.length > 0) {
        if (event.message.type == 'text') {
            var options = {
                url: ngrokUrl,
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ 'data': event.message.text })
                // body: JSON.stringify({'data': encodeURIComponent(event.message.text)})
            };
            request(options, (reqErr, reqRes, body) => {
                var replyStr = '';
                if (!reqErr && reqRes.statusCode == 200) {
                    console.log(body);
                    replyStr = body;
                } else if (reqErr) {
                    console.log('Error. Request ngrokUrl error.\n' + reqErr.stack);
                    replyStr = 'Request ngrokUrl error.';
                } else {
                    console.log('Request ngrokUrl with error code:' + reqRes.statusCode);
                    replyStr = 'Request ngrokUrl with error code: ' + reqRes.statusCode;
                }
                event.reply(decodeURIComponent(replyStr))
                    .catch(function (err) {
                        // Line event send error
                        console.log('Error.\n' + err.stack);
                    });
            });
        } else if (event.message.type == 'sticker') {
            var options = {
                url: ngrokUrl + '/image/capture',
                method: 'GET',
            };
            request(options, (reqErr, reqRes, body) => {
                console.log(body);
                event.reply({ type: 'image', originalContentUrl: ngrokUrl + '/image/original/' + body, previewImageUrl: ngrokUrl + '/image/preview/' + body })
                    .catch(function (err) {
                        // Line event send error
                        console.log('Error.\n' + err.stack);
                    });
            });
        }
    } else {
        console.log('Error ngrokUrl is empty.');
        event.reply('ngrokUrl is empty.')
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
app.set('view engine', 'ejs');  

app.post('/ngrok/url', (req, res) => {
    let bodyStr = '';
    //transmit body
    req.on('data', chunk => {
        console.log('data received: ' + chunk.toString());
        bodyStr += chunk.toString();
    });
    //end of transmit body
    req.on('end', () => {
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
                bot.push(homeIotConfig.users[0].lineId, 'ngrok_url updated');
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

app.post('/linebot', linebotParser);

app.get('/notify', (req, res) => {
    var templateData = {}
    templateData.clientId = lineNotify.clientId;
    if (req.param('state') && req.param('state').length > 0){
        templateData.state = req.param('state');
    }
    else {
        templateData.state = 'NO_STATE';//default value
    }
    if (req.param('redirect') && req.param('redirect') == 'true'){
        templateData.redirect = true;
    }else{
        templateData.redirect = false;
    }
    res.render('line_notify', templateData);//Use Hogan.js enging to render html.
});
app.get('/notify/callback', (req, res) => {
    console.log('/notify/callback GET');
    var state = req.param('state');
    bot.push(homeIotConfig.users[0].lineId, req.param('code'));
    res.send(req.param('code'));

});
app.post('/notify/callback', (req, res) => {
    console.log('/notify/callback POST');
    req.on('data', chunk => {
        console.log('data received: ' + chunk.toString());
        bodyStr += chunk.toString();
    });
    console.log('body ' + req.body.code);;
    console.log('header ' + req.get('code'));
    var state = req.param('state');
    bot.push(homeIotConfig.users[0].lineId, req.param('code'));
    res.send(req.param('code'));
    
});

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

