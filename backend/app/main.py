from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from app.core.database import engine, Base
from app.core.config import settings
from app.api.routes import (
    auth, users, inventory, demands, approvals,
    transfers, reports, audit, locations,
    departments, categories, dashboard
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Lady Andal ERP API...")
    async with engine.begin() as conn:
        # Create tables (use migrations in production)
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await engine.dispose()

app = FastAPI(
    title="Lady Andal ERP API",
    version="1.0.0",
    description="Enterprise Resource Planning System for Lady Andal Institution",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# API Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(demands.router, prefix="/api/v1/demands", tags=["Demands"])
app.include_router(approvals.router, prefix="/api/v1/approvals", tags=["Approvals"])
app.include_router(transfers.router, prefix="/api/v1/transfers", tags=["Transfers"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["Departments"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

@app.get("/")
async def root():
    return {
        "message": "Lady Andal ERP API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lady-andal-erp"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
