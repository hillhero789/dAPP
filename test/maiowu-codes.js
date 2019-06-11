avalon.filters.toFixed = function(number, fixed) {
    return number == 0 ? '0.0' : number.toFixed(fixed);
}

function formatSecond(result) {
    const t = Math.floor(result / 86400);
    const h = Math.floor((result / 3600) % 24);
    const m = Math.floor((result / 60) % 60);
    const s = Math.floor(result % 60);
    result = s + "秒";
    if (m > 0) {
        result = m + "分" + result;
    }
    if (h > 0) {
        result = h + "时" + result;
    }
    if (t > 0) {
        result = t + "天" + result;
    }
    return result;
}
(function() {
    var calc = {
        Add: function(arg1, arg2) {
            arg1 = arg1.toString(), arg2 = arg2.toString();
            var arg1Arr = arg1.split("."),
                arg2Arr = arg2.split("."),
                d1 = arg1Arr.length == 2 ? arg1Arr[1] : "",
                d2 = arg2Arr.length == 2 ? arg2Arr[1] : "";
            var maxLen = Math.max(d1.length, d2.length);
            var m = Math.pow(10, maxLen);
            var result = Number(((arg1 * m + arg2 * m) / m).toFixed(maxLen));
            var d = arguments[2];
            return typeof d === "number" ? Number((result).toFixed(d)) : result;
        }
    };
    window.Calculate = calc;
}());
var api = {
    handle: async function(url, method = 'POST', body = {}) {
        var config = {
            method: method,
            mode: "cors",
            redirect: "follow"
        }
        if ('GET|HEAD'.indexOf(method) == -1) {
            config.body = JSON.stringify(body);
        }
        var resp = await fetch('https://teraapi.sixi.com' + url, config);
        return await resp.json();
    },
    get: async function(url, body = {}) {
        return await this.handle(url, 'GET', body);
    },
    post: async function(url, body = {}) {
        return await this.handle(url, 'POST', body);
    },
    Send: async function(data = {
        FromID: 0,
        FromPrivKey: "",
        ToID: 0,
        Amount: 0,
        Description: "Auto Transfer From " + FromID,
        Wait: 1
    }) {
        return await this.post('/api/v2/Send', data);
    },
    GetBalance: async function(id) {
        return await api.post('/api/v2/GetBalance', { "AccountID": id });
    },
    list: async function(key) {
        return await api.post('/GetAccountListByKey', { "Key": key, "AllData": 1 });
    },
    history: async function(account, count = 20, NextPos = 0) {
        var config = {
            AccountID: account,
            Count: count,
            GetDescription: 1
        }
        if (NextPos) {
            config.NextPos = NextPos;
        }
        return await this.post('/api/v2/GetHistoryTransactions', config);
    }
};
var todayTimestamp = new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0, 0, 0, 0)).getTime() / 1000 - 1530446400;
var yesterdayTimestamp = new Date(new Date(new Date().setDate(new Date().getDate())).setHours(0, 0, 0, 0)).getTime() / 1000 - 1530446400;
var yesterdayZeroTimestamp = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0)).getTime() / 1000 - 1530446400;
var lastWeekZeroTimestamp = new Date(new Date(new Date().setDate(new Date().getDate() - 7)).setHours(0, 0, 0, 0)).getTime() / 1000 - 1530446400;
var main = avalon.define({
    $id: 'i',
    auto_refresh: false,
    loading: false,
    publicKey: '',
    privateKey: '',
    fromID: '',
    fromAmount: '',
    transferID: '',
    list: [],
    selfAccount: [],
    logs: [],
    summer: {
        Today: 0,
        Yesterday: 0,
        Range: 0
    },
    keydown: function(event) {
        if (event.key == 'Enter' && !main.loading) {
            main.load();
        }
    },
    load: async function() {
        main.summer = {
            Today: 0,
            Yesterday: 0,
            Range: 0
        }
        main.loading = true;
        if (!isNaN(Number(main.publicKey))) {
            var result = await api.GetBalance(main.publicKey);
            main.publicKey = result.PubKey;
        }
        location.hash = main.publicKey;
        var temp = await api.list(main.publicKey);
        var result = temp.arr;
        for (item of result) {
            main.selfAccount.push(item.Num);
            item.Amount = (item.Value.SumCOIN * 1000000000 + item.Value.SumCENT) / 1000000000;
            item.Summer = {
                Today: 0,
                Yesterday: 0,
                Range: 0
            };
            item.Latest = {
                Time: 0,
                TimeStr: '0',
                From: '',
                FromStr: '',
                Amount: 0
            };
        }
        main.list = result;
        clipboard = new ClipboardJS('.teraaccount');
        var tempList = [];
        for (item of result) {
            tempList.push(new Promise(async function(resolve, reject) {
                resolve(await main.summerAccount(item));
            }));
        }
        await Promise.all(tempList);
        for (item of result) {
            main.summer.Today = Calculate.Add(main.summer.Today, item.Summer.Today);
            main.summer.Yesterday = Calculate.Add(main.summer.Yesterday, item.Summer.Yesterday);
        }
        main.loading = false;
        if (main.auto_refresh) {
            setTimeout(main.load, 10000);
        }
    },
    summerAccount: async function(item) {
        var firstHistory;
        var NextPos = 0;
        var Count = 100;
        do {
            var history = await api.history(item.Num, Count, NextPos);
            Count = Math.min(Count * 2, 10000);
            for (hisItem of history.History) {
                NextPos = hisItem.NextPos;
                if (hisItem.Direct == '-' || main.selfAccount.indexOf(hisItem.CorrID) !== -1) { continue; }
                hisItem.Amount = (hisItem.SumCOIN * 1000000000 + hisItem.SumCENT) / 1000000000
                if (!firstHistory) {
                    firstHistory = hisItem;
                    item.Latest.Time = new Date().getTime() / 1000 - 1530446400 - firstHistory.BlockNum;
                    item.Latest.TimeStr = formatSecond(item.Latest.Time) + '前';
                    item.Latest.From = firstHistory.CorrID;
                    item.Latest.FromStr = !firstHistory.CorrID ? '来自矿脉' : '来自账户 ' + item.Latest.From;
                    item.Latest.Amount = hisItem.Amount;
                }
                if (hisItem.BlockNum < yesterdayZeroTimestamp || hisItem.BlockNum > todayTimestamp) { return; }
                if (hisItem.BlockNum > yesterdayTimestamp) {
                    item.Summer.Today = Calculate.Add(item.Summer.Today, hisItem.Amount);
                } else if (hisItem.BlockNum > yesterdayZeroTimestamp) {
                    item.Summer.Yesterday = Calculate.Add(item.Summer.Yesterday, hisItem.Amount);
                }
            }
        } while (NextPos);
    },
    loadRange: async function() {
        main.loading = true;
        main.summer.Range = 0;
        var tempList = [];
        for (item of main.list) {
            tempList.push(new Promise(async function(resolve, reject) {
                resolve(await main.summerAccountByTimeRange(item, lastWeekZeroTimestamp, yesterdayTimestamp));
            }));
        }
        await Promise.all(tempList);
        for (item of main.list) {
            main.summer.Range = Calculate.Add(main.summer.Range, item.Summer.Range);
        }
        main.loading = false;
    },
    summerAccountByTimeRange: async function(item, startTime, endTime) {
        item.Summer.Range = 0;
        var NextPos = 0;
        var Count = 100;
        do {
            var history = await api.history(item.Num, Count, NextPos);
            Count = Math.min(Count * 2, 10000);
            for (hisItem of history.History) {
                NextPos = hisItem.NextPos;
                if (hisItem.Direct == '-' || main.selfAccount.indexOf(hisItem.CorrID) !== -1 || hisItem.BlockNum > endTime) { continue; }
                if (hisItem.BlockNum < startTime) { return; }
                hisItem.Amount = (hisItem.SumCOIN * 1000000000 + hisItem.SumCENT) / 1000000000
                item.Summer.Range = Calculate.Add(item.Summer.Range, hisItem.Amount);
            }
        } while (NextPos);
    },
    addLog: function(text) {
        main.logs.push(new Date().toLocaleString() + ' ' + text)
    },
    transfer: async function() {
        SetStorage('TeraTransferID', main.transferID);
        if (!main.list.length) {
            alert('You Must Load Account Info First!');
            return;
        }
        if (main.selfAccount.indexOf(Number(main.transferID)) < 0) {
            alert('You Only Use Self Account To Transfer...')
            return;
        }
        main.loading = true;
        var startTime = new Date().getTime();
        main.addLog('Start Transfer Please Waiting...');
        for (item of main.list) {
            if (item.Num == main.transferID) {
                continue;
            }
            if (main.fromID && item.Num != main.fromID) {
                continue;
            }
            if (item.Amount == 0) { continue; }
            var transferAmount = main.fromAmount || item.Amount;
            main.loading = true;
            main.addLog('Start Transfer ' + item.Num + ' Amount ' + transferAmount + ' To ' + main.transferID + ' Please Waiting...');
            var result = await api.Send({
                FromID: item.Num,
                FromPrivKey: main.privateKey,
                ToID: Number(main.transferID),
                Amount: transferAmount,
                Description: "Auto Transfer From ID " + item.Num + " Use Tera Transfer Function...",
                Wait: 1
            });
            main.load();
            main.addLog('Transfer Finish Result: ' + (result.result == 1 ? 'Success...' : 'Failed...'));
        }
        main.addLog('Finish Transfer Cost ' + (new Date().getTime() - startTime) / 1000 + ' Sec...');
        main.loading = false;
    },
    savePrivateKey: function() {
        SetStorage('TeraPrivateKey', main.privateKey);
    }
});
main.publicKey = location.hash.substr(1) || main.publicKey;
GetStorage("TeraPrivateKey", function(Key, Value) { main.privateKey = Value ? Value : main.privateKey; });
GetStorage("TeraTransferID", function(Key, Value) { main.transferID = Value ? Value : main.transferID; });
if (main.publicKey) {
    main.load();
}