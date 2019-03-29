/*StateFormat:
{
    PrevNum:uint,       //前一个账号
    NextNum:uint,       //后一个账号

    highScore: uint,    //永久记录历史最高分
    curScore:uint,      //当局成绩
    joinBlock:uint,     //加入时的block号码，以便确认是否群殴游戏模式下是否能退出游戏
    gameTimes:uint32,   //一段时间内玩的次数
    curBlock:uint,      //只有合约账号使用该字段，用于记录当前游戏起始区块号，保证固定时间间隔一局

    adv: uint,          //推荐人必须比自己的账号的早七天
    gameMode: byte,     //对战模式0，群殴模式1
    betCoins: uint,     //对赌金额，仅适用于对战模式
    VSNum: uint,        //对站方账号
    
    HTMLBlock:uint,     //用于更换界面
    HTMLTr:uint16,      //用于更换界面
}
*/
//{PrevNum:uint,NextNum:uint,adv:uint,highScore:uint,curScore:uint,gameMode: byte,betCoins: uint,VSNum: uint,joinBlock:uint,gameTimes:uint32,curBlock:uint,HTMLBlock:uint,HTMLTr:uint16}
"public"

function Delete(Params) {
    Event("delete:PrevNum" + Params.PrevNum);
    Event("delete:NextNum" + Params.NextNum);
    if (Params.PrevNum) {
        var PrevItem = ReadState(Params.PrevNum);
        PrevItem.NextNum = Params.NextNum;
        WriteState(PrevItem);
    }
    if (Params.NextNum) {
        var NextItem = ReadState(Params.NextNum);
        NextItem.PrevNum = Params.PrevNum;
        WriteState(NextItem);
    }

    Params.PrevNum = 0;
    Params.NextNum = 0;
}

"public"

function AddToHead(NewItem) {
    var HeadNum = context.Smart.Account;
    var HeadItem = ReadState(HeadNum);
    if (HeadItem.NextNum !== NewItem.Num) {
        Delete(NewItem);

        if (HeadItem.NextNum) {
            var NextItem = ReadState(HeadItem.NextNum);
            NextItem.PrevNum = NewItem.Num;
            WriteState(NextItem);

            NewItem.NextNum = HeadItem.NextNum;
        }
        HeadItem.NextNum = NewItem.Num;
        WriteState(HeadItem);
        NewItem.PrevNum = HeadNum;
    }
    WriteState(NewItem);
}

"public"

function AddMe(Params) {
    var curItem = ReadState(context.FromNum);
    curItem.curScore = Params.curScore;
    curItem.joinBlock = Params.joinBlock;
    Event(Params.curScore);
    if (curItem.highScore < curItem.curScore)
        curItem.highScore = curItem.curScore;
    curItem.joinBlock = context.BlockNum;
    curItem.gameTimes++;
    AddToHead(curItem);
    Event("newItemAdded" + " context.Account.Num:" + context.Account.Num + " addme, curItem:");
    Event(curItem);
}

"public"

function UpdateSmartCurBlock(Params) {
    var smartState = ReadState(context.Smart.Account);
    smartState.curBlock = context.BlockNum;
    WriteState(smartState);
    Event(smartState);
}

function OnSetSmart() {
    var curItem = ReadState(context.FromNum);
    curItem.PrevNum = 0;
    curItem.NextNum = 0;
    curItem.adv = 0;
    curItem.highScore = 0;
    curItem.curScore = 0;
    curItem.joinBlock = 0;
    curItem.gameTimes = 0;
    curItem.curBlock = 0;
    WriteState(curItem);
    Event(ReadState(context.Smart.Account));
    //Event("context.FromNum:" + context.FromNum);
}

function OnDeleteSmart() {
    //判断是否仍在当局，如在则禁止退出
}

function OnCreate() {
    var smartState = ReadState(context.Smart.Account);
    smartState.curBlock = context.BlockNum;
    WriteState(smartState);
}