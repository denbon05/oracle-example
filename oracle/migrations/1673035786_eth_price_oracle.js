const EthPriceOracle = artifacts.require('EthPriceOracle');

module.exports = function (_deployer) {
  _deployer.deploy(EthPriceOracle);
};
