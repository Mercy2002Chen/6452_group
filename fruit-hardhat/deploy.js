const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  // ==== 🧾 配置信息：写死在脚本里 ====
  const PRIVATE_KEY = "6324443524a62447cf4565ea95d7ec4e1e90d0ab7d8d2529be95255faa2cf1ac";
  const RPC_URL = "https://sepolia.infura.io/v3/beff8273b87e4f0e946bb817db57f1af";

  // ==== 🔗 设置 provider 和 signer ====
 const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("部署账户地址：", await wallet.getAddress());

  const PermissionControlFactory = await ethers.getContractFactory("PermissionControl", wallet);
  const permissionContract = await PermissionControlFactory.deploy();
  await permissionContract.waitForDeployment();

  const permAddr = await permissionContract.getAddress();
  console.log("✅ PermissionControl 合约部署成功：", permAddr);

  // ✅ 正确读取内部合约地址
  const fruitAddr = await permissionContract.traceabilityContract();
  console.log("📦 内部 FruitTraceability 地址：", fruitAddr);
}

main().catch((err) => {
  console.error("❌ 部署失败：", err);
  process.exit(1);
});
