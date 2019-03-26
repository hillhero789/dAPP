//{ PrevNum: uint, NextNum: uint, State: byte, InfoBlock: uint, InfoTr: uint16, HTMLBlock: uint, HTMLTr: uint16 }

function GetLib() {
    return require(8); //List-lib
}

function OnDeleteSmart() {
    var CurItem = ReadState(context.Account.Num);
    if (CurItem.PrevNum) {
        var lib = GetLib();
        lib.Delete(CurItem);
        Event("Delete item: " + CurItem.InfoBlock + "/" + CurItem.InfoTr);
    }
}

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
        return;
    }

}

"public"

function AddMessage(Params) {
    var CurItem = ReadState(context.FromNum);
    CurItem.InfoBlock = context.BlockNum;
    CurItem.InfoTr = context.TrNum;

    SetMessage(CurItem);
}

function SetMessage(CurItem) {
    var lib = GetLib();
    lib.AddToHead(CurItem);
    Event("AddMessage to item: " + CurItem.InfoBlock + "/" + CurItem.InfoTr);
}


//List-library v1.0

//**********************************************************************************************************************
//{PrevNum:uint, NextNum:uint}

//add new item to the head
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



//add new item to the tail
"public"

function AddToTail(ToNum, NewItem) {

    if (NewItem.NextNum || NewItem.PrevNum)
        throw "Error AddItem: Account was use";

    var PrevItem = ReadState(ToNum);
    if (PrevItem.NextNum)
        throw "Error AddItem: NextNum was use";

    PrevItem.NextNum = NewItem.Num;
    WriteState(PrevItem);

    NewItem.PrevNum = ToNum;
    WriteState(NewItem);
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

//**********************************************************************************************************************
//{XXXPrevNum:uint,YYYPrevNum:uint,ZZZPrevNum:uint,NextNum:uint}

//add new item after current position and check sort
//TODO: add some iteration for test item
"public"

function NamedAddToSort(NameNext, ToNum, NewItem, FSort) {

    if (NewItem[NameNext] || NewItem.PrevNum)
        throw "Error AddItem: Account was use";

    var PrevItem = ReadState(ToNum);

    if (!FSort(PrevItem, NewItem)) //check sort
        throw "Error sort prev-item position";

    if (!PrevItem[NameNext]) {
        //add to tail
        PrevItem[NameNext] = NewItem.Num;
        WriteState(PrevItem);

        NewItem.PrevNum = PrevItem.Num;
        WriteState(NewItem);
    } else {
        var NextItem = ReadState(PrevItem[NameNext]);

        if (!FSort(NewItem, NextItem)) //check sort
            throw "Error sort next-item position";

        //add to middle
        PrevItem[NameNext] = NewItem.Num;
        WriteState(PrevItem);

        NewItem.PrevNum = PrevItem.Num;
        NewItem[NameNext] = NextItem.Num;
        WriteState(NewItem);

        NextItem.PrevNum = NewItem.Num;
        WriteState(NextItem);
    }
}

"public"

function NamedDelete(NameNext, CurItem) {
    if (CurItem.PrevNum) {
        var PrevItem = ReadState(CurItem.PrevNum);
        PrevItem[NameNext] = CurItem[NameNext];
        WriteState(PrevItem);
    }
    if (CurItem[NameNext]) {
        var NextItem = ReadState(CurItem[NameNext]);
        NextItem.PrevNum = CurItem.PrevNum;
        WriteState(NextItem);
    }

    CurItem.PrevNum = 0;
    CurItem[NameNext] = 0;
}







"public"

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
}

//{PrevNum:uint,NextNum:uint,State:byte, InfoBlock:uint,InfoTr:uint16, HTMLBlock:uint,HTMLTr:uint16}