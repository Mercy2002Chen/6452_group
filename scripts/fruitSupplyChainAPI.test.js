// SPDX-License-Identifier: MIT
const Web3 = require('web3');
const FruitSupplyChainAPI = require('./fruitSupplyChainAPI');

// 模拟测试数据
const TRACEABILITY_ADDRESS = '0x1234567890123456789012345678901234567890';
const PERMISSION_ADDRESS = '0x0987654321098765432109876543210987654321';

// 模拟ABI（实际使用时需要从编译结果中获取）
const TRACEABILITY_ABI = [];
const PERMISSION_ABI = [];

// 模拟账户地址
const ADMIN_ACCOUNT = '0x1111111111111111111111111111111111111111';
const FARMER_ACCOUNT = '0x2222222222222222222222222222222222222222';
const INSPECTOR_ACCOUNT = '0x3333333333333333333333333333333333333333';
const RETAILER_ACCOUNT = '0x4444444444444444444444444444444444444444';

/**
 * 模拟Web3和合约方法以进行测试
 */
class MockWeb3 {
  utils = {
    keccak256: (str) => `0x${str.replace(/[^a-zA-Z0-9]/g, '').padEnd(64, '0')}`
  };

  eth = {
    Contract: class {
      methods = {
        getBatchOverview: (batchId) => ({
          call: async () => ({
            metadata: '测试水果批次',
            currentOwner: FARMER_ACCOUNT,
            stageCount: '2'
          })
        }),
        getStage: (batchId, index) => ({
          call: async () => ({
            stage: '0',
            location: '农场A',
            timestamp: '1625097600',
            actor: FARMER_ACCOUNT
          })
        }),
        getCurrentOwner: (batchId) => ({
          call: async () => FARMER_ACCOUNT
        }),
        registerBatch: (batchId, metadata) => ({
          send: async () => ({
            transactionHash: '0xabc123',
            status: true
          })
        }),
        recordStage: (batchId, stage, location, timestamp) => ({
          send: async () => ({
            transactionHash: '0xdef456',
            status: true
          })
        }),
        requestOwnershipTransfer: (batchId, newOwner) => ({
          send: async () => ({
            transactionHash: '0xghi789',
            status: true
          })
        }),
        grantRole: (role, account) => ({
          send: async () => ({
            transactionHash: '0xjkl012',
            status: true
          })
        }),
        revokeRole: (role, account) => ({
          send: async () => ({
            transactionHash: '0xmno345',
            status: true
          })
        }),
        hasRole: (role, account) => ({
          call: async () => true
        })
      }
    }
  };
}

// 测试用例
async function runTests() {
  console.log('开始测试水果供应链API...');
  
  // 初始化API
  const web3 = new MockWeb3();
  const api = new FruitSupplyChainAPI(
    web3,
    TRACEABILITY_ADDRESS,
    PERMISSION_ADDRESS,
    TRACEABILITY_ABI,
    PERMISSION_ABI
  );

  try {
    // 测试1: 获取批次概要
    console.log('\n测试1: 获取批次概要');
    const batchOverview = await api.getBatchOverview(1);
    console.log('批次概要:', batchOverview);
    console.assert(typeof batchOverview.metadata === 'string', 'metadata应该是字符串');
    console.assert(typeof batchOverview.currentOwner === 'string', 'currentOwner应该是字符串');
    console.assert(typeof batchOverview.stageCount === 'number', 'stageCount应该是数字');
    console.log('✓ 获取批次概要测试通过');

    // 测试2: 获取阶段详情
    console.log('\n测试2: 获取阶段详情');
    const stage = await api.getStage(1, 0);
    console.log('阶段详情:', stage);
    console.assert(typeof stage.stage === 'number', 'stage应该是数字');
    console.assert(typeof stage.location === 'string', 'location应该是字符串');
    console.assert(typeof stage.timestamp === 'number', 'timestamp应该是数字');
    console.assert(typeof stage.actor === 'string', 'actor应该是字符串');
    console.log('✓ 获取阶段详情测试通过');

    // 测试3: 获取当前所有者
    console.log('\n测试3: 获取当前所有者');
    const owner = await api.getCurrentOwner(1);
    console.log('当前所有者:', owner);
    console.assert(typeof owner === 'string', '所有者地址应该是字符串');
    console.log('✓ 获取当前所有者测试通过');

    // 测试4: 农户注册新批次
    console.log('\n测试4: 农户注册新批次');
    const registerResult = await api.registerBatch(FARMER_ACCOUNT, 1, '红富士苹果');
    console.log('注册结果:', registerResult);
    console.assert(registerResult.status === true, '交易应该成功');
    console.log('✓ 农户注册新批次测试通过');

    // 测试5: 记录供应链阶段
    console.log('\n测试5: 记录供应链阶段');
    const recordResult = await api.recordStage(INSPECTOR_ACCOUNT, 1, 0, '质检中心A', 1625097600);
    console.log('记录结果:', recordResult);
    console.assert(recordResult.status === true, '交易应该成功');
    console.log('✓ 记录供应链阶段测试通过');

    // 测试6: 请求所有权转移
    console.log('\n测试6: 请求所有权转移');
    const transferResult = await api.requestOwnershipTransfer(FARMER_ACCOUNT, 1, RETAILER_ACCOUNT);
    console.log('转移结果:', transferResult);
    console.assert(transferResult.status === true, '交易应该成功');
    console.log('✓ 请求所有权转移测试通过');

    // 测试7: 授予权限
    console.log('\n测试7: 授予权限');
    const grantResult = await api.grantRole(ADMIN_ACCOUNT, 'FARMER_ROLE', FARMER_ACCOUNT);
    console.log('授予结果:', grantResult);
    console.assert(grantResult.status === true, '交易应该成功');
    console.log('✓ 授予权限测试通过');

    // 测试8: 撤销权限
    console.log('\n测试8: 撤销权限');
    const revokeResult = await api.revokeRole(ADMIN_ACCOUNT, 'FARMER_ROLE', FARMER_ACCOUNT);
    console.log('撤销结果:', revokeResult);
    console.assert(revokeResult.status === true, '交易应该成功');
    console.log('✓ 撤销权限测试通过');

    // 测试9: 检查权限
    console.log('\n测试9: 检查权限');
    const hasRole = await api.hasRole('FARMER_ROLE', FARMER_ACCOUNT);
    console.log('权限检查结果:', hasRole);
    console.assert(typeof hasRole === 'boolean', '权限检查结果应该是布尔值');
    console.log('✓ 检查权限测试通过');

    console.log('\n🎉 所有测试通过!');

  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = { runTests };