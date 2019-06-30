/*
1、用户转ETH后，将tx号粘贴至客户端，并将交易哈希提交给t_sc，此客户端为“请求者”
2、t_sc广播验证请求
3、客户端收到验证请求后进行验证，并将结果提交t_sc
4、t_sc对收到的请求进行记录
5、100秒后，请求者，向t_sc确认是否完成验证
6、t_sc收到请求者的确认完成请求后，检查所记录的验证者提交的信息，验证无误则向“请求者”发送TETH，否则锁定请求者账户，并将合约锁定。



t_sc功能：
1、broadcastVerifyReq({txHash, ...})      //广播验证请求到client, 将交易哈希和当前stateformat保存的最近交易验证号发送给客户端
2、broadcastVerifyReq()     //广播验证请求到client
3、verifyReceiveData()     //接收验证数据
4、confirmAndSend()         //确认验证有效性，并发出TERA链上的ETH
5、reward()                 //奖励提交有效数据的client

验证规则：
1、提交验证最低数量 > totalRecNum (10)
2、提交验证必须高度一致，90%，大于90%则数据有效，否则数据无效，所有抵押tera被锁仓，等待DAO审查
3、验证者账号创建时间必须大于某一差距 diffBlkNum
4、验证者账号的的公钥不得一样提高操控多个账号的难度
5、

*/
var stateFormat = {
    _EthCurBlkNum: uint, //最近已完成的最后一笔交易的block号
    _EthTxTruncate: str10, //最近已完成的最后一个交易哈希截断
    _blkNumOfReq: uint, //记录“请求者”发起验证请求时的Tera块号
    _isPending: byte, //判断本次充值是否已经完成
    _isAbnormal: byte, //收到客户端的验证数据与当前记录状态不一致时，记录异常合约锁定
    _recVerifyCount: uint16, //收到的验证次数
    _verifyCount: uint16, //用户提交次数
    //以下是用于记录验证者提交的数据，包括本次充值的TERA地址及充值金额。
    _TeraAcc: uint,
    _depositCoin: uint, //此数量为发放的TETH数量的整数部分
    _depositCent: uint //此数量为发放的TETH数量的小数部分，最小为十亿分之一（1GWEI），小于此数的充值被忽略
};



function CheckPermission() {
    if (context.Account.Num !== context.FromNum)
        throw "Access is allowed only from your own account. context.Account.Num:" + context.Account.Num;
}

function sendCoins(smartState) {
    //send {_depositCoin,_depositCent} to _TeraAcc
    var val = { SumCOIN: smartState._depositCoin, SumCENT: smartState._depositCent };
    send(smartState._TeraAcc, FLOAT_FROM_COIN(val), "t_sc");
}

function checkIfLastEnd(smartState) {
    var minVerifyCount = 2;
    if (smartState._isPending) {
        if (context.BlockNum - smartState._blkNumOfReq > 100) { //表示当前交易验证时间窗口已结束。
            //将_isPending置false，同时判断是否存在异常，如无异常，则发送TETH至账户
            if (smartState._recVerifyCount >= minVerifyCount) { //验证次数满足最低要求，则认为结果可以接受
                sendCoins(smartState);
                smartState._isPending = false;
                smartState._TeraAcc = 0; //转账后恢复待验证数据至初始状态
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

function checkIfDaoOp() { //检查是否为DAO操作
    var DAO = 0; //DAO合约账号，暂时未确定
    if (context.Account.Num == DAO) {
        return;
    } else {
        throw "Only DAO account can send to this contract!";
    }
}

"public"

function verifyReceiveData(Params) {
    //验证接收到的数据，包括tera账号及金额，第一次收到时，记录信息到smartstate中，后续再收到则与smartstate中的记录进行比较，如不一致，则锁仓
    //一致则_recVerifyCount++，当当前tera区块号与_blkNumOfReq之差小于某一值时，且所有提交的信息无不一致时，转相应金额的TETH至相应的TERA账号
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    if (smartState._isAbnormal) {
        throw "The smart contract is locked due to abnormal state!";
    }
    if (smartState._isPending) {
        if (smartState._TeraAcc == 0) { //如果_TeraAcc为0表示本次提交为首次提交的数据，则对
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
                //收到的信息与之前记录的信息一致
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

function broadcastVerifyReq() { //如果目前不在验证中，则广播消息到所有客户端
    var smartState = ReadState(context.Smart.Account);
    if (smartState._isAbnormal) {
        throw "The smart contract is locked due to abnormal state!";
    }
    if (checkIfLastEnd(smartState)) { //上一个验证已结束
        smartState._isPending = true;
        smartState._blkNumOfReq = context.BlockNum; //记录“请求者”发起验证请求时的Tera块号
        WriteState(smartState);
        Event({
            eventName: "verify",
            EthCurBlkNum: smartState._EthCurBlkNum,
            EthTxTruncate: smartState._EthTxTruncate,
        });
    } else {
        Event({ //上一个验证尚未完成
            eventName: "info",
            msg: "Another verification is still pending, Please try again in a minute."
        });
    }
}

function OnCreate() { //初始化smartState
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

function OnGet() {
    if (checkIfDaoOp()) { //收到转入时检查是否为DAO操作,如非DAO转账，则拒绝

    }
}

function OnSetSmart() {
    //主网DAPP应该值允许TETH账号绑定，测试网暂时用TERA代替TETH
    //检查最近若干个账号的账号创建时间间隔，禁止创建时间过近的账户绑定合约
}

function OnDeleteSmart() {
    //throw "Can not delete smart!"; //一旦绑定，禁止解绑，调试时允许解绑
}