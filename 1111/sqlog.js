/*
 *  1.002
 */
var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 3,
    host: '116.62.43.226',
    user: 'root',
    password: '9bD2Or&gK%',
    database: 'yz_game',
    port: 20020
});

function query(sql, inParams, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            return callback(err);
        }

        conn.query(sql, inParams, function (err, res) {
            if (err) {
                callback(err);
            } else {
                callback(null, res);
            }
            conn.release();
        });
    });
}

function realQuery(sql, inParams, callback) {
    try {
        query(sql, inParams, callback);
    } catch (e) {
        console.log('sql:', e);
    }
}

exports.query = realQuery;
