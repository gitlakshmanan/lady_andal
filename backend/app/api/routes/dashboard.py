from datetime import datetime, timedelta

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.demand import Demand
from app.models.inventory import Product, StockLedger
from app.models.transfer import Transfer
from app.models.user import User
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Get total products
    product_count_result = await db.execute(select(func.count()).select_from(Product))
    total_products = product_count_result.scalar()

    # Get pending demands
    pending_demands_result = await db.execute(
        select(func.count())
        .select_from(Demand)
        .where(Demand.status.in_(["SUBMITTED", "REVIEWED"]))
    )
    pending_demands = pending_demands_result.scalar()

    # Get pending transfers
    pending_transfers_result = await db.execute(
        select(func.count()).select_from(Transfer).where(Transfer.status == "SUBMITTED")
    )
    pending_transfers = pending_transfers_result.scalar()

    # Get low stock count
    # This is a simplified version - you'd need to join with current stock
    low_stock_count = 0

    return {
        "total_products": total_products or 0,
        "pending_demands": pending_demands or 0,
        "pending_transfers": pending_transfers or 0,
        "low_stock_count": low_stock_count,
    }


@router.get("/demand-trend")
async def get_demand_trend(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Get last 6 months demand trend
    months = []
    counts = []

    for i in range(5, -1, -1):
        month_date = datetime.now() - timedelta(days=30 * i)
        month_name = month_date.strftime("%b")
        months.append(month_name)

        # Simplified - you'd need proper date filtering
        counts.append(0)

    return {"months": months, "counts": counts}
