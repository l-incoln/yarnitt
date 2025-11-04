## Quick Start

To get started, please follow these instructions:

Create a local backend .env from the template and adjust if needed:

```bash
cp backend/.env.template backend/.env
```

# The template includes a local MONGO_URI pointing at the dev mongo:
```
MONGO_URI=mongodb://admin_user:AdminPass123!@127.0.0.1:27017/yarnitt?authSource=admin
```
# Do NOT use these credentials in production. Override via environment variables as needed.