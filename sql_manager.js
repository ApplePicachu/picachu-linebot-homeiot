SQLManager = function (client) {
    this.client = client;
    // this.checkExistsTableUser = function (callback) {
    //     checkExistsTable(client, 'service_users', callback);
    // }
    this.createTables = function (callback) {
        client.query('\
        CREATE TABLE IF NOT EXISTS "settings" (\
            "key" char(20) NOT NULL UNIQUE,\
            "value" TEXT,\
            CONSTRAINT service_users_pk PRIMARY KEY ("name")\
        ) WITH (\
        OIDS=FALSE\
        );', callback);
    }
    // this.selectUserById = function (userId, callback) {
    //     const sqlCmd = 'SELECT * FROM service_users WHERE line_id = $1';
    //     client.query(sqlCmd, [userId], callback);
    // }
    this.insertSetting = function (setting, callback) {
        const sqlCmd = 'INSERT INTO settings(key, value) VALUES($1, $2)';
        client.query(sqlCmd, [profile.userId, profile.displayName], callback);
    }
    this.getSetting = function (key, callback) {
        const sqlCmd = 'SELECT * FROM settings WHERE key = $1';
        client.query(sqlCmd, key, callback);
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