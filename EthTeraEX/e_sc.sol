pragma solidity ^0.5.0;
contract Deposit{
    mapping(address=>uint) private balance;
    mapping(address=>bool) private hasDeposit;
    
    event depositEvent(uint48 TeraAcc, uint256 coins, uint256 cents);
    
    function deposit(uint48 TeraAccountNum) public payable{
        require(msg.value>=1000000000, "Please deposit more than 1gwei!");
        require(TeraAccountNum!=0, "Please input your tera account!");
        balance[msg.sender] += msg.value;
        hasDeposit[msg.sender]=true;
        
        emit depositEvent(TeraAccountNum, msg.value / 1000000000000000000 , msg.value / 1000000000 % 1000000000  );
    }
    
    /*
    function getBalance() view public returns(uint){
        require(hasDeposit[msg.sender]==true, "You haven't deposit yet!");
        return balance[msg.sender];
    }*/
    
    function getTotalBalance() view public returns(uint){
        return address(this).balance;
    }
    
    function() external payable{
        deposit(0);
    }
}