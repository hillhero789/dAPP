/*
    {Mutex:uint}
*/
"public"

function setMutex(Params) {
    var smartState = ReadState(context.Smart.Account);
    smartState.Mutex = smartState.Mutex + 1;
    WriteState(smartState);
    Event({ Mutex: smartState.Mutex });
}

function OnCreate() {
    var smartState = ReadState(context.Smart.Account);
    smartState.Mutex = 1;
    WriteState(smartState);
}