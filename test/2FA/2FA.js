function OnSend() {
    var accState = ReadState(context.Account.Num);
    if (context.FromNum == context.ToNum && FLOAT_FROM_COIN(context.Value) == 0) {

        var sigOk;
        var pwd;
        var pwdHash;
        sigOk = false;
        pwd = context.Description.substr(3, context.Description.length);
        if (pwd = "")
            throw "You didn't input a valid password.";
        pwdHash = sha(pwd);
        switch (context.Description.substr(0, 3)) {
            case "CRT":
                if (!accState.sigBlockNum) {
                    for (var i = 0; i < pwdHash.length; i++)
                        accState.hash[i] = pwdHash[i];
                    accState.sigBlockNum = context.BlockNum;
                    WriteState(accState, context.Account.Num);
                    Event(accState);
                    throw "2FA created, please keep your password safely!";
                } else
                    throw "Rejected";
                break;
            case "MOD":
                break;
            case "SIG":
                sigOk = true;
                for (var i = 0; i < pwdHash.length; i++)
                    if (accState.hash[i] != pwdHash[i])
                        sigOk = false;
                if (!sigOk) {
                    throw "Wrong password!";
                } else {
                    accState.sigBlockNum = context.BlockNum;
                    throw "SIG successful! You can send TERA within 5 minutes.";
                }
                break;
        }
    }
    if (context.BlockNum > accState.sigBlockNum + 300)
        throw "Please use SIG*** to sign first";
}

function OnSetSmart() {
    var accState = ReadState(context.Account.Num);
    for (var i = 0; i < accState.hash.length; i++)
        accState.hash[i] = 0;
    accState.sigBlockNum = 0;
    WriteState(accState, context.Account.Num);
}

function OnDeleteSmart() {
    if (!isSig())
        throw "please send 'SIG' command first!";
}

function isSig() {
    return true;
}

//{hash:arr32,sigBlockNum:uint}