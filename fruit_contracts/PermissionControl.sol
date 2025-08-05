// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 1. Import AccessControl from OpenZeppelin
import "@openzeppelin/contracts/access/AccessControl.sol";

// 2. Import StageType enum from the same directory
import "./FruitTraceability.sol";

interface IFruitTraceability {
    function internalTransferOwnership(
        uint256 batchId,
        address from,
        address to
    ) external;

    function internalRegisterBatch(
        uint256 batchId,
        string calldata metadata,
        address farmer
    ) external;

    function internalRecordStage(
        uint256 batchId,
        FruitTraceability.StageType stage,
        string calldata location,
        uint256 timestamp
    ) external;
}

contract PermissionControl is AccessControl {
    // Define four role constants
    bytes32 public constant FARMER_ROLE    = keccak256("FARMER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");
    bytes32 public constant RETAILER_ROLE  = keccak256("RETAILER_ROLE");
    bytes32 public constant CONSUMER_ROLE  = keccak256("CONSUMER_ROLE");

    // Address of the FruitTraceability contract, set by deployer
    address public traceabilityContract;

    event OwnershipTransferRequested(
        uint256 indexed batchId,
        address indexed from,
        address indexed to
    );
    event RoleGrantedLogged(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevokedLogged(bytes32 indexed role, address indexed account, address indexed sender);

    constructor(address _traceability) {
        // AccessControl's built-in role assignment
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        FruitTraceability ft = new FruitTraceability(address(this));
        traceabilityContract = address(ft);
    }

    // Override grant/revoke so that only admin can call them
    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        super.grantRole(role, account);
        emit RoleGrantedLogged(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        super.revokeRole(role, account);
        emit RoleRevokedLogged(role, account, msg.sender);
    }

    /* --- Optional: update traceability contract address after deployment --- */
    function setTraceabilityContract(address newAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        traceabilityContract = newAddr;
    }

    /* --- Business logic --- */

    // 1. Farmer registers a batch
    function registerBatch(uint256 batchId, string calldata metadata)
        external onlyRole(FARMER_ROLE)
    {
        IFruitTraceability(traceabilityContract)
            .internalRegisterBatch(batchId, metadata, msg.sender);
    }

    // 2. Record a stage (can be called by inspector or retailer)
    function recordStage(
        uint256 batchId,
        FruitTraceability.StageType stage,
        string calldata location,
        uint256 timestamp
    )
        external
    {
        require(
            hasRole(INSPECTOR_ROLE, msg.sender) ||
            hasRole(RETAILER_ROLE,  msg.sender),
            "No permission to record"
        );
        IFruitTraceability(traceabilityContract)
            .internalRecordStage(batchId, stage, location, timestamp);
    }

    // 3. Request ownership transfer (example: only farmer can trigger; can be extended)
    function requestOwnershipTransfer(uint256 batchId, address newOwner)
        external onlyRole(FARMER_ROLE)
    {
        emit OwnershipTransferRequested(batchId, msg.sender, newOwner);
        IFruitTraceability(traceabilityContract)
            .internalTransferOwnership(batchId, msg.sender, newOwner);
    }
}

