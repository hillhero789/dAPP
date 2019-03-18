/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram: https://web.telegram.org/#/im?p=@terafoundation
*/


function SendPay(Data)
{
    Data.cmd = "pay";
    SendData(Data);
};

function SetStorage(Key,Value)
{
    var Data = {cmd:"setstorage", Key:Key, Value:Value};
    SendData(Data);
};

function GetStorage(Key,F)
{
    var Data = {cmd:"getstorage", Key:Key};
    SendData(Data, F);
};

function SetCommon(Key,Value)
{
    var Data = {cmd:"setcommon", Key:Key, Value:Value};
    SendData(Data);
};

function GetCommon(Key,F)
{
    var Data = {cmd:"getcommon", Key:Key};
    SendData(Data, F);
};

function GetInfo(F)
{
    var Data = {cmd:"DappInfo", AllAccounts:ALL_ACCOUNTS};
    SendData(Data, F);
};

function Call(Account,MethodName,Params,F)
{
    var Data = {cmd:"DappCall", MethodName:MethodName, Params:Params, Account:Account};
    SendData(Data, F);
};

function SendCall(Account,MethodName,Params,FromNum)
{
    if(!INFO.WalletCanSign)
    {
        SetError("Pls, open wallet");
        return 0;
    }
    var Data = {cmd:"DappSendCall", MethodName:MethodName, Params:Params, Account:Account, FromNum:FromNum};
    SendData(Data);
    return 1;
};

function GetWalletAccounts(F)
{
    var Data = {cmd:"DappWalletList"};
    SendData(Data, F);
};

function GetAccountList(Params,F)
{
    var Data = {cmd:"DappAccountList", Params:Params};
    SendData(Data, F);
};

function GetSmartList(Params,F)
{
    var Data = {cmd:"DappSmartList", Params:Params};
    SendData(Data, F);
};

function GetBlockList(Params,F)
{
    var Data = {cmd:"DappBlockList", Params:Params};
    SendData(Data, F);
};

function GetTransactionList(Params,F)
{
    var Data = {cmd:"DappTransactionList", Params:Params};
    SendData(Data, F);
};

function DappSmartHTMLFile(Smart,F)
{
    var Data = {cmd:"DappSmartHTMLFile", Params:{Smart:Smart}};
    SendData(Data, F);
};

function DappBlockFile(BlockNum,TrNum,F)
{
    var Data = {cmd:"DappBlockFile", Params:{BlockNum:BlockNum, TrNum:TrNum}};
    SendData(Data, F);
};

function SetStatus(Str)
{
    SendData({cmd:"SetStatus", Message:Str});
};

function SetError(Str)
{
    SendData({cmd:"SetError", Message:Str});
};

function SetLocationPath(Str)
{
    SendData({cmd:"SetLocationHash", Message:Str});
};

function OpenLink(Str)
{
    SendData({cmd:"OpenLink", Message:Str});
};

function ComputeSecret(PubKey,F,Account)
{
    if(!INFO.WalletCanSign)
    {
        SetError("Pls, open wallet");
        return 0;
    }
    if(!Account && USER_ACCOUNT.length)
        Account = USER_ACCOUNT[0].Num;
    if(typeof PubKey === "number")
    {
        var AccNum = PubKey;
        GetAccountList({StartNum:AccNum, CountNum:1}, function (Err,Arr)
        {
            if(Err)
            {
                SetError(Err);
            }
            else
            {
                SendData({cmd:"ComputeSecret", Account:Account, PubKey:Arr[0].PubKey.data}, F);
            }
        });
    }
    else
    {
        SendData({cmd:"ComputeSecret", Account:Account, PubKey:PubKey}, F);
    }
};

function CheckInstall()
{
    SendData({cmd:"CheckInstall"});
};

function SendTransaction(Body,TR,SumPow,F)
{
    SetError("Cannt SEND TR: " + JSON.stringify(TR));
};

function CurrencyName(Num)
{
    var Name = MapCurrency[Num];
    if(!Name)
    {
        GetSmartList({StartNum:Num, CountNum:1, TokenGenerate:1}, function (Err,Arr)
        {
            if(Err || Arr.length === 0)
                return ;
            var Smart = Arr[0];
            Name = GetTokenName(Smart.Num, Smart.ShortName);
            MapCurrency[Smart.Num] = Name;
        });
        Name = GetTokenName(Num, "");
    }
    return Name;
};
var SendCountUpdate = 0;

function FindAllCurrency()
{
    SendCountUpdate++;
    GetSmartList({StartNum:8, CountNum:100, TokenGenerate:1}, function (Err,Arr)
    {
        SendCountUpdate--;
        if(Err)
            return ;
        for(var i = 0; i < Arr.length; i++)
        {
            var Smart = Arr[i];
            if(!MapCurrency[Smart.Num])
            {
                var Name = GetTokenName(Smart.Num, Smart.ShortName);
                MapCurrency[Smart.Num] = Name;
            }
        }
    });
};

function GetFilePath(Path)
{
    if(window.PROTOCOL_SERVER_PATH && Path.indexOf("file/"))
    {
        if(Path.substr(0, 1) !== "/")
            Path = "/" + Path;
        Path = window.PROTOCOL_SERVER_PATH + Path;
    }
    return Path;
};

function GetParamsFromPath(Name)
{
    if(!OPEN_PATH)
        return undefined;
    var arr = OPEN_PATH.split("&");
    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i].indexOf(Name + "=") === 0)
        {
            return arr[i].split("=")[1];
        }
    }
};

function GetState(AccNum,F,FErr)
{
    SendCountUpdate++;
    GetAccountList({StartNum:AccNum, CountNum:1}, function (Err,Arr)
    {
        SendCountUpdate--;
        if(!Err && Arr.length)
        {
            var Item = Arr[0].SmartState;
            if(Item)
            {
                F(Item);
                return ;
            }
        }
        if(FErr)
        {
            FErr();
            return ;
        }
    });
};
var glMapF = {};
var glKeyF = 0;

function SendData(Data,F)
{
    if(!window.parent)
        return ;
    if(F)
    {
        glKeyF++;
        Data.CallID = glKeyF;
        glMapF[glKeyF] = F;
    }
    window.parent.postMessage(Data, "*");
};

function OnMessage(event)
{
    var Data = event.data;
    if(!Data || typeof Data !== "object")
        return ;
    var CallID = Data.CallID;
    var cmd = Data.cmd;
    if(CallID)
    {
        var F = glMapF[CallID];
        if(F)
        {
            delete Data.CallID;
            delete Data.cmd;
            switch(cmd)
            {
                case "getstorage":
                case "getcommon":
                    F(Data.Key, Data.Value);
                    break;
                case "DappCall":
                    F(Data.Err, Data.RetValue);
                    break;
                case "DappInfo":
                    F(Data.Err, Data);
                    break;
                case "DappWalletList":
                case "DappAccountList":
                case "DappSmartList":
                case "DappBlockList":
                case "DappTransactionList":
                    F(Data.Err, Data.arr);
                    break;
                case "DappBlockFile":
                case "DappSmartHTMLFile":
                    F(Data.Err, Data.Body);
                    break;
                case "ComputeSecret":
                    F(Data.Result);
                    break;
                default:
                    console.log("Error cmd: " + cmd);
            }
            delete glMapF[CallID];
        }
    }
    else
    {
        switch(cmd)
        {
            case "History":
                var eventEvent = new CustomEvent("History", {detail:Data});
                window.dispatchEvent(eventEvent);
                break;
            case "OnEvent":
                if(window.OnEvent)
                {
                    window.OnEvent(Data);
                }
                var eventEvent = new CustomEvent("Event", {detail:Data});
                window.dispatchEvent(eventEvent);
        }
    }
};

function OpenRefFile(Str)
{
    var Param = ParseFileName(Str);
    if(Param.BlockNum)
        DappBlockFile(Param.BlockNum, Param.TrNum, function (Err,Body)
        {
            document.write(Body);
        });
    else
    {
        OpenLink(Str);
    }
};

function SaveToStorageByArr(Arr)
{
    SetStorage("VerSave", "1");
    for(var i = 0; i < Arr.length; i++)
    {
        var name = Arr[i];
        var Item = $(name);
        if(Item.type === "checkbox")
            SetStorage(name, 0 + Item.checked);
        else
            SetStorage(name, Item.value);
    }
};

function LoadFromStorageByArr(Arr,F,bAll)
{
    GetStorage("VerSave", function (Key,Value)
    {
        if(Value === "1")
        {
            for(var i = 0; i < Arr.length; i++)
            {
                if(i === Arr.length - 1)
                    LoadFromStorageById(Arr[i], F);
                else
                    LoadFromStorageById(Arr[i]);
            }
        }
        if(bAll && F)
            F(0);
    });
};

function LoadFromStorageById(Name,F)
{
    GetStorage(Name, function (Key,Value)
    {
        var Item = document.getElementById(Name);
        if(Item.type === "checkbox")
            Item.checked = parseInt(Value);
        else
            Item.value = Value;
        if(F)
            F(Key, Value);
    });
};
var SendCountDappParams = 0;

function GetDappParams(BNum,TrNum,F,bAll)
{
    if(!BNum)
    {
        if(bAll)
            F();
        return ;
    }
    SendCountDappParams++;
    DappBlockFile(BNum, TrNum, function (Err,Data)
    {
        SendCountDappParams--;
        if(!Err && Data.Type === 135)
        {
            try
            {
                var Params = JSON.parse(Data.Params);
            }
            catch(e)
            {
            }
            if(Params)
            {
                F(Params, Data.MethodName, Data.FromNum);
                return ;
            }
        }
        if(bAll)
            F();
    });
};
document.addEventListener("DOMContentLoaded", function ()
{
    var refs = document.getElementsByTagName("A");
    for(var i = 0, L = refs.length; i < L; i++)
    {
        if(refs[i].href.indexOf("/file/") >= 0)
        {
            refs[i].onclick = function ()
            {
                OpenRefFile(this.href);
            };
        }
    }
});
if(window.addEventListener)
{
    window.addEventListener("message", OnMessage);
}
else
{
    window.attachEvent("onmessage", OnMessage);
}
var SMART = {}, BASE_ACCOUNT = {}, INFO = {}, USER_ACCOUNT = [], USER_ACCOUNT_MAP = {}, OPEN_PATH = "", ACCOUNT_OPEN_NUM = 0;
var ALL_ACCOUNTS = 0;
var WasStartInit = 0, WasStartInit2 = 0;
var eventInfo = new Event("UpdateInfo");

function UpdateDappInfo()
{
    GetInfo(function (Err,Data)
    {
        if(Err)
        {
            return ;
        }
        INFO = Data;
        SMART = Data.Smart;
        BASE_ACCOUNT = Data.Account;
        OPEN_PATH = Data.OPEN_PATH;
        ACCOUNT_OPEN_NUM = ParseNum(OPEN_PATH);
        SetBlockChainConstant(Data);
        USER_ACCOUNT = Data.ArrWallet;
        USER_ACCOUNT_MAP = {};
        for(var i = 0; i < USER_ACCOUNT.length; i++)
            USER_ACCOUNT_MAP[USER_ACCOUNT[i].Num] = USER_ACCOUNT[i];
        if(window.OnInit && !WasStartInit)
        {
            WasStartInit = 1;
            window.OnInit(1);
        }
        else
            if(window.OnUpdateInfo)
            {
                window.OnUpdateInfo();
            }
        if(!WasStartInit2)
        {
            WasStartInit2 = 1;
            var eventInit = new Event("Init");
            window.dispatchEvent(eventInit);
        }
        window.dispatchEvent(eventInfo);
        if(Data.ArrEvent)
            for(var i = 0; i < Data.ArrEvent.length; i++)
            {
                var Item = Data.ArrEvent[i];
                Item.cmd = "OnEvent";
                OnMessage({data:Item});
            }
    });
};
window.addEventListener('load', function ()
{
    if(!window.sha3)
        LoadLib("./JS/sha3.js");
    UpdateDappInfo();
    setInterval(UpdateDappInfo, 1000);
});
