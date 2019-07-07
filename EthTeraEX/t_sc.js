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
/*
待完成功能:
1、增加将异常信息写入到区块的功能，并且将区块连接起来，所有异常不锁定合约，只是跳过该待验证信息
2、增加自动发送TETH而不是TERA的功能
3、增加通过dapp调用以太坊合约deposit函数的功能。（需输入私钥）
*/

function CheckPermission() {
    if (context.Account.Num !== context.FromNum)
        throw "Access is allowed only from your own account. context.Account.Num:" + context.Account.Num;
}

function sendCoins(smartState) {
    //send {_depositCoin,_depositCent} to _TeraAcc
    var val = { SumCOIN: smartState._depositCoin, SumCENT: smartState._depositCent };
    if (smartState._TeraAcc != 0) {
        Move(context.Smart.Account, smartState._TeraAcc, FLOAT_FROM_COIN(val), "t_sc");
    }

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
    //验证接收到的数据，包括tera账号及金额，第一次收到时，记录信息到smartstate中，后续再收到则与smartstate中的记录进行比较，如不一致，则将信息记录到异常链表
    //一致则_recVerifyCount++，当当前tera区块号与_blkNumOfReq之差小于某一值时，且所有提交的信息无不一致时，转相应金额的TETH至相应的TERA账号
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    if (smartState._isAbnormal) {
        throw "State abnormal, please wait for the next round";
    }
    var clientState = ReadState(context.Account.Num);
    if (smartState._isPending && context.BlockNum - smartState._blkNumOfReq <= 100) {
        if (clientState._blkNumOfReq <= smartState._blkNumOfReq + 100 && clientState._blkNumOfReq >= smartState._blkNumOfReq) {
            throw "repeated commit is forbidden"; //重复提交可能是恶意行为，可增加锁定账户的操作。
        }
        if (smartState._recVerifyCount == 0) { //首次接收的数据，不立即改_EthCurBlkNum、_EthTxTruncate，先临时存放，等到确认数据有效后再正式保存
            smartState._TeraAcc = Params.TeraAccNum;
            smartState._depositCoin = Params.coinNum;
            smartState._depositCent = Params.centNum;
            smartState._EthCurBlkNum_t = Params.EthCurBlkNum; //先临时保存
            smartState._EthTxTruncate_t = Params.EthTxTruncate; //先临时保存
            smartState._recVerifyCount++;
            smartState._totalRecVerifyCount++;

            clientState._blkNumOfReq = context.BlockNum;
            clientState._verifyCount++;
            WriteState(clientState);
        } else {
            if (smartState._TeraAcc == Params.TeraAccNum && smartState._depositCoin == Params.coinNum && smartState._depositCent == Params.centNum && smartState._EthCurBlkNum_t == Params.EthCurBlkNum && smartState._EthTxTruncate_t == Params.EthTxTruncate) {
                //收到的信息与之前记录的信息一致
                if (smartState._TeraAcc != 0) { //TeraAcc为0，代表此提交仅为防止作恶提交，无需统计，避免刷分
                    smartState._recVerifyCount++;
                    smartState._totalRecVerifyCount++;

                    clientState._blkNumOfReq = context.BlockNum;
                    clientState._verifyCount++;
                    WriteState(clientState);
                }
            } else { //信息不一致，将信息发送到客户端，让客户端调用sendcall，将异常信息写入区块。
                smartState._isAbnormal = true;
                smartState._abnormalInfoRecordAcc = context.FromNum;
                Event({ //上一个验证尚未完成
                    eventName: "receiveDataErr",
                    preBlk: smartState._abnormalInfoBlkHead,
                    preTr: smartState._abnormalInfoTrHead,
                    msgToAcc: context.FromNum,
                    msg: {
                        commitAccountNum: context.FromNum,
                        smart_TeraAcc: smartState._TeraAcc,
                        smart_coin: smartState._depositCoin,
                        smart_cent: smartState._depositCent,
                        smart_ethBlk: smartState._EthCurBlkNum_t,
                        smart_ethTr: smartState._EthTxTruncate_t,
                        receive_TeraAcc: Params.TeraAccNum,
                        receive_coin: Params.coinNum,
                        receive_cent: Params.centNum,
                        receive_ethBlk: Params.EthCurBlkNum,
                        receive_ethTr: Params.EthTxTruncate
                    }
                });
            }
        }
        WriteState(smartState);
    } else {
        throw "No data to be verified.";
    }
}

function checkIfLastEnd(smartState) {
    var minVerifyCount = 2;
    if (context.BlockNum - smartState._blkNumOfReq > 100) { //表示当前交易验证时间窗口已结束。
        //将_isPending置false，同时判断是否存在异常，如无异常，则发送TETH至账户
        if (smartState._recVerifyCount >= minVerifyCount && !smartState._isAbnormal) { //验证次数满足最低要求，则认为结果可以接受
            smartState._EthCurBlkNum = smartState._EthCurBlkNum_t; //确认无异常正式修改
            smartState._EthTxTruncate = smartState._EthTxTruncate_t; //确认无异常正式修改
            sendCoins(smartState);
        } else {
            //验证失败，需将信息记录到区块
        }
        smartState._isAbnormal = false; //上一局已结束，清楚异常标记
        smartState._isPending = false;
        smartState._TeraAcc = 0; //转账后恢复待验证数据至初始状态
        smartState._depositCoin = 0;
        smartState._depositCent = 0;
        smartState._recVerifyCount = 0;
        WriteState(smartState);
        return true;
    } else {
        return false;
    }
}

"public"

function broadcastVerifyReq() { //如果目前不在验证中，则广播消息到所有客户端
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);

    if (checkIfLastEnd(smartState)) { //上一个验证已结束
        smartState._isPending = true;
        smartState._blkNumOfReq = context.BlockNum; //记录发起验证请求时的Tera块号
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

"public"

function addErrInfoBlk(Params) {
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    if (smartState._abnormalInfoRecordAcc == context.FromNum) {
        smartState._abnormalInfoBlkHead = context.BlockNum;
        smartState._abnormalInfoTrHead = context.TrNum;
        WriteState(smartState);
        Event({
            eventName: "info",
            msg: Params
        });
    }
}


function OnCreate() { //初始化smartState
    var smartState = ReadState(context.Smart.Account);
    smartState._EthCurBlkNum = 5940326;
    smartState._EthTxTruncate = "1254f5";
    smartState._blkNumOfReq = 0;
    smartState._isPending = false;
    smartState._isAbnormal = false
    smartState._recVerifyCount = 0;
    smartState._totalRecVerifyCount = 0;
    smartState._TeraAcc = 0;
    smartState._depositCoin = 0;
    smartState._depositCent = 0;
    smartState._abnormalInfoBlkHead = 0;
    smartState._abnormalInfoTrHead = 0;
    smartState._abnormalInfoRecordAcc = 0;
    WriteState(smartState);
}

function OnGet() {
    //if (checkIfDaoOp()) { 
    //收到转入时检查是否为DAO操作,如非DAO转账，则拒绝
    //DAO通过检查异常块的信息，发现发送异常信息的客户端，可将其锁定。
    //也可将无异常的客户端解锁
    //}
}

function OnSetSmart() {
    //主网DAPP应该值允许TETH账号绑定，测试网暂时用TERA代替TETH
    //检查最近若干个账号的账号创建时间间隔，禁止创建时间过近的账户绑定合约
}

function OnDeleteSmart() {
    //throw "Can not delete smart!"; //一旦绑定，禁止解绑，调试时允许解绑
}