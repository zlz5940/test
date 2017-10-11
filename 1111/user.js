var async = require('async');

var logger = require('./logger');
var consts = require('./consts');
var utils = require('./utils');
var sstate = require('./sstate');
var errno = require('./errno');
var wlog = require('./wlog');
var CSError = require('./error').CSError;

var verifyStr = require('./readFile');
var User = require('../schema/users');
var UserIdPump = require('../schema/userIdPump');
var paramsCheck = require('../common/detection');
var UserHistory = require('../schema/usersPlayHistory');
var RankList = require('../schema/rankList');

var wxLogin = require("../websvc/model/wxLogin");

var AUTO_LOGIN_TIME_OUT = 1000 * 60 * 60 * 24 * 7;

//周排行缓存
var thisWeekRankCahe = [];

function findUserByAccount(account, callback) {
    User.findOne(
        {
            account: account
        }, function (err, user) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (!user) {
                    callback(null, null);
                } else {
                    callback(null, user);
                }
            }
        }
    );
}

function findUserByNickname(nickname, callback) {
    User.findOne(
        {
            nickname: nickname
        }, function (err, user) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (!user) {
                    callback(null, null);
                } else {
                    callback(null, user);
                }
            }
        }
    );
}

function findUserByDevice(deviceId, callback) {
    User.findOne(
        {
            deviceId : deviceId
        }, function(err, user) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (!user) {
                    callback(null, null);
                } else {
                    callback(null, user);
                }
            }
        }
	);
}

function findUserByUnionId(unionId, callback) {
    console.log("findUserByUnionId, uionId=", unionId);
    User.findOne(
        {
            unionId : unionId
        }, function(err, user) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (!user) {
                    callback(null, null);
                } else {
                    callback(null, user);
                }
            }
        }
	);
}

function initUserIdPump(callback) {
    UserIdPump.findOne(
        {},
        function (err, data) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (data) {
                    callback(null, data);
                } else {
                    var initData = new UserIdPump();
                    initData.nextUserId = consts.START_USERID;
                    initData.save(function (err) {
                        if (err) {
                            callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
                        } else {
                            callback(null, initData);
                        }
                    });
                }
            }
        }
    );
}

function popUserId(callback) {
    UserIdPump.findOneAndUpdate(
        {},
        {
            $inc: {nextUserId: 1}
        },
        {
            new: true
        },
        function (err, doc) {
            if (err) {
                logger.error('pop userId:', err);
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (!doc) {
                    initUserIdPump(function (err, data) {
                        callback(null, data.nextUserId);
                    });
                } else {
                    callback(null, doc.nextUserId);
                }
            }
        }
    );
}

// 为用户创建session
function createSession(userId, callback) {
    sstate.getSessionKey(userId, function (err, sessionKey) {
        if (err) {
            //callback(new CSError(errno.REDIS_GET_FAIL, err.message));
			//logger.debug(userId, " createSession, sessionKey is NULL: ", sessionKey);
			sstate.setSessionKey(userId, function (err, data) {
				if (err) {
					callback(new CSError(errno.REDIS_SET_FAIL, err.message));
				} else {
					sessionKey = data;
					callback(null, sessionKey);
				}
			});
        } else {
            sstate.setSessionKey(userId, function (err, data) {
                if (err) {
                    callback(new CSError(errno.REDIS_SET_FAIL, err.message));
                } else {
                    sessionKey = data;
                    callback(null, sessionKey);
                }
            });
            /*if (!sessionKey) {
                //logger.debug(userId, " createSession, sessionKey is NULL: ", sessionKey);
                sstate.setSessionKey(userId, function (err, data) {
                    if (err) {
                        callback(new CSError(errno.REDIS_SET_FAIL, err.message));
                    } else {
                        sessionKey = data;
                        callback(null, sessionKey);
                    }
                });
            } else {
                //logger.debug(userId, " createSession, sessionKey not NULL: ", sessionKey);
                callback(null, sessionKey);
            }*/
        }
    });
}

function doLogin(user, loginParams, callback) {

    //logger.debug("doLogin userId: ", user.userId, " isNewUser: ", user.isNewUser);
    var data = {
        account: user.account,
        password: user.password,
        nickname: user.nickname,
        mail: user.mail,
        mobile: user.mobile,
        userId: user.userId
    };

    async.waterfall([
        function (cb) {
            user.save(function (err) {
                if (err) {
                    cb(new CSError(errno.MONGO_SAVE_FAIL, err.message));
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {
            createSession(data.userId, cb);
        }
    ], function (err, sessionKey) {
        if (err) {
            callback(err);
        } else {
            var regDate = utils.getDateTimeYYYYMMDD(new Date(user.createTime));
            wlog.userLogin(user.userId, regDate, loginParams.clientId);
            callback(null, sessionKey, data);
        }
    });
}

function doLoginByUnionId(user, loginParams, callback) {

    //logger.debug("doLogin userId: ", user.userId, " isNewUser: ", user.isNewUser);
    var data = {
        account: user.account,
        password: user.password,
        nickname: user.nickname,
        mail: user.mail,
        mobile: user.mobile,
        userId: user.userId,
        unionId: user.unionId,
        avatarId: user.avatarId
    };

    async.waterfall([
        function (cb) {
            user.save(function (err) {
                if (err) {
                    logger.error("doLoginByUnionId, err=>", err.message);
                    cb(new CSError(errno.MONGO_SAVE_FAIL, err.message));
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {
            createSession(data.userId, cb);
        }
    ], function (err, sessionKey) {
        if (err) {
            callback(err);
        } else {
            var regDate = utils.getDateTimeYYYYMMDD(new Date(user.createTime));
            wlog.userLogin(user.userId, regDate, loginParams.clientId);
            callback(null, sessionKey, data);
        }
    });
}

function createUser(deviceId, regParams, callback) {
    var userId = null;
    async.waterfall([
        function (cb) {
            popUserId(function (err, uid) {
                if (err) {
                    cb(err);
                } else {
                    userId = uid;
                    cb(err, uid);
                }
            });
        }
    ], function (err) {
        if (err) {
            return callback(err);
        }

        var user = new User();
        regParams.userId = userId;
        user.userId = userId;
        user.nickname = userId;
        user.account = userId;
        user.deviceId = deviceId;
        //user.password = regParams.password;
        user.mobile = regParams.mobile;
        //user.mail = regParams.mail;
        user.unionId = deviceId;
        user.vipPoints = consts.INIT_VIPPOINTS;
        user.lastLoginTime = Date.now();

        user.save(function (err) {
            if (err) {
                logger.error("error:", err.message);
                callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
            } else {
                logger.info('REG', userId, deviceId);
                callback(null, user, regParams);
            }
        });
    });
}

function createUserByUnionId(unionId, deviceId, regParams, callback) {
    var userId = null;
    async.waterfall([
        function (cb) {
            popUserId(function (err, uid) {
                if (err) {
                    cb(err);
                } else {
                    userId = uid;
                    cb(err, uid);
                }
            });
        }
    ], function (err) {
        if (err) {
            return callback(err);
        }

        var user = new User();
        regParams.userId = userId;
        user.userId = userId;
        user.nickname = regParams.nickname;
        user.account = userId;
        user.deviceId = deviceId;
        user.unionId = unionId;
        user.sex = regParams.sex;
        user.avatarId = regParams.headimgurl;
        //user.password = regParams.password;
        user.vipPoints = consts.INIT_VIPPOINTS;
        user.mobile = regParams.mobile;
        //user.mail = regParams.mail;
        user.refreshToken = regParams.refreshToken;
        user.lastLoginTime = Date.now();

        user.save(function (err) {
            if (err) {
                logger.error("error:", err.message);
                console.log("createUserByUnionId::error=>", err.message);
                callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
            } else {
                logger.info('REG', userId, deviceId);
                callback(null, user, regParams);
            }
        });
    });
}

/*function createUser(account, regParams, callback) {
    var userId = null;
    async.waterfall([
        function (cb) {
            popUserId(function (err, uid) {
                if (err) {
                    cb(err);
                } else {
                    userId = uid;
                    cb(err, uid);
                }
            });
        }
    ], function (err) {
        if (err) {
            return callback(err);
        }

        var user = new User();
        regParams.userId = userId;
        user.userId = userId;
        user.nickname = regParams.nickname;
        user.account = account;
        user.password = regParams.password;
        user.mobile = regParams.mobile;
        //user.mail = regParams.mail;
        user.lastLoginTime = Date.now();

        user.save(function (err) {
            if (err) {
                logger.error("error:", err.message);
                callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
            } else {
                logger.info('REG', userId, account);
                callback(null, user, regParams);
            }
        });
    });
}*/

function createUserByDeviceId(deviceId, loginParams, callback) {
    popUserId(function(err, uid) {
        if (err) {
            callback(err);
        } else {
            var user = new User();
            user.userId = uid;
            user.nickname = "gamecell~" + uid;
            user.deviceId = deviceId;
            user.deviceType = loginParams.deviceType;
            user.deviceModel = loginParams.deviceModel;
            user.chips = consts.NEW_USER_CHIPS;
            user.lastLoginIp = loginParams.remoteIp;
            user.lastLoginTime = new Date();
            user.utfOffset = loginParams.utfOffset;
            user.channel = parseInt(loginParams.channel);
            user.csVersion = loginParams.version;

            user.save(function(err) {
                if (err) {
                    logger.error("error:", err.message);
                    callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
                } else {
                    logger.info('REG', uid, deviceId, loginParams.utcOffset, loginParams.remoteIp);
					// 为新用户 add at 20151130
                    user.isNewUser = true;
                    callback(null, user);
                }
            });
        }
    });
}

function findUserById(userId, callback) {
    User.findOne(
        {
            userId: userId
        }, function (err, user) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (!user) {
                    callback(new CSError(errno.MONGO_USER_NOT_FOUND, 'user no exist.'));
                } else {
                    callback(null, user);
                }
            }
        }
    );
}

exports.getUserById = findUserById;

exports.incChips = function (userId, transferChips, pathId, callback) {

    var amount = parseInt(transferChips);
    if (!amount || isNaN(amount)) {
        logger.error("incChips invalid amount:", amount);
        return callback(new CSError(errno.MONGO_FIND_FAIL, "欢乐豆数量无效"));
    }

    var leftChips = 0;
    async.waterfall([
        function (cb) {
            if (amount > 0) {
                return cb(null);
            }

            findUserById(userId, function (err, doc) {
                if (err) {
                    return cb(err);
                }
                if (!doc) {
                    return cb(new CSError(errno.MONGO_USER_NOT_FOUND, "用户不存在"));
                }
                if (amount + doc.chips < 0) {
                    logger.error("incChips userId:", userId, " Need to deduct:", amount, " Finally to deduct:", (-1) * doc.chips);
                    cb(new CSError(errno.CHIPS_NOT_ENOUGH, "欢乐豆不足"));
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {
            logger.debug("incChips userId:", userId, " amount:", amount);
            User.findOneAndUpdate(
                {
                    userId: userId
                },
                {
                    $inc: {chips: amount}
                },
                {
                    new : true
                },
                function (err, doc) {
                    if (err) {
                        logger.error("incChips update err:", err, ", userId:", userId, amount, leftChips);
                        cb(new CSError(errno.MONGO_FIND_FAIL, err.message));
                    } else {
                        if (!doc) {
                            return cb(new CSError(errno.MONGO_USER_NOT_FOUND, "用户不存在"));
                        }
                        leftChips = doc.chips;
                        cb(null);
                    }
                }
            );
        }
    ],
    function (err) {
        if (err) {
            logger.error("incChips failed, err:", err);
            return callback(err, 0);
        }

        if (global.mqClient && pathId) {
            var ret = utils.createRetByGame(global.gameId, "hall", "chipsChange");
            ret.result.chips = leftChips;
            global.mqClient.push(pathId, {userIdList: [userId], msg: ret});
        }

        return callback(null, leftChips);
    });
};

exports.incVipPoints = function(userId, amount, pathId, callback) {
    amount = parseInt(amount);

    if (!amount || isNaN(amount)) {
        logger.error("incVipPoints invalid amount:", amount);
        return callback(new CSError(errno.MONGO_FIND_FAIL, "房卡数量无效"));
    }

    var leftVipPoints = 0;
    async.waterfall([
        function (cb) {
            if (amount > 0) {
                return cb(null);
            }

            findUserById(userId, function (err, doc) {
                if (err) {
                    return cb(err);
                }
                if (!doc) {
                    return cb(new CSError(errno.MONGO_USER_NOT_FOUND, "用户不存在"));
                }
                if (amount + doc.vipPoints < 0) {
                    logger.error("incVipPoints userId:", userId, " Need to deduct:", amount, " Finally to deduct:", (-1) * doc.vipPoints);
                    cb(new CSError(errno.VIPPOINTS_NOT_ENOUGH, "房卡不足"));
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {
            logger.debug("incVipPoints userId:", userId, " amount:", amount);
            User.findOneAndUpdate(
                {
                    userId: userId
                },
                {
                    $inc: {vipPoints: amount}
                },
                {
                    new : true
                },
                function (err, doc) {
                    if (err) {
                        logger.error("incVipPoints update err:", err, ", userId:", userId, amount, leftVipPoints);
                        cb(new CSError(errno.MONGO_FIND_FAIL, err.message));
                    } else {
                        if (!doc) {
                            return cb(new CSError(errno.MONGO_USER_NOT_FOUND, "用户不存在"));
                        }
                        leftVipPoints = doc.vipPoints;
                        cb(null);
                    }
                }
            );
        }
    ],
    function (err) {
        if (err) {
            logger.error("incVipPoints failed, err:", err);
            return callback(err, 0);
        }

        if (global.mqClient && pathId) {
            var ret = utils.createRetByGame(consts.gameIdMap.HALL, "hall", "vipPointsChange");
            ret.result.vipPoints = leftVipPoints;
            global.mqClient.push(pathId, {userIdList: [userId], msg: ret});
        }

        return callback(null, leftVipPoints);
    });
    /*User.findOneAndUpdate(
        {
            userId: userId
        },
        {
            $inc : {vipPoints : amount}
        },
        {
            new: true
        },
        function(err, doc) {
            if (err) {
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                if (doc) {
                    callback(null, doc.vipPoints);
                    if (global.mqClient && pathId) {
                        var ret = utils.createRetByGame(global.gameId, "hall", "vipPointsChange");
                        ret.result.vipPoints = doc.vipPoints;
                        global.mqClient.push(pathId, {userIdList: [userId], msg: ret});
                    }
                } else {
                    callback(new CSError(errno.MONGO_USER_NOT_FOUND, 'user:' + userId + ' not found.'));
                }
            }
        }
    );*/
};

exports.register = function (account, regParams, callback) {

    var paramsCheckArr = ['account', 'password', 'nickname', 'mobile', 'clientId'];
    var checkArr = utils.checkParams(paramsCheckArr, regParams);
    if (!checkArr[0]) {
        return callback(new CSError(errno.USER_PARAMS_INVALID, checkArr[1], "invalid params "));
    }

    var userObj = null;
    async.waterfall([
        function (cb) {
            if (!paramsCheck.checkAccount(regParams.account)) {
                logger.error("account:", regParams.account, " is invalid");
                return cb(new CSError(errno.USER_ACCOUNT_INVALID, "无效的账号"));
            }

            if (!paramsCheck.checkPassword(regParams.password)) {
                logger.error("password:", regParams.password, " is invalid");
                return cb(new CSError(errno.USER_PASSWORD_INVALID, "无效的密码"));
            }

            if (!paramsCheck.checkMobile(regParams.mobile)) {
                logger.error("mobile:", regParams.mobile, " is invalid");
                return cb(new CSError(errno.USER_MOBILE_INVALID, "无效的手机号码"));
            }

            /*if (!paramsCheck.checkMail(regParams.mail)) {
             logger.error("mail:", regParams.mail, " is invalid");
             return cb(new CSError(errno.USER_MAIL_INVALID, "无效的邮箱"));
             }*/
            cb(null);
        },
        function (cb) {
            verifyStr.verifyNickname(regParams.nickname, function (err) {
                if (err) {
                    cb(err);
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {
            findUserByAccount(account, function (err, user) {
                if (err) {
                    return cb(err);
                }

                if (user) {
                    return cb(new CSError(errno.USER_ACCOUNT_REPEAT, "账号已存在"));
                }

                cb(null);
            });
        },
        function (cb) {
            findUserByNickname(regParams.nickname, function (err, user) {
                if (err) {
                    cb(err);
                } else {
                    if (user) {
                        cb(new CSError(errno.USER_NICKNAME_REPEAT, "昵称已存在"));
                    } else {
                        cb(null);
                    }
                }
            })
        },
        function (cb) {
            // 新的账号，创建新用户
            createUser(account, regParams, function (err, user, data) {
                if (err) {
                    return cb(err);
                } else {
                    userObj = data;
                    return cb(null);
                }
            });
        }
    ], function (err) {
        if (err) {
            return callback(err);
        } else {
            wlog.userInfo(userObj.userId, userObj.account, userObj.nickname, userObj.mobile, regParams.clientId,
                userObj.csVersion || "1.0.0");
            callback(null, userObj);
        }
    });
};

exports.login = function (account, loginParams, callback) {

    if (!account) {
        return callback(new CSError(errno.USER_ACCOUNT_INVALID, "无效的账号"));
    }

    User.findOne(
        {
            account: account
        },
        function (err, user) {
            if (err) {
                return callback(new CSError(errno.MONGO_FIND_FAIL, "can't find user"));
            }

            if (user) {
                if (loginParams.password !== user.password) {
                    return callback(new CSError(errno.USER_MOBILE_PWD_ERR, "密码错误"));
                }
                return doLogin(user, loginParams, callback);
            } else {
                return callback(new CSError(errno.USER_ACCOUNT_INVALID, "用户名或密码错误."));
            }
        }
    );
};

exports.loginByDeviceId = function(deviceId, loginParams, callback) {
    if (!deviceId) {
        return callback(new CSError(errno.LOBBY_INVALID_DEVICE_ID, "invalid device id"));
    }

    findUserByDevice(deviceId, function(err, user) {
        if (err) {
            return callback(err);
        }

        if (user) {
            user.isNewUser = false;
            return doLogin(user, loginParams, callback);
        }

        // 新的设备，创建新用户
        createUser(deviceId, loginParams, function(err, user) {
            if (err) {
                return callback(err);
            } else {
                return doLogin(user, loginParams, callback);
            }
        });
    });
};

exports.loginByUnionId = function(loginParams, callback) {
    var unionId = loginParams.unionId;
    var deviceId = loginParams.deviceId;
    logger.debug("loginByUnionId unionId=" + unionId);

    if (!unionId) {
        return callback(new CSError(-1, "invalid unionId id"));
    }

    findUserByUnionId(unionId, function(err, user) {
        if (err) {
            return callback(err);
        }

        if (user) {
            user.isNewUser = false;
            if (!user.firstAutoLoginTime) {
                user.firstAutoLoginTime = Date.now();                
            }
            if (loginParams.refreshToken) {
                user.lastRefreshTokenTime = Date.now();
                user.refreshToken = loginParams.refreshToken;
                logger.debug("refresh_token", loginParams.refreshToken);
                return doLoginByUnionId(user, loginParams, callback);
            }

            var diff = Date.now() - new Date(user.lastRefreshTokenTime).getTime();

            logger.debug("lastRefreshTokenTime", user.lastRefreshTokenTime, user.refreshToken, diff);
            if (diff >= consts.REFRESH_TOKEN_TIME) {
                wxLogin.requestRefreshToken(user.refreshToken, function(json){
                    logger.debug("requestRefreshToken:", json);
                    if (json && json.access_token) {
                        wxLogin.requestUserInfo(json, function(userInfoRes) {
                            logger.debug("requestUserInfo:", userInfoRes);
                            user.lastRefreshTokenTime = Date.now();
                            user.refreshToken = json.refresh_token;
                            user.nickname = userInfoRes.nickname;
                            user.avatarId = userInfoRes.headimgurl;
                            return doLoginByUnionId(user, loginParams, callback);
                        });
                    } else {
                        return callback(new CSError(-1, "invalid unionId id"));
                    }
                });
            } else {
                return doLoginByUnionId(user, loginParams, callback);
            }
            return;
        }

        if (loginParams.autoLogin) {
            return callback(new CSError(-1, "invalid unionId id"));
        }

        // 创建新用户
        createUserByUnionId(unionId, deviceId, loginParams, function(err, user) {
            if (err) {
                return callback(err);
            } else {
                return doLoginByUnionId(user, loginParams, callback);
            }
        });
    });
};

exports.loginByUserId = function(userId, loginParams, callback) {
    if (!userId) {
        return callback(new CSError(errno.LOBBY_INVALID_USER_ID, "invalid userId."));
    }

    findUserById(userId, function(err, user) {
        if (err) {
            return callback(err);
        }

        if (user) {
            user.isNewUser = false;
            if (!user.firstAutoLoginTime) {
                return callback(new CSError(errno.DDZ_INVALID_USERID, "auto login time out..."));
            }
            var now = Date.parse(new Date());            
            var diff = now - Date.parse(user.firstAutoLoginTime);
            if (diff >= AUTO_LOGIN_TIME_OUT) {
                user.firstAutoLoginTime = null;
                user.save(function(err) {});
                return callback(new CSError(errno.DDZ_INVALID_USERID, "auto login time out..."));
            }
            return doLoginByUnionId(user, loginParams, callback);            
        }
        return callback(new CSError(errno.DDZ_INVALID_USERID, "invalid userId"));
    });
};

exports.userPasswordReset = function(mobile, password, callback) {
    if (!mobile || mobile == "" || !password || password == "") {
        return callback(new CSError(errno.ERR_NULL_ID, "password is null"));
    }
    User.findOne(
        {
            mobile: mobile
        },
        function (err, doc) {
            if (err) {
                return callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            }
            if (!doc) {
                return callback(new CSError(errno.MONGO_USER_NOT_FOUND, 'user:' + mobile + ' not found.'));
            }

            doc.set({password:password});

            doc.save(function (err) {
                if (err) {
                    logger.error("reset mb passwd for user", mobile);
                    return callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
                } else {
                    var data = {
                        result: 0
                    };
                    return callback(null, data);
                }
            });
        }
    );
};

exports.online = function(userId, callback) {
    async.waterfall([
        function(cb) {
            findUserById(userId, function(err, data) {
                if (err) {
                    cb(err);
                } else {
                    var userData = null;
                    if (data) {
                        userData = {userId: userId, nickname: data.nickname, chips: data.chips, diamond: data.diamond,
                                    avatarType: data.avatarType, avatarId: data.avatarId, sex: data.sex,
                                    vipPoints: data.vipPoints, exps: data.exps, channel: data.channel, online: 1};
                    }

                    cb(null, userData);
                }
                logger.debug('load user info from db for', userId, data);
            });
        }
        ],
        function(err, userInfo) {
            callback(err, userInfo);
        }
    );
};

function findUserPlayCount (userId, callback) {
    UserHistory.findOne(
        {
            userId: userId
        },
        function (err, doc) {
            if (err) {
                logger.error('pop userId:', err);
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                logger.debug("findUserPlayCount doc:", doc);
                if (!doc) {
                    var newUserHistory = new UserHistory();
                    callback(null, newUserHistory);
                } else {
                    callback(null, doc);
                }
            }
        }
    );
};

exports.findUserPlayCount_exp = function (userId, callback) {
    UserHistory.findOne(
        {
            userId: userId
        },
        function (err, doc) {
            if (err) {
                logger.error('pop userId:', err);
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                logger.debug("findUserPlayCount doc:", doc);
                if (!doc) {
                    var newUserHistory = new UserHistory();
                    callback(null, newUserHistory);
                } else {
                    callback(null, doc);
                }
            }
        }
    );
};

function setUserPlayCount (userId, thisWeekTime, thisWeekCount, callback) {
    logger.debug("setUserPlayCount time = ", thisWeekTime);
    logger.debug("setUserPlayCount userId = ", userId);
    logger.debug("setUserPlayCount thisWeekCount = ", thisWeekCount);

    UserHistory.findOneAndUpdate(
        {
            userId: userId
        },
        {
            $set: {
                thisWeekTime: thisWeekTime,
                thisWeekCount: thisWeekCount
            }
        },
        {
            new: true,
            upsert: true
        },
        function (err, doc) {
            if (err) {
                logger.error('setUserPlayCount userId:', err);
                callback(new CSError(errno.MONGO_FIND_FAIL, err.message));
            } else {
                logger.debug('setUserPlayCount userId:', userId, doc);
                if (!doc) {
                    /*var newUserHistory = new UserHistory();
                    newUserHistory.thisWeekCount = 1;
                    newUserHistory.save(function (err) {
                        if (err) {
                            callback(new CSError(errno.MONGO_SAVE_FAIL, err.message));
                        } else {
                            callback(null, newUserHistory);
                        }
                    });*/
                } else {
                    callback(null, doc);
                }
            }
        }
    );
};

function findUserPlayCountRank (sortName, timeStamp, num, callback) {
    logger.debug( 'findUserPlayCountRank', '---------------- 1' );
    num = parseInt(num);
    if (!num || isNaN(num)) {
        logger.debug("num is invalid.");
        return callback(new CSError(errno.USER_PARAMS_INVALID, "num"));
    }
    sortName = "-" + sortName;
    UserHistory.find(
        {
            thisWeekTime: {
                "$gte": timeStamp
            }
        },
        {
            thisWeekCount: 1,
            userId   :  1
        }
    ).sort(sortName).limit(num).exec(function (err, users) {
        if (err) {
            logger.error("findUserPlayCountRank:", sortName, err);
            callback(err);
        } else {
            logger.debug("findUserPlayCountRank:", sortName, users, timeStamp, num);
            users.forEach(function (data, index) {
                data.place = index + 1;
            });
            callback(null, users);
        }
    });
    logger.debug( 'findUserPlayCountRank', '---------------- 2' );
};

exports.findLastRankList = function (callback) {
    RankList.find(
        {
        },
        {
        },
        function (err, doc) {
            if (err) {
                logger.error("findLastRankList:", err);
                callback(err);
            } else {
                callback(null, doc);
            }
    });
};

/*
 * 增加玩家局数
 */
exports.addUserPlayCount = function (userID, count) {

    var time = new Date().getTime();
    logger.debug("addUserPlayCount ",  'count = ' + count);
    findUserPlayCount( userID, function( err, data ){
        if (err) {
            logger.error('addUserPlayCount:', err);
        } else {
            if (!data) {

            } else {
                data.thisWeekCount = data.thisWeekCount ? data.thisWeekCount : 0;
                logger.debug("addUserPlayCount success .", data.thisWeekCount, count);
                setUserPlayCount(userID, time, data.thisWeekCount + count, function(){ });
            }
        }

    } );

};

/*
 * 获取距离今天最近的星期一零点的时间
 */
function getMondayStamp(){
    var today      = new Date();
    var day        = today.getDay();
    //星期天按照星期七算
    day = day == 0 ? 7 : day;
    //今天零点
    var todayBegin = new Date(new Date().setHours(0, 0, 0, 0));
    var monday = todayBegin - 86400 * (day - 1) * 1000;
    return monday;
}

/*
 * 刷新本周排行版
 */
function freshRankCahe( ){
   var monday = getMondayStamp();
   findUserPlayCountRank( 'thisWeekCount',monday,20, function(err, data){
       if( err ){
           return;
       }
       thisWeekRankCahe = data.slice( 0 );

       thisWeekRankCahe.sort( function( a, b ){
            return b.thisWeekCount - a.thisWeekCount;

       } );
   });
}

/*
 * 排行榜刷新定时器
 */
exports.refreshThisWeekRankByTimer = function( time ){
    setInterval( freshRankCahe,  time );
}

exports.getWeekRank = function( ){
    return thisWeekRankCahe;
}


/*
 * 设置上周排行榜
 */
function setLastWeekRank(){

    var userIds = [];

    for( var  i = 0 ; i < thisWeekRankCahe.length; ++i ){
        userIds.push( thisWeekRankCahe[i].userId );
    }

    var lastWeekData = [];
    async.each(userIds, function(targetId, cb1){
        findUserById(targetId, function (err, doc) {
            if (!err && doc) {
                var index = userIds.indexOf( targetId );

                var tempAvatarId = doc.avatarId ? doc.avatarId : 0;
                var retObj = {
                    'userId'         : targetId,
                    'thisWeekCount'  : thisWeekRankCahe[index].thisWeekCount,
                    'nickname'       : doc.nickname,
                    'avatarId'       : tempAvatarId,
                    'rank'           : index + 1
                };

                lastWeekData.push( retObj );
                return cb1(null);
            } else {
                return cb1(new CSError(errno.MONGO_FIND_FAIL, "没有该用户."));
            }
        });
    },
        function( ) {
            RankList.findOneAndUpdate(
                {
                },
                {
                    $set: {
                        weekCountList : lastWeekData
                    }
                },
                {
                    new: true,
                    upsert: true
                },
                function (err, doc) {
                    var log = err? err : "setLastWeekRank success.";
                    logger.error("setLastWeekRank:", log);
                });
    });

}

/*
 * 刷新上周排行榜
 * 每周一零点刷新上周排行榜
 */
exports.refreshLastWeekRankByTimer = function( ){

    logger.debug( "refreshLastWeekRankByTimer ------------ 1" );
    var mondayTime = getMondayStamp();
    var curTime    = new Date();
    var sevenDay   = 7 * 24* 3600 * 1000;
    var timerSec   = sevenDay - ( curTime.getTime() - mondayTime );
    setTimeout( function(){
            setLastWeekRank();

            setInterval( function(){
                    setLastWeekRank();
                },
            sevenDay
            );
    },
    timerSec );

}