var logger = require('./logger');
var sqlog  = require('./sqlog');

function userInfo(userId, account, nickname, mobile, channel, csVersion) {
    var sqlStr = 'call p_user_info(?,?,?,?,?,?)';
    var inParams = [userId, account, nickname, mobile || "", channel || "", csVersion];
    sqlog.query(sqlStr, inParams, function(err) {
        if (err) {
            logger.error("user info:", err, inParams);
        }
    });
}

function userLogin(userId, regDate, channel) {
    var sqlStr = 'call p_user_login(?,?,?)';
    var inParams = [userId, regDate, channel];
    sqlog.query(sqlStr, inParams, function(err) {
        if (err) {
            logger.error("user login:", err);
        }
    });
}

function rptCcu(type, serverName, serverId, channel, ccu) {
    var sqlStr = 'call p_game_ccu(?,?,?,?,?)';
    var inParams = [type, serverName, serverId, channel, ccu];
    sqlog.query(sqlStr, inParams, function (err) {
        if (err) {
            logger.error("game ccu:", err);
        }
    });
}

function goodsChanged(gameName, roomId, userId, channel, goodsName,
                      changeType, changeNote, changeCount, leftCount, changeRt) {
    if (!gameName) {
        gameName = "";
    }

    var sqlStr = 'call p_user_goods_change(?,?,?,?,?,?,?,?,?,?)';
    var inParams = [gameName, roomId, userId, channel, goodsName,
        changeType, changeNote, changeCount, leftCount, changeRt];
    sqlog.query(sqlStr, inParams, function (err) {
        if (err) {
            logger.error("user goods change:", err, 'in params:', inParams);
        }
    });
}

function grabBanker(innings, userId, nickname, roomName, result,
                    insertStatus, principal) {
    var sqlStr = 'call p_grab_banker(?,?,?,?,?,?,?)';
    var inParams = [innings, userId, nickname, roomName, result,
        insertStatus, principal];
    sqlog.query(sqlStr, inParams, function (err) {
        if (err) {
            logger.error("grab banker:", err, 'in params:', inParams);
        }
    });
}

function stakeChips(innings, userId, nickname, chips, result,
                    insertStatus, betType) {
    var sqlStr = 'call p_stake_chips(?,?,?,?,?,?,?)';
    var inParams = [innings, userId, nickname, chips, result,
        insertStatus, betType];
    sqlog.query(sqlStr, inParams, function (err) {
        if (err) {
            logger.error("stake chips:", err, 'in params:', inParams);
        }
    });
}

function gameResult(innings, banker, bankerRoom, principal, bankerTax,
                    guestTax, largeChips, littleChips, maxChips, minChips,
                    dice1, dice2, dice3, result, diceCount) {
    var sqlStr = 'call p_game_result(?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?)';
    var inParams = [innings, banker, bankerRoom, principal, bankerTax,
        guestTax, largeChips, littleChips, maxChips, minChips,
        dice1, dice2, dice3, result, diceCount];
    sqlog.query(sqlStr, inParams, function (err) {
        if (err) {
            logger.error("game result:", err, 'in params:', inParams);
        }
    });
}

function userGameResult(innings, userId, nickname, dice1, dice2,
                        dice3, result, diceCount, betType, winChips) {
    var sqlStr = 'call p_user_game_result(?,?,?,?,?,?,?,?,?,?)';
    var inParams = [innings, userId, nickname, dice1, dice2,
        dice3, result, diceCount, betType, winChips];
    sqlog.query(sqlStr, inParams, function (err) {
        if (err) {
            logger.error("user game result:", err, 'in params:', inParams);
        }
    });
}

function userMatchResult(matchId, matchName, runId, userId, place) {
    var sqlStr = 'call p_user_match_result(?,?,?,?,?)';
    var inParams = [matchId, matchName, runId, userId, place];
    sqlog.query(sqlStr, inParams, function(err) {
        if (err) {
            logger.error("user match result:", err, 'in params:', inParams);
        }
    });
}

module.exports = {
    userInfo: userInfo,
    userLogin: userLogin,
    rptCcu : rptCcu,
    goodsChanged: goodsChanged,
    grabBanker: grabBanker,
    stakeChips: stakeChips,
    gameResult: gameResult,
    userGameResult: userGameResult,
    userMatchResult: userMatchResult
};