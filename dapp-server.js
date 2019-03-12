"public"
function rewardTera(Params)
{
    var Reward=1;
    Reward = Params.Ammount;
    var AccNum=context.Smart.Account;
    var Base=ReadAccount(AccNum);
    if(Base.Value.SumCOIN<Reward)
    {
        throw "No money"
    }

    if(context.FromNum)//money for seller
    {
        Move(AccNum,context.FromNum,COIN_FROM_FLOAT(Reward),"Click");
    }

    Event({Amount:context.Value});

}