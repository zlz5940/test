var os = require("os");
var util = require('util');
var crypto = require("crypto");
var fs = require('fs');

const DAY_LENGTH_MS = 86400000;

Date.prototype.format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1,                   //月份
        "d+": this.getDate(),                        //日
        "h+": this.getHours(),                       //小时
        "m+": this.getMinutes(),                     //分
        "s+": this.getSeconds(),                     //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds()                  //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

var getUTCDayCount = function (timestampMS) {
    return Math.floor(timestampMS / DAY_LENGTH_MS);
};
exports.getUTCDayCount = getUTCDayCount;

exports.UTCDayCountMinus = function (d1, d2) {
    return getUTCDayCount(d1.getTime()) - getUTCDayCount(d2.getTime());
};

var getLocalDayCount = function (timestampMS) {
    var now = new Date();
    return Math.floor((timestampMS - now.getTimezoneOffset() * 60 * 1000) / DAY_LENGTH_MS);
};

exports.LocalDayCountMinus = function (d1, d2) {
    return getLocalDayCount(d1.getTime()) - getLocalDayCount(d2.getTime());
};

exports.getTickCount = function () {
    return Math.floor(Date.now() / 1000);
};

exports.getTodayUTC = function () {
    var now = new Date();

    return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
};

exports.getUTCDayFromTick = function (tickCount) {
    var now = new Date();
    return Math.floor((tickCount - now.getTimezoneOffset() * 60) / 86400);
};

exports.boundedRoundedRand = function (min, max, round) {
    return min + (Math.floor(((max - min) / round) * Math.random() + 0.5) * round);
};

exports.getFileLine = function () {
    var e = new Error();
    var fields = e.stack.split('\n')[3].split('/');
    var line = fields[fields.length - 1];
    return line.substring(0, line.length - 1);
};

exports.getDateTimeString = function (timestamp) {
    var t = new Date(timestamp * 1000);
    return util.format('%d-%d-%d %d:%d:%d', t.getFullYear(), t.getMonth() + 1, t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds());
};

exports.getDateTimeYYYYMMDD = function (dateObj) {
    var year = dateObj.getFullYear() + "";
    var month = dateObj.getMonth() + 1 + "";
    var day = dateObj.getDate() + "";

    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;

    return (year + month + day);
};

exports.getSqlDateString = function () {
    var dateObj = new Date();
    var year = dateObj.getFullYear();
    var month = dateObj.getMonth() + 1;
    var day = dateObj.getDate();

    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;

    return (year + '-' + month + '-' + day);
};

exports.getDateTimeYYYYMMDDHHMMSS = function (dateObj) {
    var year = dateObj.getFullYear();
    var month = dateObj.getMonth() + 1;
    var day = dateObj.getDate();
    var hh = dateObj.getHours();
    var mn = dateObj.getMinutes();
    var ss = dateObj.getSeconds();

    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;
    hh = hh < 10 ? "0" + hh : hh;
    mn = mn < 10 ? "0" + mn : mn;
    ss = ss < 10 ? "0" + ss : ss;
    return (year + '-' + month + '-' + day + ' ' + hh + ':' + mn + ':' + ss);
};

exports.getTimeStrHHMMSS = function (dateObj) {
    var hh = dateObj.getHours();
    var mn = dateObj.getMinutes();
    var ss = dateObj.getSeconds();

    hh = hh < 10 ? "0" + hh : hh;
    mn = mn < 10 ? "0" + mn : mn;
    ss = ss < 10 ? "0" + ss : ss;

    return (hh + ':' + mn + ':' + ss);
};

exports.getTodayYYYYMMDD = function () {
    var d = new Date();
    var year = d.getFullYear() + "-";
    var month = d.getMonth() + 1 + "-";
    var day = d.getDate() + "";

    return (year + month + day);
};

exports.getTodayUTC = function () {
    var now = new Date();

    return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
};

exports.getUTCDayFromTick = function (tickCount) {
    var now = new Date();
    return Math.floor((tickCount - now.getTimezoneOffset() * 60) / 86400);
};

exports.get0TickOfUTCDay = function (day) {
    var now = new Date();
    return day * 86400 + now.getTimezoneOffset() * 60;
};

exports.isTime = function (str) {
    var a = str.match(/^(\d{1,2})(:)?(\d{1,2})\2(\d{1,2})$/);
    return ((a != null) && a[1] <= 24 && a[3] < 60 && a[4] < 60);
};

exports.isDate = function (str) {
    var r = str.match(/^(\d{1,4})(-|\/)(\d{1,2})\2(\d{1,2})$/);
    if (r == null) {
        return false;
    }
    var d = new Date(r[1], r[3] - 1, r[4]);
    return (
        (d.getFullYear() == r[1])
        && ((d.getMonth() + 1) == r[3])
        && (d.getDate() == r[4])
    );
};

exports.isDateTime = function (str) {
    var reg = /^(\d{1,4})(-|\/)(\d{1,2})\2(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/;
    var r = str.match(reg);
    if (r == null) {
        return false;
    }
    var d = new Date(r[1], r[3] - 1, r[4], r[5], r[6], r[7]);
    return (
        (d.getFullYear() == r[1])
        && ((d.getMonth() + 1) == r[3])
        && (d.getDate() == r[4])
        && (d.getHours() == r[5])
        && (d.getMinutes() == r[6])
        && (d.getSeconds() == r[7])
    );
};

exports.writeHourLog = function (logFile, fields) {
    if (!logFile) {
        return;
    }

    var args = Array.prototype.slice.call(fields);
    var str = Date.now().toString();

    for (var i = 0; i < args.length; i++) {
        str += ' ';
        str += args[i];
    }

    str += '\n';

    var hourLog = logFile + '.' + parseInt(Date.now() / 3600000);

    fs.appendFile(hourLog, str);
};

exports.getLocalIP = function getLocalIP() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.internal) {
                return alias.address;
            }
        }
    }
};

exports.getInternalIP = function getInternalIP() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal && !alias.address.indexOf("10.")) {
                return alias.address;
            }
        }
    }
};

exports.getExtranetIP = function getExtranetIP() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal && alias.address.indexOf("10.")) {
                return alias.address;
            }
        }
    }
};

exports.outOrder = function (array) {
    for (var m, t, n = array.length; n > 0;) {
        m = parseInt(Math.random() * n);
        t = array[--n];
        array[n] = array[m];
        array[m] = t;
    }
};

exports.checkParams = function (array, body) {

    var retObj = [true, ""];
    for (var i = 0; i < array.length; i++) {
        var key = array[i];
        if (typeof body[key] === "undefined") {
            retObj[0] = false;
            retObj[1] = key;
            break;
        }
    }
    return retObj;

};

exports.checkReqParams = function (msg) {

    var Obj = {isValid: true, retObj: null};
    if (msg && msg.cmd && msg.params && msg.params.action
        && msg.params.userId) {
        Obj.retObj = this.createRetObj(msg.cmd, msg.params.action);
		if (msg.params.gameId) {
			Obj.retObj.result.gameId = msg.params.gameId;
		}
    } else {
        Obj.isValid = false;
    }

    return Obj;
};

exports.createRetByGame = function (gameId, cmd, action) {

    var Obj = {
        cmd: cmd,
        result: {
            code: 0,
            message: "success",
            userId: 0,
            action: action,
			gameId: gameId
        }
    };

    return Obj;
};

exports.createRetObj = function (cmd, action) {

    var Obj = {
        cmd: cmd,
        result: {
            code: 0,
            message: "success",
            userId: 0,
            action: action,
            gameId: global.gameId
    }
    };

    return Obj;
};

exports.createReqObj = function (cmd, action, userId) {

    var Obj = {
        cmd: cmd,
        params: {
            action: action,
            userId: userId
        }
    };

    return Obj;
};

var Cipher = function (str, appKey) {
    var cipher = crypto.createHmac('RSA-SHA1', appKey);
    var sign = cipher.update(str);
    return sign.digest("base64");
};

//获取签名
exports.getSign = function(data, appKey) {

    delete data.sign;
    var keys = [];
    for (var key in data) {
        keys.push(key);
    }

    keys = keys.sort();
    var array = [];
    keys.forEach(function (item) {
        array.push(item + "=" + data[item]);
    });

    var cipherStr = encodeURIComponent(array.join("&"));
    return encodeURIComponent(Cipher(cipherStr, appKey + "&"));
};

exports.verifySign = function(data, appKey) {
    var sign = data.sign;
    var recvSign = this.getSign(data, appKey);

    return (sign === recvSign);
};