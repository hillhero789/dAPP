function CheckPermission() {
    if (context.Account.Num !== context.FromNum)
        throw "Access is allowed only from your own account. context.Account.Num:" + context.Account.Num;
}

function sendCoins(smartState) {
    var val = { SumCOIN: smartState._depositCoin, SumCENT: smartState._depositCent };
    //send(smartState._TeraAcc, FLOAT_FROM_COIN(val), "t_sc");
    Event({
        eventName: "info",
        msg: smartState
    });
}

function checkIfLastEnd(smartState) {
    var minVerifyCount = 2;
    if (smartState._isPending) {
        if (context.BlockNum - smartState._blkNumOfReq > 100) {
            if (smartState._recVerifyCount >= minVerifyCount) {
                sendCoins(smartState);
                smartState._isPending = false;
                smartState._TeraAcc = 0;
                smartState._depositCoin = 0;
                smartState._depositCent = 0;
                smartState._recVerifyCount = 0;
                WriteState(smartState);

                var clientState = ReadState(context.Account.Num);
                clientState._verifyCount++;
                WriteState(clientState);
                return true;
            }
        } else {
            return false;
        }
    }
    return true;
}

function checkIfDaoOp() {
    var DAO = 0;
    if (context.Account.Num == DAO) {
        return;
    } else {
        throw "Only DAO account can send to this contract!";
    }
}

"public"

function verifyReceiveData(Params) {
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    if (smartState._isAbnormal) {
        throw "The smart contract is locked due to abnormal state!";
    }
    if (smartState._isPending) {
        if (smartState._TeraAcc == 0) {
            smartState._TeraAcc = Params.TeraAccNum;
            smartState._depositCoin = Params.coinNum;
            smartState._depositCent = Params.centNum;
            smartState._EthCurBlkNum = Params.EthCurBlkNum;
            smartState._EthTxTruncate = Params.EthTxTruncate;
            smartState._recVerifyCount++;
            WriteState(smartState);

            var clientState = ReadState(context.Account.Num);
            clientState._verifyCount++;
            WriteState(clientState);
        } else {
            if (smartState._TeraAcc == Params.TeraAccNum && smartState._depositCoin == Params.coinNum && smartState._depositCent == Params.centNum && smartState._EthCurBlkNum == Params.EthCurBlkNum && smartState._EthTxTruncate == Params.EthTxTruncate) {
                smartState._recVerifyCount++;
                WriteState(smartState);
            } else {
                smartState._isAbnormal = true;
            }
        }
    } else {
        throw "No data to be verified.";
    }
}

"public"

function broadcastVerifyReq() {
    var smartState = ReadState(context.Smart.Account);
    if (smartState._isAbnormal) {
        throw "The smart contract is locked due to abnormal state!";
    }
    if (checkIfLastEnd(smartState)) {
        smartState._isPending = true;
        smartState._blkNumOfReq = context.BlockNum;
        WriteState(smartState);
        Event({
            eventName: "verify",
            EthCurBlkNum: smartState._EthCurBlkNum,
            EthTxTruncate: smartState._EthTxTruncate,
        });
    } else {
        Event({
            eventName: "info",
            msg: "Another verification is still pending, Please try again in a minute."
        });
    }
}

function OnCreate() {
    var smartState = ReadState(context.Smart.Account);
    smartState._EthCurBlkNum = 1;
    smartState._EthTxTruncate = "852d8ecad7";
    smartState._blkNumOfReq = 0;
    smartState._isPending = false;
    smartState._isAbnormal = false
    smartState._recVerifyCount = 0;
    smartState._TeraAcc = 0;
    smartState._depositCoin = 0;
    smartState._depositCent = 0;
    WriteState(smartState);
}