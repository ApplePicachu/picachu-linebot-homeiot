const Express = require('express');
const { Client } = require('pg');//Postgres
const Linebot = require('linebot');//Line Bot API

//Postgres connect
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});
client.connect();

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

// app.get('/', (req, res) => res.send('Hello World!'));
app.post('/hgrok/url', (req, res) => res.send('Hello World!'))
app.get('/hgrok/url', (req, res) => res.send('Hello World!'))
app.post('/', linebotParser);

var server = app.listen(process.env.PORT || 8080, () => {
    var port = server.address().port;
    console.log("App now running on port", port);

    sqlManager.createTables((err, res) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log('Create\n' + JSON.stringify(res));
        }
    });
});