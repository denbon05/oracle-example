const CallerContract = artifacts.require('CallerContract');

module.exports = function (_deployer) {
  _deployer.deploy(CallerContract);
};
