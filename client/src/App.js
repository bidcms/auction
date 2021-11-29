/* eslint-disable */
import React, { Component } from 'react'
import AuctionContract from "./contracts/AuctionFactory.json";
import getWeb3 from "./getWeb3";

class App extends Component
{
    constructor(props) {
        super(props)

        this.state = {
            web3: null,
            currentAccount: '',
            currentAccountBalance: 0,
            currentAccountBids: {},
            accounts: [],
            contract: null,
            auctions: [],
            blockNumber:0,
            auctionEventListeners: {},
        }

        this.onChangeAccount = this.onChangeAccount.bind(this)
        this.onClickCreateAuction = this.onClickCreateAuction.bind(this)
        this.getAllAuctions = this.getAllAuctions.bind(this)
        this.getAuction = this.getAuction.bind(this)
        this.cancelAuction = this.cancelAuction.bind(this)
        this.getAccountBids = this.getAccountBids.bind(this)
        this.onLogBid = this.onLogBid.bind(this)
    }

    _inputReserve = null
    _inputBidIncrement = null
    _inputStartBlock = null
    _inputEndBlock = null
    _inputBidAmount = []
    
    componentDidMount = async () => {
        try {
          // Get network provider and web3 instance.
          const web3 = await getWeb3();
    
          // Use web3 to get the user's accounts.
          const accounts = await web3.eth.getAccounts();
          const blockNumber = await web3.eth.getBlockNumber();
    
          // Get the contract instance.
          const networkId = await web3.eth.net.getId();
          const deployedNetwork = AuctionContract.networks[networkId];
          const instance = new web3.eth.Contract(
            AuctionContract.abi,
            deployedNetwork && deployedNetwork.address,
          );
          // Set web3, accounts, and contract to the state, and then proceed with an
          // example of interacting with the contract's methods.
          this.setState({ web3, accounts,currentAccount:accounts[0], contract: instance,blockNumber });
          this.getAllAuctions()
        } catch (error) {
          // Catch any errors for any of the above operations.
          alert(
            `Failed to load web3, accounts, or contract. Check console for details.`,
          );
          console.error(error);
        }
    };

    onChangeAccount(evt) {
        this.setCurrentAccount(evt.target.value)
    }

    setCurrentAccount(account) {
        this.state.web3.eth.defaultAccount = account

        this.getAccountBids(account).then(currentAccountBids => {
            this.setState({
                currentAccount: account,
                currentAccountBalance: this.state.web3.fromWei(this.state.web3.eth.getBalance(account), 'ether').toString(),
                currentAccountBids,
            })
        })
    }

    getAccountBids(account) {
        const getBidPromises = this.state.auctions.map(auction => {
            return this.state.contract.methods.fundsByBidder.call(account).then(bid => {
                return { auction: auction.address, bid }
            })
        })

        return Promise.all(getBidPromises).then(results => {
            let currentAccountBids = {}
            for (let x of results) {
                currentAccountBids[x.auction] = this.state.web3.fromWei(x.bid, 'ether').toString()
            }
            return currentAccountBids
        })
    }

    onClickCreateAuction() {
        return new Promise((resolve, reject) => {
            this.state.contract.methods.createAuction(
            this._inputBidIncrement.value,
            this._inputStartBlock.value,
            this._inputEndBlock.value,
            ""
            ).send({ from: this.state.currentAccount})
            .on('transactionHash', function(transactionHash){
                resolve(transactionHash)
            })
            .on('confirmation', function(confirmationNumber, receipt){
                console.log({confirmationNumber:confirmationNumber,receipt:receipt})
            })
            .on('receipt', function(receipt){
                console.log({receipt:receipt})
                window.location.reload()
            })
            .on('error', function(error,receipt){
                console.log({error:error,receipt:receipt})
                reject({error:error,receipt:receipt})
            })
        });
    }

    onLogBid(err, resp) {
        console.log('LogBid ~>', resp.args)
        this.getAllAuctions()
        this.getAccountBids(this.state.currentAccount).then(currentAccountBids => {
            this.setState({ currentAccountBids })
        })
    }

    getAllAuctions() {
        return new Promise((resolve, reject) => {
            return this.state.contract.methods.getAuctionCount().call().then(result => {
                let auctions = [];
                for(let i = 0; i < result; i++){
                    this.state.contract.methods.allAuctions(i).call().then(res => {
                        auctions.push(res);
                        this.setState({auctions});
                    })
                }
            }).then(auctions => {
                /*let auctionEventListeners = Object.assign({}, this.state.auctionEventListeners)
                const unloggedAuctions = auctions.filter(auction => this.state.auctionEventListeners[auction.address] === undefined)
                for (let auction of unloggedAuctions) {
                    auctionEventListeners[auction.address] = this.state.contract.methods.LogBid({ fromBlock: 0, toBlock: 'latest' })
                    auctionEventListeners[auction.address].watch(this.onLogBid)
                }

                this.setState({ auctions, auctionEventListeners }, resolve)*/
            })
        })
    }

    getAuction(id) {
        console.log(this.state.auctions[id]);
        /*
        const owner = this.state.contract.methods.owner.call()
        const startBlock = this.state.contract.methods.startBlock.call()
        const endBlock = this.state.contract.methods.endBlock.call()
        const bidIncrement = this.state.contract.methods.bidIncrement.call()
        const highestBid = this.state.contract.methods.getHighestBid.call()
        const highestBindingBid = this.state.contract.methods.highestBindingBid.call()
        const highestBidder = this.state.contract.methods.highestBidder.call()
        const canceled = this.state.contract.methods.canceled.call()

        return Promise.all([ owner, startBlock, endBlock, bidIncrement, highestBid, highestBindingBid, highestBidder, canceled ]).then(vals => {
            const [ owner, startBlock, endBlock, bidIncrement, highestBid, highestBindingBid, highestBidder, canceled ] = vals
            return {
                address: auctionAddr,
                owner: owner,
                startBlock: startBlock.toString(),
                endBlock: endBlock.toString(),
                bidIncrement: this.state.web3.fromWei(bidIncrement, 'ether').toString(),
                highestBid: this.state.web3.fromWei(highestBid, 'ether').toString(),
                highestBindingBid: this.state.web3.fromWei(highestBindingBid, 'ether').toString(),
                highestBidder: highestBidder,
                canceled: canceled,
            }
        })*/
    }

    cancelAuction(id) {
        this.state.contract.methods.cancelAuction(id).send({ from: this.state.currentAccount }).then(_ => {
            this.getAllAuctions()
        })
    }

    onClickBid(id) {
        let _price = this._inputBidAmount[id].value;
        return new Promise((resolve, reject) => {
            this.state.contract.methods.placeBid(id)
            .send({ from: this.state.currentAccount,value: this.state.web3.utils.toWei(_price.toString())})
            .on('transactionHash', function(transactionHash){
                resolve(transactionHash)
            })
            .on('confirmation', function(confirmationNumber, receipt){
                console.log({confirmationNumber:confirmationNumber,receipt:receipt})
            })
            .on('receipt', function(receipt){
                console.log({receipt:receipt})
                window.location.reload()
            })
            .on('error', function(error,receipt){
                console.log({error:error,receipt:receipt})
                reject({error:error,receipt:receipt})
            })
        });
    }

    render() {
        if (!this.state.web3) {
          return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <div>
                <h1>Auctions</h1>

                <div>
                    Current block: {this.state.blockNumber}
                </div>

                <div className="form-create-auction">
                    <h2>Create auction</h2>
                    <div>
                        Reserve <input type="text" ref={x => this._inputReserve = x} defaultValue={0} />
                    </div>
                    <div>
                        Bid increment <input type="text" ref={x => this._inputBidIncrement = x} defaultValue={100000000000000000} />
                    </div>
                    <div>
                        Start block <input type="text" ref={x => this._inputStartBlock = x} defaultValue={this.state.blockNumber + 1} />
                    </div>
                    <div>
                        End block <input type="text" ref={x => this._inputEndBlock = x} defaultValue={this.state.blockNumber+2} />
                    </div>
                    <button onClick={this.onClickCreateAuction}>Create Auction</button>
                </div>

                <table>
                    <thead>
                        <tr>
                            <td>Address</td>
                            <td>Start block</td>
                            <td>End block</td>
                            <td>Bid increment</td>
                            <td>Highest bid</td>
                            <td>Highest binding bid</td>
                            <td>Highest bidder</td>
                            <td>Your bid</td>
                            <td>Status</td>
                            <td>Actions</td>
                        </tr>
                    </thead>
                    <tbody>
                    {this.state.auctions.map((auction, id) => {
                        let status = 'Running'
                        if (auction.canceled) {
                            status = 'Canceled'
                        } else if (this.state.web3.eth.blockNumber > auction.endBlock) {
                            status = 'Ended'
                        } else if (this.state.web3.eth.blockNumber < auction.startBlock) {
                            status = 'Unstarted'
                        }
                        return (
                            <tr key={id}>
                                <td>{auction.owner.substr(0, 6)}</td>
                                <td>{auction.startBlock}</td>
                                <td>{auction.endBlock}</td>
                                <td>{auction.bidIncrement} ETH</td>
                                <td>{auction.highestBid} ETH</td>
                                <td>{auction.highestBindingBid} ETH</td>
                                <td>{auction.highestBidder.substr(0, 6)}</td>
                                <td>{this.state.currentAccountBids[auction.owner]}</td>
                                <td>{status}</td>
                                <td>
                                    {auction.owner == this.state.currentAccount && (status === 'Running' || status === 'Unstarted') &&
                                        <button onClick={() => this.cancelAuction(id)}>Cancel</button>
                                    }
                                    <div>
                                        <input ref={x => this._inputBidAmount[id] = x} />
                                        <button onClick={() => this.onClickBid(id)}>Bid</button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>

                <hr />

                <div>
                    Current account:
                    <select onChange={this.onChangeAccount}>
                        {this.state.accounts.map(acct => <option key={acct} value={acct}>{acct}</option>)}
                    </select>
                    <div>Balance: {this.state.currentAccountBalance}</div>
                </div>
            </div>
        )
    }
}

export default App
