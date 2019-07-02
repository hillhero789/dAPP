var sms = {
    Type: str1,
    SaleCurrency: uint32,
    GetCurrency: uint32,
    PrevNum: uint,
    ShareNextNum: uint,
    AskNextNum: uint,
    BidNextNum: uint,
    Order: {
        Value: { SumCOIN: uint, SumCENT: uint32 },
        CompleteValue: { SumCOIN: uint, SumCENT: uint32 },
        Price: double,
        GetNum: uint,
        RefCount: byte
    },
    HTMLBlock: uint,
    HTMLTr: uint16
}