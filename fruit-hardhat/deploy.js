import { ethers } from "ethers";
import permissionAbi from "./abis/PermissionControl.json"; // 包含 abi 和 bytecode

export default function DeployContractButton() {
  const deployContract = async () => {
    if (!window.ethereum) {
      alert("请安装 MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const factory = new ethers.ContractFactory(
      permissionAbi.abi,
      permissionAbi.bytecode,
      signer
    );

    try {
      const contract = await factory.deploy(); // 用户钱包会弹出确认部署交易
      await contract.waitForDeployment();

      const addr = await contract.getAddress();
      alert(`✅ 合约部署成功: ${addr}`);
    } catch (err) {
      console.error("❌ 合约部署失败", err);
      alert("合约部署失败");
    }
  };

  return <button onClick={deployContract}>部署 Permission 合约</button>;
}
