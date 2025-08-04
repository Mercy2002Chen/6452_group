// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 *  FruitTraceability (aka FruitSupplyChain)
 *  - 负责存储批次与阶段数据
 *  - 仅允许 PermissionControl 合约调用写操作
 *  - 提供只读查询接口给任何人
 */
contract FruitTraceability {
    /// 供应链阶段枚举，可按需增删
    enum StageType {
        Harvested,     // 采摘
        Inspected,     // 质检
        Packed,        // 包装
        Shipped,       // 物流
        InStore,       // 零售上架
        Sold           // 售出
    }

    /// 单个阶段的完整记录
    struct Stage {
        StageType stage;      // 阶段类型
        string location;      // 发生地点
        uint256 timestamp;    // 时间戳
        address actor;        // 操作者（检验员/零售商）
    }

    /// 批次信息
    struct Batch {
        bool exists;          // 是否已注册
        string metadata;      // 额外描述（品种、等级……）
        address currentOwner; // 当前所有者
        address farmer;       // 初始农户
        Stage[] stages;       // 阶段数组
    }

    /// 批次ID => 批次详情
    mapping(uint256 => Batch) private batches;

    /// 只有 PermissionControl 地址才能修改状态
    address public immutable permissionControl;
    modifier onlyPermission() {
        require(msg.sender == permissionControl, "Not PermissionControl");
        _;
    }

    /* ─────────── 事件 ─────────── */
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

    /* ─────────── 写操作（仅 PermissionControl 可调） ─────────── */

    /// 农户注册新批次
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

    /// 批次所有权转移
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

    /// 记录供应链阶段
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
            actor:      tx.origin   // 记录最终调用者身份
        }));

        emit StageRecorded(batchId, stage, location, timestamp, tx.origin);
    }

    /* ─────────── 读接口（任何人可调） ─────────── */

    /// 批次概要
    function getBatchOverview(uint256 batchId)
        external view
        returns (string memory metadata, address currentOwner, uint256 stageCount)
    {
        Batch storage b = batches[batchId];
        require(b.exists, "Batch not found");
        return (b.metadata, b.currentOwner, b.stages.length);
    }

    /// 查询指定阶段
    function getStage(uint256 batchId, uint256 index)
        external view
        returns (StageType stage, string memory location, uint256 timestamp, address actor)
    {
        Batch storage b = batches[batchId];
        require(index < b.stages.length, "Index out of range");
        Stage storage s = b.stages[index];
        return (s.stage, s.location, s.timestamp, s.actor);
    }

    /// 仅获取当前所有者
    function getCurrentOwner(uint256 batchId) external view returns (address) {
        Batch storage b = batches[batchId];
        require(b.exists, "Batch not found");
        return b.currentOwner;
    }
}

