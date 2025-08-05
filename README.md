## 🐳 One-Click Startup with Docker

This project includes a pre-configured `docker-compose.yml` file that allows you to start the frontend, backend, and database services with a single command.

### ✅ Startup Command

Run the following in the root directory:

```bash
docker-compose up --build
```

---

### ⚙️ Environment Variable Configuration (`.env`)

Create a `.env` file in the root directory with the following content:

```env
# Blockchain settings
RPC_URL=https://sepolia.infura.io/v3/beff8273b87e4f0e946bb817db57f1af
CHAIN_ID=11155111
PERMISSION_ADDR=0xb6af7e98f40aab7c79069d21f90bb60b857b481e
TRACE_ADDR=0x31Ef8665357fdA2f94b936B3A9F4B3577c847089

# PostgreSQL settings
DB_NAME=fruit_chain
DB_USER=fruit_user
DB_PASSWORD=fruit_pass
DB_HOST=localhost
DB_PORT=5432
```

📌 **Note:** Only update the contract addresses (`*_ADDR`) and database connection details (`DB_*`) based on your actual deployment. Defaults are sufficient for local development.

---

## 🚀 Start Without Docker (Manual Mode)

### 1️⃣ Backend (FastAPI)

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
uvicorn api:app --reload
```

- The backend will be available at: `http://127.0.0.1:8000`
- If the main file is not `api.py`, modify `api:app` accordingly

---

### 2️⃣ Frontend (Vite + React)

Go to the frontend directory (e.g., `fruit-dapp/`) and run:

```bash
cd fruit-dapp
npm install
npm run dev
```

- The frontend will be available at: `http://localhost:5173`
- Ensure the frontend is pointing to the correct API base URL:

```js
const API_BASE_URL = "http://127.0.0.1:8000";
```

---

### 📦 Project Structure (Optional)

```plaintext
.
├── api.py               # FastAPI backend main file
├── requirements.txt     # Backend dependencies
├── fruit-dapp/          # Frontend project (Vite + React)
│   ├── package.json
│   ├── index.html
│   └── src/
```
