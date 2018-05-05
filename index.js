const Express = require('express');
const { Client } = require('pg')
const Linebot = require('linebot');//Line Bot API
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

// app.post('/hgrok/url', (req, res) => res.send('Hello World!'))
// app.get('/hgrok/url', (req, res) => res.send('Hello World!'))
app.post('/', linebotParser);

const asyncRun = async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, });
    await client.connect();
    //Init sql manager
    sqlManager = new SqlManager(client);
    return sqlManager;
}
asyncRun().then((sqlManager) => {
    console.log('asyncRun success');
    var server = app.listen(process.env.PORT || 8080, () => {
        var port = server.address().port;
        console.log("App now running on port", port);
    
        sqlManager.createTables((err, res) => {
            if (err) {
                console.log('createTables error\n'+err.stack);
            } else {
                console.log('Create\n' + JSON.stringify(res));
            }
        });
    });
}).catch(err => {
    console.log('asyncRun fail\n' + err);
})

