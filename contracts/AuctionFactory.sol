pragma solidity ^0.5.12;


contract AuctionFactory {
    struct AuctionInfo {
        address owner;
        uint bidIncrement;
        uint startBlock; 
        uint endBlock;
        string  ipfsHash;

        bool  canceled;
        uint  highestBindingBid;
        address  highestBidder;
    }

    AuctionInfo[] public allAuctions;
    mapping(uint=>address) public auctionToOwner;
    event AuctionCreated(uint auctionId, address owner, uint numAuctions);
    // state
    mapping(address => uint256) public fundsByBidder;
    bool ownerHasWithdrawn;

    event LogBid(address bidder, uint bid, address highestBidder, uint highestBid, uint highestBindingBid);
    event LogWithdrawal(address withdrawer, address withdrawalAccount, uint amount);
    event LogCanceled();
    constructor() public{
    }

    function createAuction(uint bidIncrement, uint startBlock, uint endBlock, string memory ipfsHash) public{
        uint id = allAuctions.push(AuctionInfo(msg.sender,bidIncrement, startBlock, endBlock, ipfsHash, false, 1, address(0))) - 1;
        auctionToOwner[id] = msg.sender;
        emit AuctionCreated(id,msg.sender, allAuctions.length);
    }
    function getAuctionCount() public view returns(uint) {
        return allAuctions.length;
    }

    function getHighestBid(uint _auctionId)
        public
        view
        returns (uint)
    {
        return fundsByBidder[allAuctions[_auctionId].highestBidder];
    }

    function placeBid(uint _auctionId)
        public
        payable
        returns (bool success)
    {
        require(allAuctions[_auctionId].canceled == false);
        // reject payments of 0 ETH
        if (msg.value == 0) revert();

        // calculate the user's total bid based on the current amount they've sent to the contract
        // plus whatever has been sent with this transaction
        uint newBid = fundsByBidder[msg.sender] + msg.value;

        // if the user isn't even willing to overbid the highest binding bid, there's nothing for us
        // to do except revert the transaction.
        if (newBid <= allAuctions[_auctionId].highestBindingBid) revert();

        // grab the previous highest bid (before updating fundsByBidder, in case msg.sender is the
        // highestBidder and is just increasing their maximum bid).
        uint highestBid = fundsByBidder[allAuctions[_auctionId].highestBidder];

        fundsByBidder[msg.sender] = newBid;

        if (newBid <= highestBid) {
            // if the user has overbid the highestBindingBid but not the highestBid, we simply
            // increase the highestBindingBid and leave highestBidder alone.

            // note that this case is impossible if msg.sender == highestBidder because you can never
            // bid less ETH than you've already bid.

            allAuctions[_auctionId].highestBindingBid = min(newBid + allAuctions[_auctionId].bidIncrement, highestBid);
        } else {
            // if msg.sender is already the highest bidder, they must simply be wanting to raise
            // their maximum bid, in which case we shouldn't increase the highestBindingBid.

            // if the user is NOT highestBidder, and has overbid highestBid completely, we set them
            // as the new highestBidder and recalculate highestBindingBid.

            if (msg.sender != allAuctions[_auctionId].highestBidder) {
                allAuctions[_auctionId].highestBidder = msg.sender;
                allAuctions[_auctionId].highestBindingBid = min(newBid, highestBid + allAuctions[_auctionId].bidIncrement);
            }
            highestBid = newBid;
        }

        emit LogBid(msg.sender, newBid, allAuctions[_auctionId].highestBidder, highestBid, allAuctions[_auctionId].highestBindingBid);
        
        return true;
    }

    function min(uint a, uint b)
        private
        pure
        returns (uint)
    {
        if (a < b) return a;
        return b;
    }

    function cancelAuction(uint _auctionId)
        public
        returns (bool success)
    {
        require(msg.sender == allAuctions[_auctionId].owner);
        allAuctions[_auctionId].canceled = true;
        emit LogCanceled();
        return true;
    }

    function withdraw(uint _auctionId)
        public
        onlyEndedOrCanceled(_auctionId)
        returns (bool success)
    {
        address withdrawalAccount;
        uint withdrawalAmount;

        if (allAuctions[_auctionId].canceled) {
            // if the auction was canceled, everyone should simply be allowed to withdraw their funds
            withdrawalAccount = msg.sender;
            withdrawalAmount = fundsByBidder[withdrawalAccount];

        } else {
            // the auction finished without being canceled

            if (msg.sender == allAuctions[_auctionId].owner) {
                // the auction's owner should be allowed to withdraw the highestBindingBid
                withdrawalAccount = allAuctions[_auctionId].highestBidder;
                withdrawalAmount = allAuctions[_auctionId].highestBindingBid;
                ownerHasWithdrawn = true;

            } else if (msg.sender == allAuctions[_auctionId].highestBidder) {
                // the highest bidder should only be allowed to withdraw the difference between their
                // highest bid and the highestBindingBid
                withdrawalAccount = allAuctions[_auctionId].highestBidder;
                if (ownerHasWithdrawn) {
                    withdrawalAmount = fundsByBidder[allAuctions[_auctionId].highestBidder];
                } else {
                    withdrawalAmount = fundsByBidder[allAuctions[_auctionId].highestBidder] - allAuctions[_auctionId].highestBindingBid;
                }

            } else {
                // anyone who participated but did not win the auction should be allowed to withdraw
                // the full amount of their funds
                withdrawalAccount = msg.sender;
                withdrawalAmount = fundsByBidder[withdrawalAccount];
            }
        }

        if (withdrawalAmount == 0) revert();

        fundsByBidder[withdrawalAccount] -= withdrawalAmount;

        // send the funds
        if (!msg.sender.send(withdrawalAmount)) revert();

        emit LogWithdrawal(msg.sender, withdrawalAccount, withdrawalAmount);

        return true;
    }

    modifier onlyOwner(uint _auctionId) {
        if (msg.sender != allAuctions[_auctionId].owner) revert();
        _;
    }

    modifier onlyNotOwner(uint _auctionId) {
        if (msg.sender == allAuctions[_auctionId].owner) revert();
        _;
    }

    modifier onlyAfterStart(uint _auctionId) {
        if (block.number < allAuctions[_auctionId].startBlock) revert();
        _;
    }

    modifier onlyBeforeEnd(uint _auctionId) {
        if (block.number > allAuctions[_auctionId].endBlock) revert();
        _;
    }

    modifier onlyNotCanceled(uint _auctionId) {
        if (allAuctions[_auctionId].canceled) revert();
        _;
    }

    modifier onlyEndedOrCanceled(uint _auctionId) {
        if (block.number < allAuctions[_auctionId].endBlock && !allAuctions[_auctionId].canceled) revert();
        _;
    }
}
