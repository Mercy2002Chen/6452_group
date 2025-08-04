import json, os
from web3 import Web3
from pathlib import Path

# ---------- 手动配置 ----------
RPC_URL = "https://sepolia.infura.io/v3/beff8273b87e4f0e946bb817db57f1af"

TRACE_ADDR = "0x5a1a63167a33dCa9eF157a939934Ac36703Bd682"

# ---------- 读取 ABI ----------
abi_path = Path("abis/FruitTraceability.json")
with abi_path.open() as f:
    abi_json = json.load(f)          # ← 只读一次
TRACE_ABI = abi_json["abi"] if isinstance(abi_json, dict) and "abi" in abi_json else abi_json

# ---------- 链下调用 ----------
w3 = Web3(Web3.HTTPProvider(RPC_URL))
trace = w3.eth.contract(address=Web3.to_checksum_address(TRACE_ADDR), abi=TRACE_ABI)

try:
    # 任意批次号；如果还没注册，可能返回空字符串/零
    overview = trace.functions.getBatchOverview(1).call()
    # getBatchOverview 返回 (metadata, owner, stageCount)
    print("Batch #1 overview →", overview)
except Exception as e:
    print("❌ 读取失败：", e)
