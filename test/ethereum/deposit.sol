pragma solidity ^0.5.0;
contract Deposit{
    mapping(address=>uint) private balance;
    mapping(address=>bool) private hasDeposit;
    
    event depositEvent(address addr, uint val);
    
    function deposit() public payable{
        require(msg.value>0, "Please deposit more than 0!");
        balance[msg.sender] += msg.value;
        hasDeposit[msg.sender]=true;
        emit depositEvent(msg.sender, msg.value);
    }
    
    function getBalance() view public returns(uint){
        require(hasDeposit[msg.sender], "You haven't deposit yet!");
        return balance[msg.sender];
    }
    
    function getTotalBalance() view public returns(uint){
        return address(this).balance;
    }
    
    function() external payable{
        deposit();
    }
}