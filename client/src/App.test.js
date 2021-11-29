import React, { Component } from "react";
import AuctionContract from "./contracts/AuctionFactory.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = {
      web3: null,
      currentAccount: '',
      currentAccountBalance: 0,
      currentAccountBids: {},
      accounts: [],
      contract: null,
      auctions: [],
      auctionEventListeners: {},
  }
  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = AuctionContract.networks[networkId];
      const instance = new web3.eth.Contract(
        AuctionContract.abi,
        deployedNetwork && deployedNetwork.address,
      );
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };
  runExample = async () => {
    const { accounts, contract } = this.state;
    console.log(accounts)
    // Stores a given value, 5 by default.
    //await contract.methods.set(5).send({ from: accounts[0] });

    // Get the value from the contract to prove it worked.
    //const response = await contract.methods.get().call();

    // Update state with the result.
    //this.setState({ storageValue: response });
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div>{this.state.web3.eth.getId}</div>
      </div>
    );
  }
}

export default App;