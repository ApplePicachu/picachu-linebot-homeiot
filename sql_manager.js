SQLManager = function (client) {
    this.client = client;
    this.checkTables = function (callback) {
        checkExistsTable(client, 'settings', callback);
    }
    this.createTables = function (callback) {
        checkExistsTable(client, 'settings', (err, res) => {
            if (res) callback(err, res);
            else {
                client.query('\
                CREATE TABLE IF NOT EXISTS settings (\
                    key varchar(20) NOT NULL UNIQUE,\
                    value TEXT,\
                    CONSTRAINT service_users_pk PRIMARY KEY (key)\
                ) WITH (\
                OIDS=FALSE\
                );', callback);
            } 
        });
    }
    // this.selectUserById = function (userId, callback) {
    //     const sqlCmd = 'SELECT * FROM service_users WHERE line_id = $1';
    //     client.query(sqlCmd, [userId], callback);
    // }
    this.insertSetting = function (setting, callback) {
        const sqlCmd = 'INSERT INTO settings(key, value) VALUES($1, $2)\
        ON CONFLICT (key) DO UPDATE SET value = $2;';
        client.query(sqlCmd, [setting.key, setting.value], callback);
    }
    this.getSetting = function (key, callback) {
        const sqlCmd = 'SELECT * FROM settings WHERE key=\'' + key + '\'';
        // console.log(sqlCmd);
        client.query(sqlCmd, callback);
    }
}
module.exports = SQLManager;

function checkExistsTable(client, tableName, callback) {
    const sqlCmd = 'SELECT EXISTS ( SELECT 1 FROM pg_tables WHERE tablename = $1 );';
    client.query(sqlCmd, [tableName], (err, res) => {
        if (err) {
            callback(err);
        } else {
            callback(null, res.rows[0].exists);
        }
    });
}