import os
import json
import asyncio
import asyncpg
import threading
from web3 import Web3
from web3._utils.events import event_abi_to_log_topic, get_event_data
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # 加载 .env 文件

# ---------- 配置 ----------
RPC_URL = os.getenv("RPC_URL")
PERM_ADDR = os.getenv("PERMISSION_ADDR")
TRACE_ADDR = os.getenv("TRACE_ADDR")
CHAIN_ID = int(os.getenv("CHAIN_ID", "11155111"))

PERM_ABI_PATH = "fruit_contracts/abis/PermissionControl.json"
TRACE_ABI_PATH = "fruit_contracts/abis/FruitTraceability.json"

DB_DSN = f"postgresql://{os.getenv('DB_USER', 'fruit_user')}:{os.getenv('DB_PASSWORD', 'fruit_pass')}@" \
         f"{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'fruit_chain')}"

# ---------- Web3 ----------
w3 = Web3(Web3.HTTPProvider(RPC_URL))


def load_abi(path):
    with open(path, 'r') as f:
        return json.load(f)['abi']

# ---------- ABI & 合约实例 ----------
perm_abi = load_abi(PERM_ABI_PATH)
trace_abi = load_abi(TRACE_ABI_PATH)

perm_contract = w3.eth.contract(
    address=Web3.to_checksum_address(PERM_ADDR),
    abi=perm_abi
)

trace_contract = w3.eth.contract(
    address=Web3.to_checksum_address(TRACE_ADDR),
    abi=trace_abi
)

PERM_ADDR = Web3.to_checksum_address(os.getenv("PERMISSION_ADDR"))
TRACE_ADDR = Web3.to_checksum_address(os.getenv("TRACE_ADDR"))
# ---------- 数据库连接池 ----------
# offchain.py

offchain_pool = None  # 🔁 原来的 db_pool

async def init_offchain_pool():
    global offchain_pool
    offchain_pool = await asyncpg.create_pool(dsn=DB_DSN)
    print("✅ offchain 线程连接池已初始化")

@asynccontextmanager
async def offchain_conn():
    if offchain_pool is None:
        raise RuntimeError("❌ offchain_pool 尚未初始化")
    async with offchain_pool.acquire() as conn:
        yield conn

from eth_utils import event_abi_to_log_topic

def get_event_abi_and_name_by_topic(log, abi):
    topic0 = log['topics'][0]
    for e in abi:
        if e.get("type") == "event":
            if event_abi_to_log_topic(e) == topic0:
                return e, e["name"]
    raise ValueError("⚠️ No matching event ABI for topic[0] = " + topic0.hex())

# ---------- 日志解析 ----------
def parse_event(log, abi):
    topic = log['topics'][0].hex()
    for item in abi:
        if item.get("type") == "event" and event_abi_to_log_topic(item).hex() == topic:
            return item["name"]
    return "UnknownEvent"

# ---------- 同步事件主循环 ----------
async def sync_loop_async():
    await init_offchain_pool()
    print("🌀 正在监听链上日志...")
    while True:
        try:
            logs = w3.eth.get_logs({
                "fromBlock": "latest",
                "address": [PERM_ADDR, TRACE_ADDR]
            })

            async with offchain_conn() as conn:
                for log in logs:
                    contract_addr = log["address"]
                    abi = perm_abi if contract_addr.lower() == PERM_ADDR.lower() else trace_abi
                    tx_hash = log["transactionHash"].hex()

                    # 👇 每次日志循环
                    event_abi, event_name = get_event_abi_and_name_by_topic(log, abi)
                    event_data = get_event_data(w3.codec, event_abi, log)
                    print(f"[链上事件] {event_name} @ {tx_hash}")

                    # ✅ 插入日志表
                    await conn.execute(
                        "INSERT INTO logs (tx_hash, event_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                        tx_hash, event_name
                    )

                    # ✅ 分发逻辑
                    if event_name == "BatchRegistered":
                        try:
                            args = event_data["args"]
                            batch_id = args["batchId"]
                            owner = args["farmer"]
                            metadata = args["metadata"]

                            print(f"📦 BatchRegistered: {batch_id} ← {owner}")
                            await conn.execute("""
                                INSERT INTO batches (batch_id, metadata, current_owner)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (batch_id) DO UPDATE SET current_owner = EXCLUDED.current_owner
                            """, batch_id, metadata, owner)

                        except Exception as e:
                            print(f"❌ 处理 BatchRegistered 事件失败: {e}")


                    elif event_name.startswith("RoleGranted"):

                        try:

                            args = event_data["args"]

                            role = args["role"]

                            account = args["account"]

                            # ✅ 角色映射：将 bytes32 转换为可读字符串

                            role_map = {

                                Web3.keccak(text="FARMER_ROLE"): "FARMER_ROLE",

                                Web3.keccak(text="INSPECTOR_ROLE"): "INSPECTOR_ROLE",

                                Web3.keccak(text="RETAILER_ROLE"): "RETAILER_ROLE",

                            }

                            role_name = role_map.get(role)

                            if not role_name:

                                print(f"⚠️ 未识别的角色哈希: {role.hex()}, 已跳过")

                            else:

                                print(f"✅ 授权角色: {account} ← {role_name}")

                                await conn.execute("""

                                    INSERT INTO user_roles (address, role_name)

                                    VALUES ($1, $2)

                                    ON CONFLICT (address, role_name) DO NOTHING

                                """, account, role_name)


                        except Exception as e:

                            print(f"❌ 处理 RoleGranted 事件失败: {e}")


                    elif event_name.startswith("RoleRevoked"):

                        try:

                            args = event_data["args"]

                            role = args["role"]

                            account = args["account"]

                            # ✅ 同样的角色哈希映射

                            role_map = {

                                Web3.keccak(text="FARMER_ROLE"): "FARMER_ROLE",

                                Web3.keccak(text="INSPECTOR_ROLE"): "INSPECTOR_ROLE",

                                Web3.keccak(text="RETAILER_ROLE"): "RETAILER_ROLE",

                            }

                            role_name = role_map.get(role)

                            if not role_name:

                                print(f"⚠️ 未识别的角色哈希: {role.hex()}, 撤销跳过")

                            else:

                                print(f"❎ 撤销角色: {account} → {role_name}")

                                await conn.execute("""

                                    DELETE FROM user_roles

                                    WHERE address = $1 AND role_name = $2

                                """, account, role_name)


                        except Exception as e:

                            print(f"❌ 处理 RoleRevoked 事件失败: {e}")
                    elif event_name == "StageRecorded":
                        try:
                            args = event_data["args"]
                            batch_id = args["batchId"]
                            stage = args["stage"]  # uint8 → 整型阶段编号
                            location = args["location"]
                            timestamp = args["timestamp"]
                            actor = args["actor"]  # 直接来自事件中的 indexed actor

                            from datetime import datetime
                            ts_block = datetime.utcfromtimestamp(timestamp)

                            print(f"📍 阶段记录: 批次 {batch_id} - 阶段 {stage} @ {location} by {actor}")

                            await conn.execute("""
                                INSERT INTO stages (batch_id, stage, location, ts_block, actor)
                                VALUES ($1, $2, $3, $4, $5)
                            """, batch_id, stage, location, ts_block, actor)

                        except Exception as e:
                            print(f"❌ 处理 StageRecorded 事件失败: {e}")





        except Exception as e:
            print("[⚠️ 日志监听错误]", e)

        await asyncio.sleep(10)

# ---------- 启动后台线程 ---------
