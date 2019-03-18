/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram: https://web.telegram.org/#/im?p=@terafoundation
*/

var MIN_VERSION = 903;
var COUNT_BLOCK_PROOF = 300;
var MIN_SUM_POWER = COUNT_BLOCK_PROOF * 35;
var MainServer = undefined;
var MaxConnectedCount = 10;
var MaxTimeConnecting = 3 * 1000;
var StartTimeConnecting = 0;
var ConnectedCount = 0;
var NETWORK = "TERA-MAIN";
var ServerMap = {};
var ServerMainMap = {"127.0.0.1":{"ip":"127.0.0.1", "port":80, "Name":"LOCAL"}, "terafoundation.org":{"ip":"terafoundation.org",
        "port":443, "Name":"TERA", "System":1}, "91.235.136.81":{"ip":"91.235.136.81", "port":80, "Name":"SUPPORT1", "System":1}, "dappsgate.com":{"ip":"dappsgate.com",
        "port":80, "Name":"SUPPORT2", "System":1}, };
var ServerTestMap = {"127.0.0.1":{"ip":"127.0.0.1", "port":80, "Name":"LOCAL"}, "91.235.136.81":{"ip":"91.235.136.81", "port":88,
        "Name":"SUPPORT1", "System":1}, "dappsgate.com":{"ip":"dappsgate.com", "port":88, "Name":"SUPPORT2", "System":1}, };

function StartWebWallet()
{
    if(NETWORK === "TERA-TEST2")
    {
        MIN_SUM_POWER = 0;
        ServerMap = ServerTestMap;
    }
    else
    {
        MIN_SUM_POWER = COUNT_BLOCK_PROOF * 35;
        ServerMap = ServerMainMap;
    }
    $("idNetwork").innerText = NETWORK;
    OnInitWebWallet();
    ConnectWebWallet();
};

function OnInitWebWallet()
{
    var str = localStorage.getItem(NETWORK + "NodesArrayList");
    if(str)
    {
        var arr = JSON.parse(str);
        for(var i = 0; i < arr.length; i++)
        {
            var Item = ServerMap[arr[i].ip];
            if(Item && Item.System)
                continue;
            ServerMap[arr[i].ip] = arr[i];
        }
    }
};

function SaveServerMap()
{
    var arr = [];
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.SumPower >= MIN_SUM_POWER)
        {
            arr.push({ip:Item.ip, port:Item.port});
        }
    }
    localStorage.setItem(NETWORK + "NodesArrayList", JSON.stringify(arr));
};

function SetStatus(Str)
{
    var id = $("idStatus");
    id.innerHTML = Str;
    console.log(id.innerText);
};

function SetError(Str,bNoSound)
{
    SetStatus("<DIV  align='left' style='color:red'><B>" + Str + "</B></DIV>");
};

function ConnectWebWallet()
{
    StartTimeConnecting = Date.now();
    ConnectedCount = 0;
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        Item.SendHandShake = 0;
    }
    SetStatus("Connecting...");
    LoopHandShake();
    setTimeout(LoopWalletInfo, 1500);
};
var Stage = 0;

function LoopHandShake()
{
    Stage++;
    SetStatus("Connecting: " + Stage + "...");
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.SendHandShake || !Item.port)
            continue;
        DoNodeList(Item);
    }
};

function DoNodeList(Item)
{
    console.log(GetProtocolServerPath(Item) + "/GetNodeList");
    if(window.location.protocol === "https:" && Item.port !== 443)
        return ;
    if(Item.port === 443 && IsIPAddres(Item.ip))
        return ;
    SetStatus("Try: " + Item.ip + ":" + Item.port);
    Item.SendHandShake = 1;
    GetData(GetProtocolServerPath(Item) + "/GetNodeList", {}, function (Data)
    {
        if(Data && Data.result && Data.NETWORK === NETWORK && Data.VersionNum >= MIN_VERSION)
        {
            ConnectedCount++;
            Item.GetHandShake = 1;
            Item.BlockChain = Data.BlockChain;
            SetStatus("Get: " + Item.ip + ":" + Item.port);
            var bWas = 0;
            for(var i = 0; i < Data.arr.length; i++)
            {
                var Node = Data.arr[i];
                if(!ServerMap[Node.ip] && Node.port)
                {
                    ServerMap[Node.ip] = Node;
                    console.log("New: " + Node.ip + ":" + Node.port);
                    bWas = 1;
                }
            }
            if(bWas && ConnectedCount < MaxConnectedCount && new Date() - StartTimeConnecting < MaxTimeConnecting)
            {
                setTimeout(LoopHandShake, 100);
            }
        }
    });
};

function LoopWalletInfo()
{
    SetStatus("Get wallets info...");
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.port)
        {
            DoWalletInfo(Item);
        }
    }
    setTimeout(FindLider, 500);
};

function DoWalletInfo(Item)
{
    if(window.location.protocol === "https:" && Item.port !== 443)
        return ;
    if(Item.port === 443 && IsIPAddres(Item.ip))
        return ;
    Item.StartTime = Date.now();
    Item.SendWalletInfo = 1;
    GetData(GetProtocolServerPath(Item) + "/GetCurrentInfo", {BlockChain:1}, function (Data)
    {
        if(Data && Data.result && Data.BlockChain && Data.NETWORK === NETWORK)
        {
            Item.Name = Data.NODES_NAME;
            Item.GetWalletInfo = 1;
            Item.DeltaTime = new Date() - Item.StartTime;
            Item.BlockChain = Data.BlockChain;
            Item.MaxNumBlockDB = Data.MaxNumBlockDB;
            console.log("Get: " + Item.ip + ":" + Item.port + " delta=" + Item.DeltaTime);
        }
    });
};

function FindLider()
{
    MainServer = undefined;
    var Arr = [];
    var MapSumPower = {};
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.GetWalletInfo && Item.BlockChain)
        {
            var arr = Item.BlockChain;
            if(arr.data)
                arr = arr.data;
            Item.SumPower = CalcPowFromBlockChain(arr);
            if(Item.SumPower < MIN_SUM_POWER)
            {
                console.log("Skip: " + Item.ip + ":" + Item.port + " SumPower(" + Item.SumPower + ") < MIN_SUM_POWER(" + MIN_SUM_POWER + ")");
                continue;
            }
            if(!MapSumPower[Item.SumPower])
                MapSumPower[Item.SumPower] = 0;
            MapSumPower[Item.SumPower]++;
            Arr.push(Item);
        }
    }
    var Max = 0, MaxKey;
    for(var key in MapSumPower)
    {
        if(MapSumPower[key] >= Max)
        {
            Max = MapSumPower[key];
            MaxKey = parseInt(key);
        }
    }
    Arr.sort(function (a,b)
    {
        return a.DeltaTime - b.DeltaTime;
    });
    for(var i = 0; i < Arr.length; i++)
    {
        var Item = Arr[i];
        if(Item.SumPower === MaxKey)
        {
            SetStatus("Find " + Item.ip + ":" + Item.port + " with pow=" + Item.SumPower + " " + Max + "  ping=" + Item.DeltaTime);
            MainServer = Item;
            SaveServerMap();
            break;
        }
    }
    OnFindServer();
};

function CalcPowFromBlockChain(BufRead)
{
    var Sum = 0;
    var Arr = GetBlockArrFromBuffer(BufRead);
    if(Arr.length === COUNT_BLOCK_PROOF)
    {
        for(var i = 0; i < Arr.length; i++)
        {
            Sum += Arr[i].Power;
        }
    }
    return Sum;
};
