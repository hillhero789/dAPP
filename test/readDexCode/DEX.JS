function GetLib() {
    return require(8); //List-lib
}

function CheckPermission() {
    if (context.Account.Num !== context.FromNum)
        throw "Access is allowed only from your own account.";
}

//EVENT

function OnDeleteSmart() {
    DeleteSmart();
}


function OnSend() {
    var CurItem = ReadState(context.Account.Num);
    if (CurItem.Type === "A" || CurItem.Type === "B") {
        var Rest = context.Account.Value;
        var Value;
        if (CurItem.Type === "A")
            Value = CurItem.Order.Value;
        else
            Value = COIN_FROM_FLOAT(FLOAT_FROM_COIN(CurItem.Order.Value) * CurItem.Order.Price);

        if (Rest.SumCOIN < Value.SumCOIN || (Rest.SumCOIN === Value.SumCOIN && Rest.SumCENT < Value.SumCENT)) {
            throw "Error - amount is locked in order: " + context.Account.Num;
        }
    }
}

function OnGet() {
    CheckSet();
}





//*************************************************
"public"

function DeleteSmart() {
    CheckPermission();
    if (RunNewVer("DeleteSmart"))
        return;

    var CurItem = ReadState(context.Account.Num);
    if (CurItem && CurItem.Order.RefCount > 0)
        throw "Can't remove smart from:" + CurItem.Num + " The item is referenced by other orders."

    DeleteItemInner(CurItem);
}


"public"

function GetOrder(Params) {
    CheckPermission();
    if (RunNewVer("GetOrder", Params))
        return;


    var ShareNum = parseUint(Params.ShareNum);
    var OrderNum = parseUint(Params.OrderNum);
    var Price = parseFloat(Params.Price);
    var Value = parseFloat(Params.Value);

    var CurOrder = ReadState(Params.OrderNum);
    var FromAccount = context.Account;
    var ToAccount = ReadAccount(Params.ToNum);

    if (CurOrder.Order.Price !== Price)
        throw "Different price in order: " + Params.OrderNum;

    if (!Value || Value < 1e-9)
        throw "Value is zero";

    var Amount = Value * CurOrder.Order.Price;
    var Coin1, Coin2;
    if (CurOrder.Type === "A") {
        Coin1 = COIN_FROM_FLOAT(Value);
        Coin2 = COIN_FROM_FLOAT(Amount);
    } else
    if (CurOrder.Type === "B") {
        Coin1 = COIN_FROM_FLOAT(Amount);
        Coin2 = COIN_FROM_FLOAT(Value);
    } else {
        throw "Error type in order: " + Params.OrderNum;
    }


    //state
    var Coin = COIN_FROM_FLOAT(Value);
    if (!SUB(CurOrder.Order.Value, Coin))
        throw "Not enough value in order: " + Params.OrderNum;
    ADD(CurOrder.Order.CompleteValue, Coin);

    if (ISZERO(CurOrder.Order.Value)) {
        DeleteItemInner(CurOrder, 0)
        CurOrder.Type = "C"; //completed
    }
    WriteState(CurOrder);

    var ShareItem = ReadState(ShareNum);
    if (ShareItem.Type !== "S" || ShareItem.SaleCurrency !== CurOrder.SaleCurrency || ShareItem.GetCurrency !== CurOrder.GetCurrency)
        throw "Error share item num: " + ShareItem.Num;

    ADD(ShareItem.Order.CompleteValue, Coin);

    //history of trades
    if (ShareItem.HTMLBlock === Params.PrevBlock && ShareItem.HTMLTr === Params.PrevTr) {
        ShareItem.HTMLBlock = context.BlockNum;
        ShareItem.HTMLTr = context.TrNum;
    }
    WriteState(ShareItem);

    Move(CurOrder.Num, ToAccount.Num, Coin1, "Part1 order: " + Params.OrderNum);
    Move(FromAccount.Num, CurOrder.Order.GetNum, Coin2, "Part2 order: " + Params.OrderNum);



    Event("GetOrder:" + Params.OrderNum);
}



"public"

function AddShare(Params) {
    CheckPermission();
    if (RunNewVer("AddShare", Params))
        return;

    var SaleCurrency = parseUint(Params.SaleCurrency);
    var GetCurrency = parseUint(Params.GetCurrency);
    var AddNum = parseUint(Params.AddNum);

    var CurItem = ReadState(context.FromNum);
    CheckEmpty(CurItem);

    if (SaleCurrency === GetCurrency)
        throw "Error: SaleCurrency = GetCurrency";

    CurItem.Type = "S";
    CurItem.SaleCurrency = SaleCurrency;
    CurItem.GetCurrency = GetCurrency;

    var lib = GetLib();
    lib.NamedAddToSort("ShareNextNum", AddNum, CurItem, SortShare);
    Event("AddShare num:" + CurItem.Num);
}



"public"

function AddOrder(Params) {
    CheckPermission();
    if (RunNewVer("AddOrder", Params))
        return;

    var CurItem = ReadState(context.FromNum);
    CheckEmpty(CurItem);

    var Type = Params.Type;
    var Price = parseFloat(Params.Price);
    var Value = parseFloat(Params.Value);
    var GetNum = parseUint(Params.GetNum);
    var AddNum = parseUint(Params.AddNum);

    var NameNext;
    if (Type === "A") {
        NameNext = "AskNextNum";
    } else
    if (Type === "B") {
        NameNext = "BidNextNum";
    } else {
        throw "Error order type=" + Type;
    }
    if (!Price)
        throw "Price is zero";
    if (!Value)
        throw "Value is zero";


    var SaleAccount = ReadAccount(context.FromNum);
    var GetAccount = ReadAccount(GetNum);


    var Rest = SaleAccount.Value;
    var Coin;
    if (Type === "A") {
        CurItem.SaleCurrency = SaleAccount.Currency;
        CurItem.GetCurrency = GetAccount.Currency;
        Coin = COIN_FROM_FLOAT(Value);
    } else {
        CurItem.SaleCurrency = GetAccount.Currency;
        CurItem.GetCurrency = SaleAccount.Currency;
        Coin = COIN_FROM_FLOAT(Value * Price);
    }

    if (Rest.SumCOIN < Coin.SumCOIN || (Rest.SumCOIN === Coin.SumCOIN && Rest.SumCENT < Coin.SumCENT)) {
        throw "Insufficient funds in account " + SaleAccount.Num;
    }

    if (GetAccount.Value.Smart !== context.Smart.Num)
        throw "Get account must have the same smart";




    CurItem.Type = Type;
    CurItem.Order.CompleteValue = {};
    CurItem.Order.Value = COIN_FROM_FLOAT(Value);
    CurItem.Order.Price = Price;
    CurItem.Order.GetNum = GetNum;



    var GetItem = ReadState(GetNum);
    if (GetItem.Order.RefCount >= 255)
        throw "A lot of references to the recipient's account."

    GetItem.Order.RefCount++;
    WriteState(GetItem);




    var lib = GetLib();
    lib.NamedAddToSort(NameNext, AddNum, CurItem, SortOrder);
    Event("AddOrder num:" + CurItem.Num);
}



"public"

function DeleteItem() {
    CheckPermission();
    if (RunNewVer("DeleteItem"))
        return;


    var CurItem = ReadState(context.Account.Num);
    DeleteItemInner(CurItem, 1);
}



"public"

function GetList(Params) //for static mode
{
    CheckPermission();
    return RunNewVer("GetList", Params);
}



//LIB
function CheckEmpty(CurItem) {
    if (CurItem.Type !== "" && CurItem.Type !== "C")
        throw "Can't change item: " + CurItem.Num;
}


function DeleteItemInner(CurItem, bWrite) {
    var bWas = 0;
    var lib = GetLib();
    var StrCmd = "DeleteItem";
    if (CurItem.Type === "S") //share item
    {
        if (CurItem.AskNextNum || CurItem.BidNextNum) {
            throw "Can't delete:" + CurItem.Num + " Order list not empty";
        }
        //delete
        if (CurItem.PrevNum) {
            lib.NamedDelete("ShareNextNum", CurItem);
            bWas = 1;
        }
        StrCmd = "DeleteShare";
    } else
    if (CurItem.Type === "A" || CurItem.Type === "B") {
        if (CurItem.Type === "A") {
            lib.NamedDelete("AskNextNum", CurItem);
            StrCmd = "DeleteOrderA";
            bWas = 1;
        } else
        if (CurItem.Type === "B") {
            lib.NamedDelete("BidNextNum", CurItem);
            StrCmd = "DeleteOrderB";
            bWas = 1;
        }

        if (CurItem.Order.GetNum) {
            var GetItem = ReadState(CurItem.Order.GetNum);
            if (GetItem && GetItem.Order.RefCount > 0) {
                GetItem.Order.RefCount--;
                WriteState(GetItem);
            }
        }

    }
    if (bWas)
        Event(StrCmd + " num:" + CurItem.Num);

    if (bWrite) {
        CurItem.Type = "";

        WriteState(CurItem);
    }
}


function SortShare(a, b) {
    if (a.SaleCurrency < b.SaleCurrency)
        return 1;

    if (a.SaleCurrency === b.SaleCurrency && a.GetCurrency < b.GetCurrency)
        return 1;

    return 0;
}

function SortOrder(a, b) {
    if (a.SaleCurrency !== b.SaleCurrency)
        throw "Error Order in SaleCurrency";
    if (a.GetCurrency !== b.GetCurrency)
        throw "Error Order in GetCurrency";

    if (a.Type === "S")
        return 1;

    if (a.Type !== b.Type)
        throw "Error Order Type";


    if (a.Type === "A" && a.Order.Price <= b.Order.Price) {
        return 1;
    }

    if (a.Type === "B" && a.Order.Price >= b.Order.Price) {
        return 1;
    }

    return 0;
}



//support for update new ver
function CheckSet() {
    var BaseNum = context.Smart.Account;
    if (context.FromNum === context.Smart.Owner && context.Account.Num === BaseNum &&
        context.Description.substr(0, 1) === "{") {
        var Data = JSON.parse(context.Description);
        var CurItem = ReadState(BaseNum);
        CurItem.HTMLBlock = Data.HTMLBlock;
        CurItem.HTMLTr = Data.HTMLTr;
        CurItem.Order.GetNum = Data.NewLib;
        WriteState(CurItem);
        Event("Set new HTML  to: " + CurItem.HTMLBlock + "/" + CurItem.HTMLTr);
        return 1;
    }
    return 0;
}

function RunNewVer(MethName, Params) {
    var Base = ReadState(context.Smart.Account);
    if (Base.Order.GetNum) {
        var FList = require(Base.Order.GetNum);
        FList[MethName](Params);
        return 1;
    }
    return 0;
}