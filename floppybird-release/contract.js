/*
对战模式：
步骤：
1、OnSetSmart OnDeleteSmart 统计当前参与用户数量
2、在弹出界面选择游戏方案，对战模式或者排名模式，对战模式需填入对方的账号，竞赛金额，和想说的话
3、提交，然后等待 contract 确认，24h有效，期间记录最高分，超过24h如果有人应战则对战，对比两人24h内提交的最高分，24h到时，比较并确定输赢。
4、

难度渐变

对战：
1、需获取所有当前连接到samrt的账户，做出列表，包括对方名字，历史最佳成绩。
2、选择对方账号，发送信息，对方的窗口会弹出提示，然后可以选择接受与否，接受直接开战，开战就是玩 X 局 X-1 胜，对方应战前可以随时向合约转0币取回。
3、管子长短采用随机布置，增加不确定性。
4、adv推荐机制，推荐者可以持续获得参与游戏者的赢币的10%，被推荐者管子数自动乘以120%，推荐者必须比被推荐者小200以上。
5、

竞技：

StateFormat:
{
    PrevNum:uint,       //前一个账号
    NextNum:uint,       //后一个账号
    adv: uint,          //推荐人必须比自己的账号的早七天
    highScore: uint,    //永久记录历史最高分，仅合约使用
    curScore:uint,      //当局成绩
    gameMode: byte,     //对战模式0，群殴模式1
    betCoins: uint,     //对赌金额，仅适用于对战模式
    VSNum: uint,        //对站方账号
    joinBlock:uint,     //加入时的block号码，以便确认是否群殴游戏模式下是否能退出游戏
    gameTimes:uint32,   //一段时间内玩的次数
    curBlock:uint,      //只有合约账号使用该字段，用于记录当前合约时间，保证每天一局
    HTMLBlock:uint,     //用于更换界面
    HTMLTr:uint16,      //用于更换界面
}
*/
//{PrevNum:uint,NextNum:uint,adv:uint,highScore:uint,curScore:uint,gameMode: byte,betCoins: uint,VSNum: uint,joinBlock:uint,gameTimes:uint32,curBlock:uint,HTMLBlock:uint,HTMLTr:uint16}

function OnGet() { //set new html page
    SetNewPage();
}

function OnDeleteSmart() {
    var myState = ReadState(context.Account.Num);
    if (!myState.gameFinish) { //如果游戏没有结束禁止退出
        throw "You can only delete this smart contract after game over";
        Delete(context.Account.Num);
    }
}

"public"

function SetNewPage() {
    var BaseNum = context.Smart.Account;
    if (context.FromNum === context.Smart.Owner && context.Account.Num === BaseNum &&
        context.Description.substr(0, 1) === "{") {
        var CurItem = ReadState(BaseNum);
        var Data = JSON.parse(context.Description);
        CurItem.HTMLBlock = Data.HTMLBlock;
        CurItem.HTMLTr = Data.HTMLTr;
        WriteState(CurItem);
        Event("Set new HTML  to: " + CurItem.HTMLBlock + "/" + CurItem.HTMLTr);
        return;
    }
}

"public"

function Delete(CurItem) {
    if (CurItem.PrevNum) {
        var PrevItem = ReadState(CurItem.PrevNum);
        PrevItem.NextNum = CurItem.NextNum;
        WriteState(PrevItem);
    }
    if (CurItem.NextNum) {
        var NextItem = ReadState(CurItem.NextNum);
        NextItem.PrevNum = CurItem.PrevNum;
        WriteState(NextItem);
    }

    CurItem.PrevNum = 0;
    CurItem.NextNum = 0;
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