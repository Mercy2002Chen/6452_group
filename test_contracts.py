# test_contracts.py

from fruit_contracts import Contracts
import time

# 填入你测试账号的私钥（仅本地使用，切勿泄露）
PRIVATE_KEY = ""

ADMIN_PRIV_KEY = ""
FARMER_PRIV_KEY = ""
BUYER_ADDRESS = "0xd24731eEE27c44404649A10e47d6c72c7C70Cab0"  # 可为新账户
NETWORK = "sepolia"
# Step 1: 初始化合约封装对象

# ========== 初始化合约对象 ==========
admin = Contracts.from_network(NETWORK, private_key=ADMIN_PRIV_KEY)
farmer = Contracts.from_network(NETWORK, private_key=FARMER_PRIV_KEY)

print(f"✅ Admin 地址: {admin.account}")
print(f"✅ Farmer 地址: {farmer.account}")

# ========== Step 1: Admin 授予 Farmer 权限 ==========
# print("\n=== Step 1: 授予 FARMER_ROLE 权限 ===")
# try:
#     tx_hash = admin.grant_role("FARMER", farmer.account)
#     print("✅ 授权成功, Tx:", tx_hash)
# except Exception as e:
#     print("❌ 授权失败:", e)

# ========== Step 2: Farmer 注册批次 ==========
print("\n=== Step 2: Farmer 注册批次 ===")
batch_id = int(time.time()) % 100000  # 简单生成唯一 ID
metadata = '{"fruit": "apple", "origin": "USA"}'

try:
    tx_hash = farmer.register_batch(batch_id, metadata)
    print(f"✅ 注册成功: batch_id = {batch_id}, Tx: {tx_hash}")
except Exception as e:
    print("❌ 注册失败:", e)

# ========== Step 3: 查询批次信息 ==========
print("\n=== Step 3: 查询批次信息 ===")
try:
    result = farmer.get_batch_overview(batch_id)
    print("Metadata:", result[0])
    print("Current Owner:", result[1])
    print("Stage Count:", result[2])
except Exception as e:
    print("❌ 查询失败:", e)

# ========== Step 4: Farmer 添加阶段 ==========
print("\n=== Step 4: 添加阶段（如收获） ===")
try:
    stage_enum = 0  # HARVEST
    location = "California"
    timestamp = int(time.time())
    tx_hash = farmer.record_stage(batch_id, stage_enum, location, timestamp)
    print("✅ 阶段记录成功, Tx:", tx_hash)
except Exception as e:
    print("❌ 阶段记录失败:", e)

# ========== Step 5: Farmer 转移所有权 ==========
print("\n=== Step 5: 转移批次所有权 ===")
try:
    tx_hash = farmer.transfer_ownership(batch_id, BUYER_ADDRESS)
    print("✅ 所有权转移成功, Tx:", tx_hash)
except Exception as e:
    print("❌ 转移失败:", e)

# ========== Step 6: 查询最终状态 ==========
print("\n=== Step 6: 最终状态查询 ===")
try:
    result = farmer.get_batch_overview(batch_id)
    print("Metadata:", result[0])
    print("Current Owner:", result[1])
    print("Stage Count:", result[2])
except Exception as e:
    print("❌ 查询失败:", e)