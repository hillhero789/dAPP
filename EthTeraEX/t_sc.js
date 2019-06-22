/*
state format:
{
    _EthCurBlkNum:uint,  //最近已完成的最后一笔交易的block号
    _EthTxTruncate:uint, //最近已完成的最后一个交易哈希截断
    _truncateTxHash:[uint],   //hash截断，记录最新验证的10笔交易hash截断  6 bytes per item.
    _cutTxHashLen:byte,
    _blkNumOfReq: uint,
    _isPending:byte //判断本次交易是否已经完成
    _isAbnormal:byte    //收到客户端的验证数据与当前记录状态不一致时，记录异常合约锁定
    //所有验证者提交的数据，包括区块号，交易号，TERA地址，金额。
    _TeraAcc:uint 
    _depositAmmount:uint //？？？？
}

1、用户转ETH后，将tx号粘贴至客户端，并将交易哈希提交给t_sc，此客户端为“请求者”
2、t_sc广播验证请求
3、客户端收到验证请求后进行验证，并将结果提交t_sc
4、t_sc对收到的请求进行记录
5、100秒后，请求者，向t_sc确认是否完成验证
6、t_sc收到请求者的确认完成请求后，检查所记录的验证者提交的信息，验证无误则向“请求者”发送TETH，否则锁定请求者账户，并将合约锁定。

t_sc功能：
1、broadcastVerifyReq({txHash, ...})      //广播验证请求到client, 将交易哈希和当前stateformat保存的最近交易验证号发送给客户端
2、broadcastVerifyReq()     //广播验证请求到client
3、receiveConfirmData()     //接收验证数据
4、confirmAndSend()         //确认验证有效性，并发出TERA链上的ETH
5、reward()                 //奖励提交有效数据的client

验证规则：
1、提交验证最低数量 > totalRecNum (10)
2、提交验证必须高度一致，90%，大于90%则数据有效，否则数据无效，所有抵押tera被锁仓，等待DAO审查
3、验证者账号创建时间必须大于某一差距 diffBlkNum
4、验证者账号的的公钥不得一样提高操控多个账号的难度
5、

贡献权重计算：
锁仓量的开五次方根 + 1000/提交验证数据总数 + 信誉值（=累计提交证确次数）

function OnGet() {
    //var smartState = ReadState(context.Smart.Account);
    //smartState.arr.push(123456);
    //WriteState(smartState);
    //Event({ blkNum: context.BlockNum, blkHash: context.BlockHash, ss: smartState });
}
*/
"public"

function checkLastVerify() {

}

function OnCreate() {
    var smartState = ReadState(context.Smart.Account);
    smartState._isPending = false;
}

"public"

function broadcastVerifyReq(Params) {
    var smartState = ReadState(context.Smart.Account);
    if (smartState._isPending) {
        throw "Another tx is still pending, Please try again in a minute."; //仍有交易未完成
        if (context.BlockNum - smartState._blkNumOfReq > 100) { //表示上一笔交易已经超时

        }
    } else {
        smartState._isPending = true;
        smartState._blkNumOfReq = context.BlockNum;
        Event({
            eventName: "verify",
            txHash: Params.transactionHash,
            EthCurBlkNum: smartState._EthCurBlkNum,
            EthTxTruncate: smartState._EthTxTruncate
        });
    }
}

function checkIfDaoOp() {
    var DAO = 0; //DAO合约账号，暂时未确定
    if (context.Account.Num == DAO) {
        //DAO可以执行多种操作，包括解锁账户等等
    }
}

function OnGet() {
    checkIfDaoOp(); //收到转入时检查是否为DAO操作
}