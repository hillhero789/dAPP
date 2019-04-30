function OnSend() {
    var toAcc;
    toAcc = ReadAccount(context.ToNum); //读取接收方的账号信息
    if (context.Description != toAcc.Name) //判断接收方的名字是否与转账时在描述区输入的名字一致
        throw "Error. Input correct account name in description, please!" //如果不一致，则抛出异常，使转账失败
}