jQuery.noConflict();
var allScoreArr = new Array();
var endBlock = 0;
var playersArr = new Array();
var smartCurBlock = 0;
var GAMEINTERVAL = 120;
var currentChainBlock = 0;
var hasPay = false;
var isUpdating = false;

function listLastReward(Params) {
    console.log("listLastReward");
    GetAccountList({
        StartNum: BASE_ACCOUNT.Num,
        CountNum: 1
    }, function(Err1, Arr1) {
        if (!Err1) {
            if (Arr1[0].SmartState.lastRewardBlock != 0) {
                GetTransactionList({
                    BlockNum: Arr1[0].SmartState.lastRewardBlock,
                    StartNum: Arr1[0].SmartState.lastRewardTr,
                    CountNum: 1
                }, function(Err2, Arr2) {
                    if (!Err2) {
                        var Params = JSON.parse(JSON.parse(Arr2[0].Script).Params);
                        var rewardPlayers = Params.Players;
                        var luckId = Params.luckyPlayerNum;
                        var rewardRateArr = [0.4, 0.2, 0.1];
                        var totalCoins = 0;
                        $("idListReward").innerHTML = "Ranking:<br>";
                        if (rewardPlayers[0].id == rewardPlayers[1].id && rewardPlayers[1].id == rewardPlayers[2].id) {
                            totalCoins = 100;
                        } else {
                            if (rewardPlayers[0].id == rewardPlayers[1].id) {
                                totalCoins = 200;
                            } else {
                                totalCoins = rewardPlayers.length * 100;
                            }
                        }
                        for (var i = 0; i < 3; i++) {
                            $("idListReward").innerHTML += "ID:" + rewardPlayers[i].id + " name:" + rewardPlayers[i].name + " score:" + rewardPlayers[i].score + " bonus:" + (totalCoins * rewardRateArr[i]) + "<br>";
                        }
                        $("idListReward").innerHTML += "Lucky player:<br>" + luckId + " bonus:" + (totalCoins * 0.2);
                    }
                });
            }
        }
    });
}

function listPlayers() {
    if (playersArr.length) {
        playersArr.sort(function(a, b) {
            return b.score - a.score;
        });
        $("idListPlayers").innerHTML = "Current players:<br>";
        for (var i in playersArr) {
            $("idListPlayers").innerHTML += "ID:" + playersArr[i].id + " name:" + playersArr[i].name + " score:" + playersArr[i].score + "<br>";
        }
    }
}

function payAndStartGame() {
    SendCall($("idUser").value, "payMoney", {}, $("idUser").value);
}

function updateGame() {
    console.log("updateGame:")
    GetInfo(function(Err, Data) {
        if (!Err) {
            currentChainBlock = Data.CurBlockNum;
            GetAccountList({
                StartNum: BASE_ACCOUNT.Num,
                CountNum: 1
            }, function(Err, Arr) {
                if (!Err) {
                    console.log("updateGame:Arr");
                    console.log(Arr);
                    smartCurBlock = Arr[0].SmartState.curBlock;
                    endBlock = smartCurBlock + GAMEINTERVAL;
                    updateDblList(BASE_ACCOUNT.Num);
                }
            });
        }
    });
    listLastReward();
}

function updateDblList(itemNum) {
    console.log("updateDblList:")
    GetAccountList({
        StartNum: itemNum,
        CountNum: 1
    }, function(Err, Arr) {
        var nextItemNum = 0;
        if (!Err) {
            nextItemNum = Arr[0].SmartState.NextNum;
            if (Arr[0].SmartState.Num != BASE_ACCOUNT.Num) {
                var i = 0;
                var tmpPlayer;
                tmpPlayer = playersArr.find(function(item, idx) {
                    i = idx;
                    return item.id == Arr[0].SmartState.Num;
                });
                if (tmpPlayer == undefined) {
                    playersArr.push({
                        id: Arr[0].SmartState.Num,
                        name: Arr[0].Name,
                        score: parseInt(Arr[0].SmartState.curScore),
                        joinBlock: Arr[0].SmartState.joinBlock
                    });
                } else {
                    playersArr[i].score = playersArr[i].score < parseInt(Arr[0].SmartState.curScore) ? parseInt(Arr[0].SmartState.curScore) : playersArr[i].score;
                }
                if (Arr[0].SmartState.joinBlock < smartCurBlock || Arr[0].SmartState.joinBlock > endBlock) {
                    SendCall($("idUser").value, "Delete", Arr[0].SmartState, $("idUser").value);
                }
            }

            if (nextItemNum)
                updateDblList(nextItemNum);
            else {
                listPlayers();
                isUpdating = false;
                if (currentChainBlock >= endBlock) {
                    while (!((endBlock += GAMEINTERVAL) > currentChainBlock));
                    smartCurBlock = endBlock - GAMEINTERVAL;
                    sendDoEndRound(smartCurBlock);
                    playersArr.splice(0, playersArr.length);
                }
            }
        } else {
            alert(Err);
        }
    });
}

function randomN(minN, maxN) {
    return parseInt(Math.random() * (maxN - minN + 1) + minN, 10);
}

function sendDoEndRound(paraSmartCurBlock) {
    var luckId = 0;
    if (playersArr.length != 0) {
        playersArr.sort(function(a, b) {
            return b.score - a.score;
        });
        while (playersArr.length < 3) {
            playersArr.unshift(playersArr[0])
        }
        var plyLen = playersArr.length;
        var rndNum = randomN(0, playersArr.length - 1);
        console.log(plyLen + " " + rndNum);
        luckId = playersArr[randomN(0, playersArr.length - 1)].id;
    }
    console.log("sendCall DoEndRound Param:")
    console.log({
        curBlock: paraSmartCurBlock,
        Players: playersArr,
        luckyPlayerNum: luckId
    });
    SendCall($("idUser").value, "DoEndRound", {
        curBlock: paraSmartCurBlock,
        Players: playersArr,
        luckyPlayerNum: luckId
    }, $("idUser").value);
}

function summitScore() {
    console.log("summitScore:");
    var AccFrom = $("idUser").value;
    var myScore = score;
    if (hasPay) {
        SendCall(AccFrom, "AddMe", {
            curScore: myScore,
            joinBlock: currentChainBlock,
        }, AccFrom);
    }
}

function listPlayersScore() {
    console.log("listPlyaersScore:")
    var i;
    if (playersArr.length) {
        playersArr.sort(function(a, b) {
            return b.score - a.score;
        });
        $("idListPlayers").innerHTML = "";
        for (i in playersArr) {
            $("idListPlayers").innerHTML += playersArr[i].id + " " + playersArr[i].name + " " + playersArr[i].score + "<br>";
        }
    }
}

window.addEventListener('Event', function(e) {
    Data = e.detail;
    if (Data.Error)
        SetError(Data.Description);
    else {
        if ("funcName" in Data.Description) {
            switch (Data.Description.funcName) {
                case "payMoney":
                    console.log("Event from payMoney");
                    hasPay = true;
                    $("idStartBtn").innerText = "Play";
                    break;
                case "AddMe":
                    console.log("Event from AddMe");
                    break;
                case "DoEndRound":
                    console.log("Event from DoEndRound");
                    break;
                case "Delete":
                    console.log("Event from Delete");
                    break;
            }
            console.log(Data.Description);
            if (!isUpdating) {
                isUpdating = true;
                setTimeout(updateGame, 5000);
            }

        }
    }
});

var SaveIdArr = ["idUser"];
var TotalCount = 0;
ALL_ACCOUNTS = 1;
window.addEventListener('Init', function() {
    CheckInstall();
    UpdateInfo();
});
window.addEventListener('UpdateInfo', UpdateInfo);

function UpdateInfo() {}

function SaveValues() {
    SaveToStorageByArr(SaveIdArr);
}

function LoadValues() {
    LoadFromStorageByArr(SaveIdArr, function() {
        UpdateFillUser();
    });
}

function UpdateFillUser() {
    var Arr = [];
    for (var i = 0; i < USER_ACCOUNT.length; i++) {
        var Item = USER_ACCOUNT[i];
        var Value = {
            value: Item.Num,
            text: Item.Num + "." + Item.Name + "  " + SUM_TO_STRING(Item.Value, Item.Currency, 1)
        };
        Arr.push(Value);
    }
    FillSelect("idUser", Arr);
}
window.addEventListener('Init', function() {
    LoadValues();
});
window.addEventListener('UpdateInfo', UpdateFillUser);