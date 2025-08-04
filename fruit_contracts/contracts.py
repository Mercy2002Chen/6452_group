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



# ──────────── 核心封装类 ────────────
class Contracts:
    """
    同时持有 PermissionControl & FruitTraceability，
    封装常用只读 + 写交易方法。
    """

    # ──────────────────── 初始化 ────────────────────
    def __init__(
        self,
        *,
        rpc_url: str,
        permission_addr: str,
        trace_addr: str,
        chain_id: int,
        private_key: Optional[str] = None,
    ) -> None:
        self.web3 = Web3(Web3.HTTPProvider(rpc_url))


        # 存私钥
        self._priv = private_key
        # 若传入private_key就生成账户对象，否则设置为none
        self.account: Optional[str] = (
            self.web3.eth.account.from_key(private_key).address  # type: ignore[arg-type]
            if private_key
            else None
        )
        # 链的唯一标识
        self.chain_id = chain_id

        # 合约实例
        # 加载合约实例
        self.permission = self.web3.eth.contract(
            address=Web3.to_checksum_address(permission_addr),
            abi=_load_abi("PermissionControl"),
        )
        self.trace = self.web3.eth.contract(
            address=Web3.to_checksum_address(trace_addr),
            abi=_load_abi("FruitTraceability"),
        )

    # ──────────────────── 工厂函数（推荐） ────────────────────
    @classmethod
    def from_network(
        cls,
        network: str,
        private_key: Optional[str] = None,
        networks_path: Path | None = None,
    ) -> "Contracts":
        # 加载网络配置
        networks = _load_json(
            "fruit_contracts", "networks.json"
        ) if networks_path is None else json.loads(networks_path.read_text())
        n = networks[network]
        return cls(
            rpc_url=n["rpc_url"],
            permission_addr=n["permission_addr"],
            trace_addr=n["trace_addr"],
            chain_id=n["chain_id"],
            private_key=private_key,
        )

    # ──────────────────── 内部：签名 & 发送 ────────────────────
    def _build_send(self, tx) -> str:
        if not (self._priv and self.account):
            raise RuntimeError("必须在实例化时提供 private_key 才能发交易。")

        tx.update({
            "from": self.account,
            "nonce": self.web3.eth.get_transaction_count(self.account),
            "chainId": self.chain_id,
            "maxFeePerGas": self.web3.to_wei('30', 'gwei'),  # 总上限
            "maxPriorityFeePerGas": self.web3.to_wei('2', 'gwei'),  # 小费
        })
        from pprint import pprint
        print("🚧 构建中的交易对象如下：")
        pprint(tx)
        # 将签名后的原始交易数据广播到链上
        signed = self.web3.eth.account.sign_transaction(tx, self._priv)
        # 返回的是一个HexBytes对象
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)

        print(f"⏳ 等待交易确认中... Hash: {tx_hash.hex()}")
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt.status != 1:
            raise RuntimeError("❌ 交易执行失败，已被回滚。")

        print(f"✅ 交易成功，区块号: {receipt.blockNumber}")
        return tx_hash.hex()

    # ══════════════════════════════════════════════════════════════
    #                           只读方法
    # ══════════════════════════════════════════════════════════════

    # -- 批次概览 --------------------------------------------------
    def get_batch_overview(self, batch_id: int):
        """返回 (metadata, currentOwner, stageCount)"""
        return self.trace.functions.getBatchOverview(batch_id).call()

    # -- 查询单个阶段 ----------------------------------------------
    def get_stage(self, batch_id: int, index: int):
        """返回 Stage struct： (stage, location, timestamp, actor)"""
        return self.trace.functions.getStage(batch_id, index).call()

    # -- 查询角色地址列表（辅助） -----------------------------------
    def has_role(self, role_name: str, addr: str) -> bool:
        role_hash = getattr(self.permission.functions, f"{role_name}_ROLE")().call()
        return self.permission.functions.hasRole(role_hash, addr).call()

    # ══════════════════════════════════════════════════════════════
    #                           写交易：PermissionControl
    # ══════════════════════════════════════════════════════════════

    # ------------------------ Role 管理 ---------------------------
    def grant_role(self, role_name: str, addr: str):
        print("当前使用的 Admin 地址:", self.account)
        role_hash = getattr(self.permission.functions, f"{role_name}_ROLE")().call()
        print("role_hash: 0x" + role_hash.hex())
        tx = self.permission.functions.grantRole(role_hash, addr).build_transaction({
                "from": self.account
            })
        return self._build_send(tx)

    def revoke_role(self, role_name: str, addr: str):
        role_hash = getattr(self.permission.functions, f"{role_name}_ROLE")().call()
        tx = self.permission.functions.revokeRole(role_hash, addr).build_transaction({"from": self.account})
        return self._build_send(tx)

    # ------------------------ 业务操作 ----------------------------
    def register_batch(self, batch_id: int, metadata: str):
        tx = self.permission.functions.registerBatch(batch_id, metadata).build_transaction({
            "from": self.account
        })
        return self._build_send(tx)

    def record_stage(
        self,
        batch_id: int,
        stage_enum: int,
        location: str,
        timestamp: int,
    ):
        tx = self.permission.functions.recordStage(
            batch_id, stage_enum, location, timestamp
        ).build_transaction({"from": self.account})
        return self._build_send(tx)

    def transfer_ownership(self, batch_id: int, new_owner: str):
        tx = self.permission.functions.requestOwnershipTransfer(
            batch_id,
            new_owner
        ).build_transaction({"from": self.account})
        return self._build_send(tx)

    # ══════════════════════════════════════════════════════════════
    #                    写交易：直接调用 FruitTraceability
    # ══════════════════════════════════════════════════════════════

    def mark_sold(self, batch_id: int, buyer: str):
        """若 FruitTraceability 有 external sold() 之类函数，可加在此处"""
        tx = self.trace.functions.markSold(batch_id, buyer).build_transaction()
        return self._build_send(tx)
