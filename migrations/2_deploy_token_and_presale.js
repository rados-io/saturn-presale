var Saturn  = artifacts.require("./Saturn.sol");
var Presale = artifacts.require("./SaturnPresale.sol");

module.exports = (deployer, network, accounts) => {
  deployer.deploy(Saturn).then(() => {
    return deployer.deploy(Presale,
      Saturn.address, // what ERC223 token is being crowdsold
      accounts[2], // address of ETH recepient
      1000, // minimum amount of ETH (in wei) that should be accepted, denominated in wei
      1500, // hard cap of presale, denominated in smallest unit of your token
      1000000000 // priceDiv. Wei sent to you will be divided by this number to get the right token number
    );
  });
};
