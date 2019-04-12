/*StateFormat:
{
    PrevNum:uint,       //前一个账号
    NextNum:uint,       //后一个账号

    highScore: uint,    //永久记录历史最高分
    curScore:uint,      //当局成绩
    joinBlock:uint,     //加入时的block号码，以便确认是否群殴游戏模式下是否能退出游戏
    gameTimes:uint32,   //一段时间内玩的次数
    curBlock:uint,      //只有合约账号使用该字段，用于记录当前游戏起始区块号，保证固定时间间隔一局
    lastRewardBlock:uint, //记录上次发送奖励的块号
    lastRewardTr:uint16,  //记录上次发送奖励的交易号

    HTMLBlock:uint,     //用于更换界面
    HTMLTr:uint16,      //用于更换界面
}
*/
//{PrevNum:uint,NextNum:uint,highScore:uint,curScore:uint,joinBlock:uint,gameTimes:uint32,curBlock:uint,lastRewardBlock:uint,lastRewardTr:uint16,HTMLBlock:uint,HTMLTr:uint16}
function CheckPermission() {
    if (context.Account.Num !== context.FromNum)
        throw "Access is allowed only from your own account. context.Account.Num:" + context.Account.Num;
}

"public"

function Delete(Params) {
    CheckPermission();
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
    CheckPermission();
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

function payMoney(Params) {
    var GAMEINTERVAL = 82800;
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    var curItem = ReadState(context.FromNum);
    if (curItem.joinBlock <= smartState.curBlock || curItem.joinBlock >= smartState.curBlock + GAMEINTERVAL) {
        Move(context.FromNum, context.Smart.Account, 100.0, "pay for floppy bird.");
        curItem.curScore = 0;
        curItem.joinBlock = context.BlockNum;
        AddToHead(curItem);
        Event({ funcName: "payMoney", toUserId: context.FromNum, isSuccess: true });
    } else {
        Event({ funcName: "payMoney", toUserId: context.FromNum, isSuccess: false });
    }
}

"public"

function AddMe(Params) {
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    var curItem = ReadState(context.FromNum);
    var GAMEINTERVAL = 82800;
    if (curItem.joinBlock < smartState.curBlock + GAMEINTERVAL && curItem.joinBlock > smartState.curBlock) {
        curItem.curScore = curItem.curScore < Params.curScore ? Params.curScore : curItem.curScore;
        if (curItem.highScore < curItem.curScore)
            curItem.highScore = curItem.curScore;
        curItem.gameTimes++;
        AddToHead(curItem);
        Event({ funcName: "AddMe", toUserId: context.FromNum, isSuccess: true });
    } else {
        Event({ funcName: "AddMe", toUserId: context.FromNum, isSuccess: false });
    }
}

"public"

function DoEndRound(Params) {
    CheckPermission();
    var smartState = ReadState(context.Smart.Account);
    if (Params.Players.length) {
        var base = ReadAccount(context.Smart.Account);
        var totalCoins = FLOAT_FROM_COIN(base.Value);
        if (totalCoins == 0) {
            return;
        }
        var luckyOne = Params.luckyPlayerNum;
        Move(context.Smart.Account, context.Smart.Owner, 0.1 * totalCoins, "Floppy bird reward:Dev fee 10%");
        Move(context.Smart.Account, Params.Players[0].id, 0.4 * totalCoins, "Floppy bird reward:1st 40%");
        Move(context.Smart.Account, Params.Players[1].id, 0.2 * totalCoins, "Floppy bird reward:2nd 20%");
        Move(context.Smart.Account, Params.Players[2].id, 0.1 * totalCoins, "Floppy bird reward:3rd 10%");
        Move(context.Smart.Account, luckyOne, 0.2 * totalCoins, "Floppy bird reward:lucky one 20%");
        smartState.lastRewardBlock = context.BlockNum;
        smartState.lastRewardTr = context.TrNum;
        Event({ funcName: "DoEndRound", isReward: true });
    } else {
        Event({ funcName: "DoEndRound", isReward: false });
    }
    smartState.curBlock = Params.curBlock;
    WriteState(smartState);
}

function OnSetSmart() {
    var curItem = ReadState(context.FromNum);
    curItem.PrevNum = 0;
    curItem.NextNum = 0;
    curItem.highScore = 0;
    curItem.curScore = 0;
    curItem.joinBlock = 0;
    curItem.gameTimes = 0;
    curItem.curBlock = 0;
    curItem.lastRewardBlock = 0;
    curItem.lastRewardTr = 0;
    WriteState(curItem);
}

/*
function OnGet() {
    var BaseNum = context.Smart.Account;
    if (context.FromNum === context.Smart.Owner && context.Account.Num === BaseNum &&
        context.Description.substr(0, 1) === "{") {
        var CurItem = ReadState(BaseNum);
        var Data = JSON.parse(context.Description);
        CurItem.HTMLBlock = Data.HTMLBlock;
        CurItem.HTMLTr = Data.HTMLTr;
        WriteState(CurItem);
        Event("Set new HTML  to: " + CurItem.HTMLBlock + "/" + CurItem.HTMLTr);
        return 1;
    }
    return 0;
}*/

function OnDeleteSmart() {
    var GAMEINTERVAL = 82800;
    var curItem = ReadState(context.FromNum);
    if (context.BlockNum <= curItem.joinBlock + GAMEINTERVAL)
        throw "You can quit after " + (curItem.joinBlock + GAMEINTERVAL - context.BlockNum) + " seconds.";
}

function OnCreate() {
    var smartState = ReadState(context.Smart.Account);
    smartState.curBlock = context.BlockNum;
    WriteState(smartState);
}