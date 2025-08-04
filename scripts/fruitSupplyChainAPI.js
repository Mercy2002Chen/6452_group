// SPDX-License-Identifier: MIT
const Web3 = require('web3');

/**
 * 水果供应链API封装
 * 提供对FruitTraceability和PermissionControl合约的高级接口
 */
class FruitSupplyChainAPI {
  /**
   * 构造函数
   * @param {Object} web3 - Web3实例
   * @param {String} traceabilityAddress - FruitTraceability合约地址
   * @param {String} permissionAddress - PermissionControl合约地址
   * @param {Object} traceabilityABI - FruitTraceability合约ABI
   * @param {Object} permissionABI - PermissionControl合约ABI
   */
  constructor(web3, traceabilityAddress, permissionAddress, traceabilityABI, permissionABI) {
    this.web3 = web3;
    this.traceabilityContract = new web3.eth.Contract(traceabilityABI, traceabilityAddress);
    this.permissionContract = new web3.eth.Contract(permissionABI, permissionAddress);
  }

  /**
   * 获取批次概要信息
   * @param {Number} batchId - 批次ID
   * @returns {Object} 批次概要信息
   */
  async getBatchOverview(batchId) {
    try {
      const result = await this.traceabilityContract.methods.getBatchOverview(batchId).call();
      return {
        metadata: result.metadata,
        currentOwner: result.currentOwner,
        stageCount: parseInt(result.stageCount)
      };
    } catch (error) {
      throw new Error(`获取批次概要失败: ${error.message}`);
    }
  }

  /**
   * 获取指定阶段详情
   * @param {Number} batchId - 批次ID
   * @param {Number} index - 阶段索引
   * @returns {Object} 阶段详情
   */
  async getStage(batchId, index) {
    try {
      const result = await this.traceabilityContract.methods.getStage(batchId, index).call();
      return {
        stage: parseInt(result.stage),
        location: result.location,
        timestamp: parseInt(result.timestamp),
        actor: result.actor
      };
    } catch (error) {
      throw new Error(`获取阶段详情失败: ${error.message}`);
    }
  }

  /**
   * 获取当前所有者
   * @param {Number} batchId - 批次ID
   * @returns {String} 所有者地址
   */
  async getCurrentOwner(batchId) {
    try {
      return await this.traceabilityContract.methods.getCurrentOwner(batchId).call();
    } catch (error) {
      throw new Error(`获取所有者失败: ${error.message}`);
    }
  }

  /**
   * 农户注册新批次
   * @param {Object} account - 发送交易的账户
   * @param {Number} batchId - 批次ID
   * @param {String} metadata - 元数据
   * @returns {Object} 交易结果
   */
  async registerBatch(account, batchId, metadata) {
    try {
      const result = await this.permissionContract.methods
        .registerBatch(batchId, metadata)
        .send({ from: account, gas: 500000 });
      return result;
    } catch (error) {
      throw new Error(`注册批次失败: ${error.message}`);
    }
  }

  /**
   * 记录供应链阶段
   * @param {Object} account - 发送交易的账户
   * @param {Number} batchId - 批次ID
   * @param {Number} stage - 阶段类型
   * @param {String} location - 地点
   * @param {Number} timestamp - 时间戳
   * @returns {Object} 交易结果
   */
  async recordStage(account, batchId, stage, location, timestamp) {
    try {
      const result = await this.permissionContract.methods
        .recordStage(batchId, stage, location, timestamp)
        .send({ from: account, gas: 500000 });
      return result;
    } catch (error) {
      throw new Error(`记录阶段失败: ${error.message}`);
    }
  }

  /**
   * 请求所有权转移
   * @param {Object} account - 发送交易的账户
   * @param {Number} batchId - 批次ID
   * @param {String} newOwner - 新所有者地址
   * @returns {Object} 交易结果
   */
  async requestOwnershipTransfer(account, batchId, newOwner) {
    try {
      const result = await this.permissionContract.methods
        .requestOwnershipTransfer(batchId, newOwner)
        .send({ from: account, gas: 500000 });
      return result;
    } catch (error) {
      throw new Error(`所有权转移失败: ${error.message}`);
    }
  }

  /**
   * 授予角色
   * @param {Object} adminAccount - 管理员账户
   * @param {String} role - 角色
   * @param {String} account - 被授予权限的账户
   * @returns {Object} 交易结果
   */
  async grantRole(adminAccount, role, account) {
    try {
      const result = await this.permissionContract.methods
        .grantRole(this.web3.utils.keccak256(role), account)
        .send({ from: adminAccount, gas: 500000 });
      return result;
    } catch (error) {
      throw new Error(`授予权限失败: ${error.message}`);
    }
  }

  /**
   * 撤销角色
   * @param {Object} adminAccount - 管理员账户
   * @param {String} role - 角色
   * @param {String} account - 被撤销权限的账户
   * @returns {Object} 交易结果
   */
  async revokeRole(adminAccount, role, account) {
    try {
      const result = await this.permissionContract.methods
        .revokeRole(this.web3.utils.keccak256(role), account)
        .send({ from: adminAccount, gas: 500000 });
      return result;
    } catch (error) {
      throw new Error(`撤销权限失败: ${error.message}`);
    }
  }

  /**
   * 检查账户是否具有指定角色
   * @param {String} role - 角色
   * @param {String} account - 账户地址
   * @returns {Boolean} 是否具有角色
   */
  async hasRole(role, account) {
    try {
      const roleHash = this.web3.utils.keccak256(role);
      return await this.permissionContract.methods.hasRole(roleHash, account).call();
    } catch (error) {
      throw new Error(`检查权限失败: ${error.message}`);
    }
  }
}

module.exports = FruitSupplyChainAPI;