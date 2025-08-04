## 🚀 启动项目

### 1️⃣ 后端服务（FastAPI）

确保已安装依赖（如未安装可运行）：

```bash
pip install -r requirements.txt
```

然后在项目根目录下运行：

```bash
uvicorn api:app --reload
```

- 默认后端服务运行在：`http://127.0.0.1:8000`
- 若 `api.py` 文件位置或名称不同，请相应修改 `api:app`

---

### 2️⃣ 前端界面（Vite + React）

进入前端项目目录（例如 `fruit-dapp/`）：

```bash
cd fruit-dapp
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

- 默认前端服务运行在：`http://localhost:5173`
- 若调用后端 API，请确保前端代码中的接口地址正确配置，例如：

```js
const API_BASE_URL = "http://127.0.0.1:8000";
```

---

### 📦 项目结构（可选）

```plaintext
.
├── api.py               # FastAPI 后端主文件
├── requirements.txt     # Python 后端依赖
├── fruit-dapp/          # 前端项目文件夹（Vite + React）
│   ├── package.json
│   ├── index.html
│   └── src/
```

---

如需部署或打包构建等说明，可在后续补充对应章节。

---

### ⚙️ 环境变量配置（.env）

请在项目根目录下创建 `.env` 文件，并根据以下示例配置：

```env
# 区块链相关配置
RPC_URL=https://sepolia.infura.io/v3/beff8273b87e4f0e946bb817db57f1af
CHAIN_ID=11155111
PERMISSION_ADDR=0xb6af7e98f40aab7c79069d21f90bb60b857b481e
TRACE_ADDR=0x31Ef8665357fdA2f94b936B3A9F4B3577c847089

# PostgreSQL 数据库配置
DB_NAME=fruit_chain
DB_USER=fruit_user
DB_PASSWORD=fruit_pass
DB_HOST=localhost
DB_PORT=5432
```

📌 **说明：** 你只需要根据实际部署情况修改合约地址（`*_ADDR`）与数据库连接信息（`DB_*`），其他保持默认即可。