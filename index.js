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
bot.on('message', function (event) {
    event.reply(event.message.text).then(function (data) {
        // success
    }).catch(function (error) {
        // error
    });
});
const linebotParser = bot.parser();

//Express init.
const app = Express();

app.post('/ngrok/url', (req, res) => {
    console.log(req.headers.data);
    sqlManager.insertSetting({key:'ngrok_url', value:req.headers.data}, (err, sqlRes) => {
        if (err) {
            console.log('Error.\n'+err.stack);
        } else {
            console.log('Success.\n' + JSON.stringify(sqlRes));
            var options = {
                url: req.headers.data,
                method: 'GET',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            };
            request(options, (reqErr, reqRes, body) => {
                if (!reqErr && reqRes.statusCode == 200){
                    console.log(body);
                }
                res.send('Success');
            });
        }
    });
    
})
app.get('/sql/settings/:setting_key', (req, res) => {
    sqlManager.getSetting(req.params.setting_key, (err, sqlRes) => {
        if (err) {
            console.log('Error.\n'+err.stack);
        } else {
            console.log('Success.\n' + JSON.stringify(sqlRes));
            res.send(sqlRes);
        }
    });
});
app.post('/', linebotParser);

const connectSqlAsyncRun = async() => {
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
                console.log('Create table error.\n'+err.stack);
            } else {
                if(res == true) console.log('Table exists');
                else  console.log('Create table success.\n' + JSON.stringify(res));
            }
        });
    });
}).catch(err => {
    console.log('SQL connect fail.\n' + err.stack);
})

