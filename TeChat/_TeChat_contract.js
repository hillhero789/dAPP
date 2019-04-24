/*
    {

    }

    要实现的功能：
    一、群管理功能：
        1、建立群组功能：免费或少量建群费、群标志、群人数上限？
        2、群主可以设置进群是否需要验证，可以设置一些条件，比如账号必须小于多少，余额必须多于多少等。
        3、打赏功能
        4、踢人功能
        5、公告功能
        6、群文件功能

    二、聊天功能：
        1、字数限制1k字符
        2、能发表情（先上传一些常用表情，然后可以直接调用）
        3、可以发链接，"> <"字符自动转换，避免出现异常显示
        4、用户头像，有一些类似qq一样的预设头像，也可以自己上传
        5、发幸运红包
        6、私聊功能
        7、加入群组
        8、加好友
    
    smart format:
    {
        HTMLBlock:uint,
        HTMLTr:uint16,
        Num:uint,
        userPicBlk:uint,
        userPicTr:uint16,
        name:str40,         //名字
    }

    chat block format:
    {
        
    }
    
    msg block format:
    {
        lastBlkNum:uint,    //上一个聊天记录块号
        lastTr:uint16,      //上一个聊天记录交易号
        infoLen:uint32,     //信息总长度
        sendFrom:uint,      //发信人
        sendTo:uint         //收信人
    }

    
*/