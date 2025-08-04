// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 1. 从 GitHub 直链导入 AccessControl
import "@openzeppelin/contracts/access/AccessControl.sol";

// 2. 引入同目录下的 FruitTraceability 枚举类型
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
    // 定义了四个权限角色
    bytes32 public constant FARMER_ROLE    = keccak256("FARMER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");
    bytes32 public constant RETAILER_ROLE  = keccak256("RETAILER_ROLE");
    bytes32 public constant CONSUMER_ROLE  = keccak256("CONSUMER_ROLE");
    // FruitTraceability 合约地址，由部署者设定
    address public traceabilityContract;

    event OwnershipTransferRequested(
        uint256 indexed batchId,
        address indexed from,
        address indexed to
    );
    event RoleGrantedLogged(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevokedLogged(bytes32 indexed role, address indexed account, address indexed sender);


    constructor(address _traceability) {
        // 这两行符号来自 AccessControl
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        FruitTraceability ft = new FruitTraceability(address(this));
        traceabilityContract = address(ft);
    }

    // 重写 grant/revoke，以便只有管理员能调用
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

    
    
      /* --- 可选：部署后更新追溯合约地址 --- */
    function setTraceabilityContract(address newAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        traceabilityContract = newAddr;
    }

    /* --- 业务函数 --- */

    // 1. 农户注册批次
    function registerBatch(uint256 batchId, string calldata metadata)
        external onlyRole(FARMER_ROLE)
    {
        IFruitTraceability(traceabilityContract)
            .internalRegisterBatch(batchId, metadata, msg.sender);
    }

    // 2. 记录阶段（检验员或零售商均可）
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

    // 3. 请求所有权转移（本示例仅限农户触发，可自行扩展）
    function requestOwnershipTransfer(uint256 batchId, address newOwner)
        external onlyRole(FARMER_ROLE)
    {
        emit OwnershipTransferRequested(batchId, msg.sender, newOwner);
        IFruitTraceability(traceabilityContract)
            .internalTransferOwnership(batchId, msg.sender, newOwner);
    }
}
