var util = require('util');
var crypto = require('crypto');
var mycache = require('./myCache');
var logger = require('./logger');
var CSError = require('./error').CSError;
var errno = require('./errno');

function SState() {
}

SState.prototype.setSessionKey = function (userId, callback) {

    var session = crypto.pseudoRandomBytes(16).toString('hex');
    this.setUserOneState(userId, "userSession", session, function(err){
		callback(err, session);
	});
};

SState.prototype.getSessionKey = function (userId, callback) {

    this.getUserOneState(userId, "userSession", callback);
};

SState.prototype.delSessionKey = function (userId) {

    this.delUserOneState(userId, "userSession", function(){});
};

SState.prototype.setUserConnectPos = function (userId, value, callback) {

    this.setUserOneState(userId, "connectPos", value, callback);
};

SState.prototype.getUserConnectPos = function (userId, callback) {

    this.getUserOneState(userId, "connectPos", callback);
};

SState.prototype.setUserGamePos = function (userId, pathId, gameId, serverType, serverId, msg, callback) {

    var obj = {
        "gameId": gameId,
        "serverType": serverType,
        "serverId": serverId,
        "pathId": pathId,
        "msg": msg
    };

    var value = JSON.stringify(obj);
    this.setUserOneState(userId, "gamePos", value, callback);
};

SState.prototype.getUserGamePos = function (userId, callback) {

    this.getUserOneState(userId, "gamePos", function(err, data){
        if (err) {
            callback(err);
        } else if (data === null) {
            callback(null);
        } else {
            try {
                callback(null, JSON.parse(data));
            } catch (err) {
                logger.error('getUserGamePos err:', err.stack);
            }
        }
    });
};

SState.prototype.delUserGamePos = function (userId, callback) {

    this.delUserOneState(userId, "gamePos", callback);
};

SState.prototype.setUserOnline = function (userId, value, callback) {

    this.setUserOneState(userId, "online", value, callback);
};

SState.prototype.getUserOnline = function (userId, callback) {

    this.getUserOneState(userId, "online", callback);
};

SState.prototype.setUserSignUp = function (userId, pathId, gameId, serverType, serverId, msg, callback) {

    var obj = {
        "gameId": gameId,
        "serverType": serverType,
        "serverId": serverId,
        "pathId": pathId,
        "msg": msg,
        "time": Date.now()
    };
    var client = mycache.getClient();
    var key = 'user_sign:$' + userId + '$';
    var field = "signUp_" + pathId;
    var value = JSON.stringify(obj);
    client.hset(key, field, value, function (err) {
        if (err) {
            return callback(new CSError(errno.REDIS_SET_FAIL, "redis setUserOneState " + field + "_" + value));
        }

        callback(err);
    });
};

SState.prototype.getUserSignUp = function (userId, callback) {

    var client = mycache.getClient();
    var key = 'user_sign:$' + userId + '$';
    client.hgetall(key, function (err, json) {
        if (err) {
            callback(new CSError(errno.REDIS_GET_FAIL, "redis getUserSignUp"));
        } else {
            try {
                if (json) {
                    var obj = {};
                    for (var index in json) {
                        var data = JSON.parse(json[index]);
                        if (data.gameId && data.serverType && data.serverId && data.pathId) {
                            if (!obj[data.gameId]) {
                                obj[data.gameId] = {};
                            }
                            obj[data.gameId][data.serverId] = {};
                            obj[data.gameId][data.serverId].msg = data.msg;
                            obj[data.gameId][data.serverId].pathId = data.pathId;
                            obj[data.gameId][data.serverId].serverId = data.serverId;
                            obj[data.gameId][data.serverId].serverType = data.serverType;
                            obj[data.gameId][data.serverId].time = data.time;
                        }
                    }
                    callback(null, obj);
                } else {
                    callback(null, null);
                }
            } catch (err) {
                callback(new CSError(errno.REDIS_GET_FAIL, "redis getUserSignUp"));
            }
        }
    });
};

SState.prototype.delUserSignUp = function (userId, pathId, callback) {

    var client = mycache.getClient();
    var key = 'user_sign:$' + userId + '$';
	var field = "signUp_" + pathId;
    client.hdel(key, field, function (err) {
        if (err) {
            return callback(new CSError(errno.REDIS_SET_FAIL, "redis delUserSignUp " + field + "_" + value));
        }
        callback(err);
    });
};

SState.prototype.setMsgConfig = function (gameId, cmdAction, serverId, serverType, pathId, callback) {
    var obj = {
        "gameId": gameId,
        "cmdAction": cmdAction,
        "serverId": serverId,
        "serverType": serverType,
        "pathId": pathId
    };
    var client = mycache.getClient();
    var key = 'msg_config';
    var field = JSON.stringify(obj);
    client.hset(key, field, serverId, function (err) {
        if (err) {
            return callback(new CSError(errno.REDIS_GET_FAIL, key));
        }

        callback(err);
    });
};

SState.prototype.getMsgConfig = function (callback) {
    var client = mycache.getClient();
    var key = 'msg_config';
    client.hgetall(key, function (err, data) {
        if (err) {
            logger.error('getMsgConfig errno.REDIS_GET_FAIL:', err);
            callback(new CSError(errno.REDIS_GET_FAIL, "redis getMsgConfig"));
        } else {
            try {
                if (data) {
                    var pathMap = {};
                    for (var index in data) {
                        var json = JSON.parse(index);
                        //logger.debug('json 1:', json);
                        //.debug('json 2:', json.gameId, json.cmdAction, json.serverId, json.serverType, json.pathId);
                        if (json.gameId && json.cmdAction && json.serverId && json.serverType && json.pathId) {
                            if (!pathMap[json.gameId]) {
                                pathMap[json.gameId] = {};
                            }
                            if (!pathMap[json.gameId][json.cmdAction]) {
                                pathMap[json.gameId][json.cmdAction] = {};
                                pathMap[json.gameId][json.cmdAction]["serverType"] = json.serverType;
                            }
                            if (!pathMap[json.gameId][json.cmdAction][json.serverId]) {
                                pathMap[json.gameId][json.cmdAction][json.serverId] = json.pathId;
                            }
                        }
                    }
                    //logger.debug('pathMap:', pathMap, data);
                    callback(null, pathMap);
                } else {
                    callback(new CSError(errno.REDIS_GET_FAIL, "redis getMsgConfig null"));
                }
            } catch (err) {
                logger.error('err:', err.stack);
                callback(new CSError(errno.REDIS_GET_FAIL, "redis getMsgConfig parse"));
            }
        }
    });
};

SState.prototype.setUserOneState = function (userId, field, value, callback) {
    var client = mycache.getClient();
    var key = 'user_state:$' + userId + '$';
    client.hset(key, field, value, function (err) {
		if (err) {
			return callback(new CSError(errno.REDIS_SET_FAIL, "redis setUserOneState " + field + "_" + value));
		}
		
        callback(err);
    });
};

SState.prototype.getUserStates = function (userId, callback) {
    var client = mycache.getClient();
    var key = 'user_state:$' + userId + '$';
    client.hgetall(key, function (err, data) {
        if (err) {
            callback(new CSError(errno.REDIS_GET_FAIL, "redis getUserStates"));
        } else {
			try {
				if (data) {
					callback(null, data);
				} else {
					callback(null, null);
				}
			} catch (err) {
				callback(new CSError(errno.REDIS_GET_FAIL, "redis getUserStates"));
			}
        }
    });
};

SState.prototype.getUserOneState = function (userId, field, callback) {
    var client = mycache.getClient();
    var key = 'user_state:$' + userId + '$';
    client.hget(key, field, function (err, data) {
        if (err) {
			callback(new CSError(errno.REDIS_GET_FAIL, "redis getUserOneState"));
        } else {
            //if (data) {
				callback(null, data);
			//} else {
			//	callback(new CSError(errno.REDIS_GET_FAIL, "redis getUserOneState " + field));
			//}
        }
    });
};

SState.prototype.delUserOneState = function (userId, field, callback) {
    var client = mycache.getClient();
    var key = 'user_state:$' + userId + '$';
    client.hdel(key, field, function (err) {
        if (err) {
            callback(err);
        }
    });
};

SState.prototype.clearUserState = function (userId, callback) {
    var client = mycache.getClient();
    var key = 'user_state:$' + userId + '$';
    client.del(key, function (err) {
        callback(err);
    });
};

SState.prototype.rptRoomStat = function (roomId, jsonObj) {
    var client = mycache.getClient();
    var key = 'ROOM$STAT';

    var expireTime = 3000;
    client.hset(key, roomId, JSON.stringify(jsonObj), function (err) {
        if (err) {
            return logger.error('redis set room stat failed.', util.inspect(err));
        }
        client.expire(key, expireTime, function () {
        });
    });
};

SState.prototype.loadRoomStat = function (callback) {
    var client = mycache.getClient();
    var key = 'ROOM$STAT';

    client.hgetall(key, function (err, data) {
		if (err) {
			logger.error('redis get all room stat failed.', util.inspect(err));
			callback(new CSError(errno.REDIS_GET_FAIL, "redis loadRoomStat"));
        } else {
            if (data) {
				callback(null, data);
			} else {
				callback(new CSError(errno.REDIS_GET_FAIL, "redis loadRoomStat null"));
			}
        }
    });
};

SState.prototype.setQueueStatus = function (queueName, jsonObj) {
    var client = mycache.getClient();
    var key = 'QUEUE$STATUS';

    client.hset(key, queueName, JSON.stringify(jsonObj), function (err) {
        if (err) {
            logger.error('redis set queue status failed.', util.inspect(err));
        }
    });
};

SState.prototype.getQueueStatus = function (callback) {
    var client = mycache.getClient();
    var key = 'QUEUE$STATUS';

    client.hgetall(key, function (err, data) {
		if (err) {
			logger.error('redis get all queue status failed.', util.inspect(err));
			callback(new CSError(errno.REDIS_GET_FAIL, "redis getQueueStatus"));
        } else {
            if (data) {
				callback(null, data);
			} else {
				callback(new CSError(errno.REDIS_GET_FAIL, "redis getQueueStatus null"));
			}
        }
    });
};

SState.prototype.setConnectStatus = function (connectId, jsonObj) {
    var client = mycache.getClient();
    var key = 'CONNECT$STATUS';

    client.hset(key, connectId, JSON.stringify(jsonObj), function (err) {
        if (err) {
            logger.error('redis set connect status failed.', util.inspect(err));
        }
    });
};

SState.prototype.loadConnectStatus = function (callback) {
    var client = mycache.getClient();
    var key = 'CONNECT$STATUS';

    client.hgetall(key, function (err, res) {
        if (err) {
            logger.error('redis get all connect status failed.', util.inspect(err));
            return callback(err);
        }

        return callback(null, res);
    });
};

SState.prototype.setChatExpire = function (userId, expireTime) {
    var client = mycache.getClient();
    var key = 'CHAT$EXPIRE' + userId;

    client.set(key, true, function(err){
        if (err) {
            logger.error('redis setChatExpire', util.inspect(err));
            return callback(err);
        }
        client.expire(key, expireTime, function(){
        });
    });
};

SState.prototype.getChatExpire = function (userId, callback) {
    var client = mycache.getClient();
    var key = 'CHAT$EXPIRE' + userId;

    client.get(key, function (err, res) {
        if (err) {
            logger.error('redis getChatExpire', util.inspect(err));
            return callback(err);
        }

        return callback(null, res);
    });
};

module.exports = new SState();