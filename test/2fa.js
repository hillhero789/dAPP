function OnSend()
{
    var myState;
    if(context.Description)
    {
        myState = ReadState(context.Account.Num);
        myState.sig = "ok";
        WriteState(myState, context.Account.Num);
        throw "sig";
    }
}

function OnSend()
{
    var shaVal = sha("tmp");
    Event({hashVal: shaVal});
}