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

"public"

function AddMe(params) {
    var curItem = ReadState(context.FromNum);
    curItem.Score = params.Score;
    AddToHead(curItem);
    Event("newItemAdded" + " context.Account.Num:" + context.Account.Num + "addme, curItem:");
    Event(curItem);
}

function OnSetSmart() {
    var curItem = ReadState(context.FromNum);
    curItem.PrevItem = 0;
    curItem.NextItem = 0;
    curItem.Score = 0;
    WriteState(curItem);
    Event("context.FromNum:" + context.FromNum);
}