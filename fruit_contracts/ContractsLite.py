from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from web3 import Web3



import importlib.resources as pkg
# ──────────── 辅助：加载 JSON 文件 ────────────
def _load_json(package: str, name: str) -> Any:
    with pkg.open_text(package, name) as f:
        return json.load(f)


def _load_abi(name: str) -> Dict[str, Any]:
    abi_path = Path("fruit_contracts/abis") / f"{name}.json"  # 可自定义路径
    with open(abi_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return raw["abi"] if isinstance(raw, dict) and "abi" in raw else raw



class ContractsLite:
    def __init__(
        self,
        *,
        rpc_url: str,
        permission_addr: str,
        trace_addr: str,
        chain_id: int
    ):
        self.web3 = Web3(Web3.HTTPProvider(rpc_url))
        self.chain_id = chain_id

        self.permission = self.web3.eth.contract(
            address=self._addr(permission_addr),
            abi=_load_abi("PermissionControl")
        )
        self.trace = self.web3.eth.contract(
            address=self._addr(trace_addr),
            abi=_load_abi("FruitTraceability")
        )

    # ─────────── 通用工具 ───────────
    def _addr(self, addr: str) -> str:
        """统一把外部传入地址转 checksum"""
        return Web3.to_checksum_address(addr)

    def _build_common(self, from_addr: str, gas_estimate: int) -> dict:
        """拼公共字段：只给 gasLimit，让 MetaMask/钱包自己定 gas 价格"""
        gas_limit = int(gas_estimate * 1.2)  # 20 % buffer
        return {
            "from": from_addr,
            "nonce": self.web3.eth.get_transaction_count(from_addr),
            "chainId": self.chain_id,
            "gas": gas_limit
        }

    # ─────────── 写操作：构造交易 ───────────
    def build_register_batch_tx(self, from_addr: str, batch_id: int, metadata: str):
        from_addr = self._addr(from_addr)
        gas = self.permission.functions.registerBatch(batch_id, metadata).estimate_gas({"from": from_addr})
        return self.permission.functions.registerBatch(batch_id, metadata).build_transaction(
            self._build_common(from_addr, gas)
        )

    def build_record_stage_tx(self, from_addr: str, batch_id: int, stage: int, location: str, timestamp: int):
        from_addr = self._addr(from_addr)
        gas = self.permission.functions.recordStage(batch_id, stage, location, timestamp).estimate_gas({"from": from_addr})
        return self.permission.functions.recordStage(batch_id, stage, location, timestamp).build_transaction(
            self._build_common(from_addr, gas)
        )

    def build_transfer_ownership_tx(self, from_addr: str, batch_id: int, new_owner: str):
        from_addr = self._addr(from_addr)
        new_owner = self._addr(new_owner)
        gas = self.permission.functions.requestOwnershipTransfer(batch_id, new_owner).estimate_gas({"from": from_addr})
        return self.permission.functions.requestOwnershipTransfer(batch_id, new_owner).build_transaction(
            self._build_common(from_addr, gas)
        )

    def build_grant_role_tx(self, from_addr: str, role: str, account: str):
        from_addr = self._addr(from_addr)
        account = self._addr(account)
        role_hash = self.web3.keccak(text=role)
        gas = self.permission.functions.grantRole(role_hash, account).estimate_gas({"from": from_addr})
        return self.permission.functions.grantRole(role_hash, account).build_transaction(
            self._build_common(from_addr, gas)
        )

    def build_revoke_role_tx(self, from_addr: str, role: str, account: str):
        from_addr = self._addr(from_addr)
        account = self._addr(account)
        role_hash = self.web3.keccak(text=role)
        gas = self.permission.functions.revokeRole(role_hash, account).estimate_gas({"from": from_addr})
        return self.permission.functions.revokeRole(role_hash, account).build_transaction(
            self._build_common(from_addr, gas)
        )

    # ─────────────── 读操作：call 调用 ───────────────

    def get_batch_overview(self, batch_id: int):
        print(f"📦 [DEBUG] 正在查询 batch_id: {batch_id}")
        try:
            result = self.trace.functions.getBatchOverview(batch_id).call()
            print(f"✅ [DEBUG] 链上返回: {result}")
            return {
                "metadata": result[0],
                "currentOwner": result[1],
                "stageCount": int(result[2]),
            }
        except Exception as e:
            print(f"❌ [ERROR] 获取 batch_overview 失败: {e}")
            raise

    def get_stage(self, batch_id: int, index: int):
        result = self.trace.functions.getStage(batch_id, index).call()
        return {
            "stage": int(result[0]),
            "location": result[1],
            "timestamp": int(result[2]),
            "actor": result[3],
        }

    def get_current_owner(self, batch_id: int) -> str:
        return self.trace.functions.getCurrentOwner(batch_id).call()

    def has_role(self, role: str, account: str) -> bool:
        if role == "DEFAULT_ADMIN":
            role_hash = bytes(32)  # 等同于 0x0000000000000000000000000000000000000000000000000000000000000000
        else:
            role_hash = self.web3.keccak(text=role)

        print(f"[HAS_ROLE] Role: '{role}' → {role_hash.hex()} | Account: {account}")
        return self.permission.functions.hasRole(role_hash, account).call()
