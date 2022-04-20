// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract Wallet {
    address[] public approvers;
    uint public quorum;
    struct Transfer {
        uint id;
        uint amount;
        address payable to;
        uint approvals;
        bool sent;
    }
    Transfer[] public transfers;
    mapping(address => mapping(uint => bool)) public approvals;

    constructor(address[] memory _approvers, uint _quorum){
        approvers = _approvers;
        quorum = _quorum;
    }

    modifier onlyApprovers() {
        bool isApprover = false;
        for (uint i = 0; i < approvers.length; i++) {
            if(approvers[i] == msg.sender){
                isApprover = true;
                break;
            }
        }
        require(isApprover, "only approvers");
        _;
    }

    function getApprovers() external view returns(address[] memory){
        return approvers;
    }

    function getTransfers() external view returns(Transfer[] memory){
        return transfers;
    }

    function createTransfer(uint amount, address payable to) external{
        transfers.push(Transfer(
            transfers.length,
            amount,
            to,
            0,
            false
        ));
    }

    function approveTransfer(uint id) public onlyApprovers() {
        require(transfers[id].sent == false, "cannot approve sent transfer");
        require(approvals[msg.sender][id] == false, "cannot approve twice");

        approvals[msg.sender][id] = true;
        transfers[id].approvals++;

        if(transfers[id].approvals >= quorum){
            transfers[id].sent == true;
            address payable to = transfers[id].to;
            to.transfer(transfers[id].amount);
        }
    }

    recieve() external payable{}
}