function OnGet()
{
    var myDate = new Date();
    var today = myDate.getDate();
    var myState = ReadState(context.FromNum);
    myState.lastEarnDate = today;
    myState.hasEarn = 

    WriteState({lastEarnDate: today, }, context.FromNum);
}

function OnCreate()
{
 	WriteState({lastEarnDate:1000000},context.Smart.Account);
}


{lastEarnDate:uint,hasEarn:uint}




function OnGet()
{
    var myState = ReadState(context.Account.Num);
    if(context.ToNum != context.Smart.Account)
    {
        if(myState.lastEarnBlock < context.BlockNum)
        {
            myState.hasEarn = 0;
            myState.lastEarnBlock = context.BlockNum + 86400;
        }

        if(myState.lastEarnBlock >= context.BlockNum && myState.hasEarn>=10)
        {
            throw "You have earn too much within 24h!"
        }
        else
        {
            Move(context.Smart.Account, context.FromNum, 1, "click and earn");
        }

        WriteState(myState, context.FromNum);
        Event(myState);
    }
}

function OnCreate()
{
 	WriteState({lastEarnBlock:0,hasEarn:0},context.Smart.Num);
}




"public"
function earnTera(Params)
{
    var myState = ReadState(context.Account.Num);
    if(myState.lastEarnBlock < context.BlockNum)
    {
        myState.hasEarn = 0;
        myState.lastEarnBlock = context.BlockNum + 86400;
    }

    if(myState.lastEarnBlock >= context.BlockNum && myState.hasEarn>=10)
    {
        throw "You have earn too much within 24h!"
    }
    else
    {
        Move(context.Smart.Account, context.FromNum, 1, "click and earn");
        myState.hasEarn += 1;
    }

    WriteState(myState, context.Account.Num);
    Event(myState);
}