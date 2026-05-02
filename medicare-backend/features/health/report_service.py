import io
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem

from features.health.notification_service import generate_weekly_report
from features.health.insight_service import generate_insights
from features.health.recommendation_service import generate_recommendations
from features.health.risk_service import generate_alerts
from features.health import daily_health_service as daily_service

logger = logging.getLogger(__name__)

async def generate_pdf_report(db: AsyncSession, user_id: int) -> bytes:
    """Generate a clean, structured PDF health report using ReportLab."""
    # ── Fetch Data ──
    weekly_data = await generate_weekly_report(db, user_id)
    insights = await generate_insights(db, user_id)
    recommendations = await generate_recommendations(db, user_id)
    alerts = await generate_alerts(db, user_id)
    
    records = await daily_service.get_history(db, user_id, days=7)
    
    # ── Prepare PDF Buffer ──
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=50, leftMargin=50,
                            topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    heading_style = styles['Heading2']
    normal_style = styles['Normal']
    
    # Custom styles
    alert_style = ParagraphStyle(
        'Alert',
        parent=styles['Normal'],
        textColor='red'
    )
    
    elements = []
    
    # 1. Title
    elements.append(Paragraph("Weekly Health Report", title_style))
    elements.append(Spacer(1, 20))
    
    # 2. User Summary
    elements.append(Paragraph("User Summary", heading_style))
    elements.append(Paragraph(weekly_data.get('report', 'No summary available.'), normal_style))
    elements.append(Spacer(1, 15))
    
    # 3. Health Score
    score = weekly_data.get('score', 0)
    status = weekly_data.get('status', 'none').upper()
    elements.append(Paragraph(f"<b>Overall Health Score:</b> {score} / 100 ({status})", normal_style))
    elements.append(Spacer(1, 20))
    
    # 4. Metrics
    valid_steps = [r.steps for r in records if r.steps]
    valid_sleep = [r.sleep_hours for r in records if r.sleep_hours]
    valid_hr = [r.heart_rate for r in records if r.heart_rate]
    
    avg_steps = sum(valid_steps) // len(valid_steps) if valid_steps else 0
    avg_sleep = round(sum(valid_sleep) / len(valid_sleep), 1) if valid_sleep else 0.0
    avg_hr = int(sum(valid_hr) / len(valid_hr)) if valid_hr else 0
    
    elements.append(Paragraph("Key Metrics (7-Day Average)", heading_style))
    if not records:
        elements.append(Paragraph("No health data recorded for the past 7 days.", normal_style))
    else:
        metrics_list = [
            ListItem(Paragraph(f"<b>Average Steps:</b> {avg_steps:,}", normal_style)),
            ListItem(Paragraph(f"<b>Average Sleep:</b> {avg_sleep} hrs", normal_style)),
            ListItem(Paragraph(f"<b>Resting Heart Rate:</b> {avg_hr} bpm", normal_style))
        ]
        elements.append(ListFlowable(metrics_list, bulletType='bullet'))
    elements.append(Spacer(1, 20))
    
    # 5. Key Insights
    elements.append(Paragraph("Key Insights", heading_style))
    if insights:
        insights_list = [ListItem(Paragraph(i, normal_style)) for i in insights]
        elements.append(ListFlowable(insights_list, bulletType='bullet'))
    else:
        elements.append(Paragraph("No insights generated for this period.", normal_style))
    elements.append(Spacer(1, 20))
    
    # 6. Recommendations
    elements.append(Paragraph("Actionable Recommendations", heading_style))
    if recommendations:
        recs_list = [
            ListItem(Paragraph(f"[{r['priority'].upper()}] {r['message']}", normal_style))
            for r in recommendations
        ]
        elements.append(ListFlowable(recs_list, bulletType='bullet'))
    else:
        elements.append(Paragraph("No recommendations at this time.", normal_style))
    elements.append(Spacer(1, 20))
    
    # 7. Risk Alerts
    elements.append(Paragraph("Active Risk Alerts", heading_style))
    if alerts:
        alerts_list = [
            ListItem(Paragraph(f"<b>{a['priority'].upper()}:</b> {a['message']}", alert_style))
            for a in alerts
        ]
        elements.append(ListFlowable(alerts_list, bulletType='bullet'))
    else:
        elements.append(Paragraph("No active health risks detected.", normal_style))
        
    # Build the PDF
    doc.build(elements)
    
    # Get byte value and return
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
