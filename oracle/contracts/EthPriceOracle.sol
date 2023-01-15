// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/CallerContractInterface.sol";

contract EthPriceOracle is AccessControl {
    uint256 private randNonce = 0;
    uint256 private modulus = 1000;
    uint256 private numOracles = 0;
    uint256 private THRESHOLD = 0;
    mapping(uint256 => bool) pendingRequests;
    struct Response {
        address oracleAddress;
        address callerAddress;
        uint256 ethPrice;
    }
    mapping (uint256=>Response[]) public requestIdToResponse;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    event GetLatestEthPriceEvent(address callerAddress, uint256 id);
    event SetLatestEthPriceEvent(uint256 ethPrice, address callerAddress);
    event RemoveOracleEvent(address oracleAddress);
    event SetThresholdEvent (uint threshold);

    /**
    * @dev initiate default role admin
    * grant the admin role to the initializer
     */
    constructor() {
        _setRoleAdmin(ORACLE_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function setThreshold (uint _threshold) public onlyRole(DEFAULT_ADMIN_ROLE) {
        THRESHOLD = _threshold;
        emit SetThresholdEvent(THRESHOLD);
    }

    function addOracle(address _oracle)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // May emit a {RoleGranted} event.
        _setupRole(ORACLE_ROLE, _oracle);
        numOracles += 1;
    }

    function removeOracle(address _oracle) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(ORACLE_ROLE, _oracle), "Not an oracle!");
        require(numOracles > 1, "Do not remove the last oracle!");

        revokeRole(ORACLE_ROLE, _oracle);
        numOracles -= 1;

        emit RemoveOracleEvent(_oracle);
    }

    function getLatestEthPrice() public returns (uint256) {
        randNonce += 1;
        uint256 id = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))
        ) % modulus;

        pendingRequests[id] = true;
        emit GetLatestEthPriceEvent(msg.sender, id);

        return id;
    }

    function setLatestEthPrice(
        uint256 _ethPrice,
        address _callerAddress,
        uint256 _id
    ) external {
        require(hasRole(ORACLE_ROLE, _msgSender()), "Not an oracle!");
        require(
            pendingRequests[_id],
            "This request is not in my pending list."
        );

        Response memory resp = Response(msg.sender, _callerAddress, _ethPrice);
        requestIdToResponse[_id].push(resp);
        uint numResponses = requestIdToResponse[_id].length;

        if (numResponses == THRESHOLD) {
            uint computedEthPrice = 0;
            for (uint f = 0; f < requestIdToResponse[_id].length; f ++) {
                computedEthPrice += requestIdToResponse[_id][f].ethPrice;
            }
            computedEthPrice = computedEthPrice / numResponses;

            delete pendingRequests[_id];
            delete requestIdToResponse[_id];

            CallerContractInterface callerContractInstance = CallerContractInterface(
                    _callerAddress
                );
            callerContractInstance.callback(computedEthPrice, _id);
            emit SetLatestEthPriceEvent(computedEthPrice, _callerAddress);
        }
    }
}
