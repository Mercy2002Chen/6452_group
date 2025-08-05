// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 *  FruitTraceability (aka FruitSupplyChain)
 *  - Responsible for storing batch and stage data
 *  - Only the PermissionControl contract is allowed to perform write operations
 *  - Provides read-only query interfaces accessible to anyone
 */
contract FruitTraceability {
    /// Supply chain stage enumeration; can be modified as needed
    enum StageType {
        Harvested,     // Harvested
        Inspected,     // Inspected
        Packed,        // Packed
        Shipped,       // Shipped
        InStore,       // In-store
        Sold           // Sold
    }

    /// A complete record for a single stage
    struct Stage {
        StageType stage;      // Stage type
        string location;      // Location of the stage
        uint256 timestamp;    // Timestamp
        address actor;        // Actor (inspector/retailer)
    }

    /// Batch information
    struct Batch {
        bool exists;          // Whether the batch is registered
        string metadata;      // Additional description (variety, grade, etc.)
        address currentOwner; // Current owner
        address farmer;       // Original farmer
        Stage[] stages;       // Array of stage records
    }

    /// Mapping: batch ID => batch details
    mapping(uint256 => Batch) private batches;

    /// Only the PermissionControl address can modify the state
    address public immutable permissionControl;
    modifier onlyPermission() {
        require(msg.sender == permissionControl, "Not PermissionControl");
        _;
    }

    /* ─────────── Events ─────────── */
    event BatchRegistered(uint256 indexed batchId, address indexed farmer, string metadata);
    event StageRecorded(
        uint256 indexed batchId,
        StageType  stage,
        string     location,
        uint256    timestamp,
        address    indexed actor
    );
    event OwnershipTransferred(uint256 indexed batchId, address indexed from, address indexed to);

    constructor(address _permissionControl) {
        require(_permissionControl != address(0), "Invalid permission contract");
        permissionControl = _permissionControl;
    }

    /* ─────────── Write Operations (Only PermissionControl Can Call) ─────────── */

    /// Farmer registers a new batch
    function internalRegisterBatch(
        uint256 batchId,
        string calldata metadata,
        address farmer
    ) external onlyPermission {
        Batch storage b = batches[batchId];
        require(!b.exists, "Batch already exists");
        b.exists        = true;
        b.metadata      = metadata;
        b.currentOwner  = farmer;
        b.farmer        = farmer;

        emit BatchRegistered(batchId, farmer, metadata);
    }

    /// Transfer ownership of a batch
    function internalTransferOwnership(
        uint256 batchId,
        address from,
        address to
    ) external onlyPermission {
        Batch storage b = batches[batchId];
        require(b.exists,         "Batch not found");
        require(b.currentOwner == from, "Not current owner");
        b.currentOwner = to;

        emit OwnershipTransferred(batchId, from, to);
    }

    /// Record a supply chain stage
    function internalRecordStage(
        uint256 batchId,
        StageType stage,
        string calldata location,
        uint256 timestamp
    ) external onlyPermission {
        Batch storage b = batches[batchId];
        require(b.exists, "Batch not found");

        b.stages.push(Stage({
            stage:      stage,
            location:   location,
            timestamp:  timestamp,
            actor:      tx.origin   // Capture the original sender (EOA)
        }));

        emit StageRecorded(batchId, stage, location, timestamp, tx.origin);
    }

    /* ─────────── Read Interfaces (Callable by Anyone) ─────────── */

    /// Get batch overview
    function getBatchOverview(uint256 batchId)
        external view
        returns (string memory metadata, address currentOwner, uint256 stageCount)
    {
        Batch storage b = batches[batchId];
        require(b.exists, "Batch not found");
        return (b.metadata, b.currentOwner, b.stages.length);
    }

    /// Get a specific stage by index
    function getStage(uint256 batchId, uint256 index)
        external view
        returns (StageType stage, string memory location, uint256 timestamp, address actor)
    {
        Batch storage b = batches[batchId];
        require(index < b.stages.length, "Index out of range");
        Stage storage s = b.stages[index];
        return (s.stage, s.location, s.timestamp, s.actor);
    }

    /// Get the current owner of a batch
    function getCurrentOwner(uint256 batchId) external view returns (address) {
        Batch storage b = batches[batchId];
        require(b.exists, "Batch not found");
        return b.currentOwner;
    }
}


