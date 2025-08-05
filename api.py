import asyncio

from fastapi import FastAPI
from pydantic import BaseModel
import asyncpg

from fruit_contracts.ContractsLite import ContractsLite
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from datetime import datetime
from contextlib import asynccontextmanager
from offchain import sync_loop_async
from web3 import Web3
import os

api_pool = None
DB_DSN = f"postgresql://{os.getenv('DB_USER', 'fruit_user')}:{os.getenv('DB_PASSWORD', 'fruit_pass')}@" \
         f"{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'fruit_chain')}"

async def init_api_pool():
    global api_pool
    api_pool = await asyncpg.create_pool(dsn=DB_DSN)
    print("✅ Main thread DB connection pool initialized")

@asynccontextmanager
async def api_conn():
    if api_pool is None:
        raise RuntimeError("❌ api_pool not initialized")
    async with api_pool.acquire() as conn:
        yield conn

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_api_pool()                  # ✅ DB pool for main thread
    asyncio.create_task(sync_loop_async())  # ✅ Background task (separately creates pool inside offchain module)
    yield

app = FastAPI(
    title="Fruit Supply Chain API",
    description="API for interacting with blockchain-based fruit traceability system",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or restrict to ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from dotenv import load_dotenv
load_dotenv()

# ===== Initialize smart contract instance =====
contracts = ContractsLite(
    rpc_url=os.getenv("RPC_URL"),
    permission_addr=os.getenv("PERMISSION_ADDR"),
    trace_addr=os.getenv("TRACE_ADDR"),
    chain_id=int(os.getenv("CHAIN_ID"))
)

# ===================== Transaction Construction =====================
class RegisterBatchRequest(BaseModel):
    from_address: str
    batch_id: int
    metadata: str

class RecordStageRequest(BaseModel):
    from_address: str
    batch_id: int
    stage: int
    location: str
    timestamp: int

class TransferOwnershipRequest(BaseModel):
    from_address: str
    batch_id: int
    new_owner: str

class GrantRoleRequest(BaseModel):
    from_address: str
    role: str
    target_address: str

class RevokeRoleRequest(BaseModel):
    from_address: str
    role: str
    target_address: str

@app.post("/tx/register_batch", summary="Build transaction to register batch", tags=["Transactions"])
def register_batch_tx(req: RegisterBatchRequest):
    return contracts.build_register_batch_tx(req.from_address, req.batch_id, req.metadata)

@app.post("/tx/record_stage", summary="Build transaction to record stage", tags=["Transactions"])
def record_stage_tx(req: RecordStageRequest):
    return contracts.build_record_stage_tx(req.from_address, req.batch_id, req.stage, req.location, req.timestamp)

@app.post("/tx/transfer_ownership", summary="Build transaction to transfer ownership", tags=["Transactions"])
def transfer_ownership_tx(req: TransferOwnershipRequest):
    return contracts.build_transfer_ownership_tx(req.from_address, req.batch_id, req.new_owner)

@app.post("/tx/grant_role", summary="Build transaction to grant role", tags=["Transactions"])
def grant_role_tx(req: GrantRoleRequest):
    return contracts.build_grant_role_tx(req.from_address, req.role, req.target_address)

@app.post("/tx/revoke_role", summary="Build transaction to revoke role", tags=["Transactions"])
def revoke_role_tx(req: RevokeRoleRequest):
    return contracts.build_revoke_role_tx(req.from_address, req.role, req.target_address)

# ===================== Query APIs =====================
@app.get("/read/batch_overview/{batch_id}", summary="Get batch overview", tags=["Read"])
async def get_batch_overview(batch_id: int):
    try:
        async with api_conn() as conn:
            row = await conn.fetchrow(
                """
                SELECT batch_id, metadata, current_owner, created_at
                FROM batches WHERE batch_id = $1
                """,
                batch_id
            )
        if row:
            return {
                "batch_id": row["batch_id"],
                "metadata": row["metadata"],
                "current_owner": row["current_owner"],
                "created_at": row["created_at"].isoformat(),
            }
    except Exception as e:
        print(f"[warn] DB fallback for batch_overview: {e}")

    return contracts.get_batch_overview(batch_id)


@app.get("/read/stage/{batch_id}/{index}", summary="Get batch stage detail", tags=["Read"])
async def get_stage(batch_id: int, index: int):
    try:
        async with api_conn() as conn:
            row = await conn.fetchrow(
                """
                SELECT stage, location, ts_block, actor
                FROM stages
                WHERE batch_id = $1
                ORDER BY id
                LIMIT 1 OFFSET $2
                """,
                batch_id,
                index,
            )
        if row:
            return {
                "stage": row["stage"],
                "location": row["location"],
                "timestamp": row["ts_block"].isoformat(),
                "actor": row["actor"],
            }
    except Exception as e:
        print(f"[warn] DB fallback for stage: {e}")

    return contracts.get_stage(batch_id, index)


@app.get("/read/current_owner/{batch_id}", summary="Get current owner of batch", tags=["Read"])
async def get_current_owner(batch_id: int):
    try:
        async with api_conn() as conn:
            row = await conn.fetchrow(
                "SELECT current_owner FROM batches WHERE batch_id = $1",
                batch_id,
            )
        if row:
            return {"owner": row["current_owner"]}
    except Exception as e:
        print(f"[warn] DB fallback triggered: {e}")

    try:
        return {"owner": contracts.get_current_owner(batch_id)}
    except Exception:
        raise HTTPException(status_code=404, detail="Batch not found on-chain or off-chain")


@app.get("/read/has_role/{role}/{account}", summary="Check if account has specific role", tags=["Read"])
def has_role(role: str, account: str):
    return {"has_role": contracts.has_role(role, account)}


@app.get("/read/roles/{address}", summary="Get all roles for address", tags=["Read"])
async def get_roles(address: str):
    try:
        address = Web3.to_checksum_address(address)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid address format")

    known_roles = {
        "FARMER": "FARMER_ROLE",
        "INSPECTOR": "INSPECTOR_ROLE",
        "RETAILER": "RETAILER_ROLE",
        "CONSUMER": "CONSUMER_ROLE",
        "DEFAULT_ADMIN": "DEFAULT_ADMIN",
    }

    # Try fetching from DB first
    try:
        async with api_conn() as conn:
            rows = await conn.fetch(
                "SELECT role_name FROM user_roles WHERE address = $1",
                address,
            )
        if rows:
            roles = {k: False for k in known_roles}
            for r in rows:
                for k, v in known_roles.items():
                    if r["role_name"] == v:
                        roles[k] = True
            return roles
    except Exception as e:
        print(f"[warn] database read failed: {e}")

    # Otherwise, fallback to chain + write back to DB
    roles = {}
    for k, role_str in known_roles.items():
        has = contracts.has_role(role_str, address)
        roles[k] = has
        if has:
            try:
                async with api_conn() as conn:
                    await conn.execute(
                        """
                        INSERT INTO user_roles(address, role_name, granted_at)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (address, role_name) DO NOTHING
                        """,
                        address,
                        role_str,
                        datetime.utcnow(),
                    )
            except Exception as e:
                print(f"[warn] Failed to insert role {role_str} for {address}: {e}")

    return roles
