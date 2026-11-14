import io
from typing import Dict, Any
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class PDFInvoiceGenerator:
    @staticmethod
    def generate_invoice_pdf(invoice_data: Dict[str, Any]) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=28,
            leftMargin=28,
            topMargin=28,
            bottomMargin=28
        )
        elements = []
        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            'InvoiceTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#1E1B4B') # Dark indigo
        )

        subtitle_style = ParagraphStyle(
            'InvoiceSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569')
        )

        header_label_style = ParagraphStyle(
            'HeaderLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#4F46E5')
        )

        cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#0F172A')
        )

        cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=cell_style,
            fontName='Helvetica-Bold'
        )

        # 1. Header: Seller Info (Left) & Tax Invoice Meta (Right)
        seller_name = invoice_data.get('seller_name', 'LAX360 STORE')
        seller_gstin = invoice_data.get('seller_gstin', 'N/A')
        seller_address = invoice_data.get('seller_address', '')
        seller_state = invoice_data.get('seller_state', '')
        seller_phone = invoice_data.get('seller_phone', '')

        left_header = [
            Paragraph(f"<b>{seller_name}</b>", title_style),
            Paragraph(f"{seller_address}", subtitle_style),
            Paragraph(f"State: {seller_state} | Phone: {seller_phone}", subtitle_style),
            Paragraph(f"<b>GSTIN:</b> {seller_gstin}", header_label_style),
        ]

        inv_num = invoice_data.get('invoice_number', 'INV-001')
        inv_date = invoice_data.get('created_at', '')[:10]
        status = invoice_data.get('payment_status', 'PAID')

        right_header = [
            Paragraph("<b>TAX INVOICE</b>", title_style),
            Paragraph(f"<b>Invoice No:</b> {inv_num}", cell_bold),
            Paragraph(f"<b>Date:</b> {inv_date}", cell_style),
            Paragraph(f"<b>Payment Status:</b> <font color='{'#16A34A' if status=='PAID' else '#DC2626'}'>{status}</font>", cell_bold),
            Paragraph(f"<b>Place of Supply:</b> {invoice_data.get('customer_state', seller_state)}", cell_style)
        ]

        header_table = Table([[left_header, right_header]], colWidths=[310, 230])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10)
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 10))

        # 2. Bill To & Ship To
        cust_name = invoice_data.get('customer_name', 'Walk-in Customer')
        cust_phone = invoice_data.get('customer_phone', '')
        cust_gstin = invoice_data.get('customer_gstin', '')
        cust_addr = invoice_data.get('customer_address', '')
        cust_state = invoice_data.get('customer_state', '')

        bill_to_content = [
            Paragraph("<b>BILLED TO (BUYER):</b>", header_label_style),
            Paragraph(f"<b>{cust_name}</b>", cell_bold),
            Paragraph(f"Phone: {cust_phone or 'N/A'}", cell_style),
            Paragraph(f"Address: {cust_addr or 'N/A'} ({cust_state})", cell_style),
            Paragraph(f"GSTIN: {cust_gstin or 'Unregistered'}", cell_style)
        ]

        party_table = Table([[bill_to_content]], colWidths=[540])
        party_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8)
        ]))
        elements.append(party_table)
        elements.append(Spacer(1, 14))

        # 3. Itemized Table
        headers = [
            Paragraph("<b>#</b>", cell_bold),
            Paragraph("<b>Item / Description</b>", cell_bold),
            Paragraph("<b>HSN/SAC</b>", cell_bold),
            Paragraph("<b>Qty</b>", cell_bold),
            Paragraph("<b>Rate (₹)</b>", cell_bold),
            Paragraph("<b>Taxable (₹)</b>", cell_bold),
            Paragraph("<b>GST</b>", cell_bold),
            Paragraph("<b>Total (₹)</b>", cell_bold)
        ]

        table_rows = [headers]
        items = invoice_data.get('items', [])
        is_inter_state = invoice_data.get('is_inter_state', False)

        for idx, item in enumerate(items, 1):
            name = item.get('name', 'Item')
            hsn = item.get('hsn_sac', '-')
            qty = f"{item.get('quantity', 1)} {item.get('unit', '')}"
            rate = f"{float(item.get('unit_price', 0)):.2f}"
            taxable = f"{float(item.get('taxable_amount', 0)):.2f}"
            tax_rate = item.get('tax_rate', 0)
            tax_text = f"IGST {tax_rate}%" if is_inter_state else f"{float(tax_rate)/2}% + {float(tax_rate)/2}%"
            line_total = f"{float(item.get('line_total', 0)):.2f}"

            table_rows.append([
                Paragraph(str(idx), cell_style),
                Paragraph(name, cell_bold),
                Paragraph(hsn, cell_style),
                Paragraph(qty, cell_style),
                Paragraph(rate, cell_style),
                Paragraph(taxable, cell_style),
                Paragraph(tax_text, cell_style),
                Paragraph(line_total, cell_bold)
            ])

        items_table = Table(table_rows, colWidths=[25, 175, 55, 55, 55, 60, 55, 60])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EEF2FF')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 14))

        # 4. Totals and Summary Block
        subtotal = f"₹{float(invoice_data.get('total_taxable', 0)):.2f}"
        cgst = f"₹{float(invoice_data.get('cgst_amount', 0)):.2f}"
        sgst = f"₹{float(invoice_data.get('sgst_amount', 0)):.2f}"
        igst = f"₹{float(invoice_data.get('igst_amount', 0)):.2f}"
        grand_total = f"₹{float(invoice_data.get('final_payable', 0)):.2f}"
        words = invoice_data.get('amount_in_words', '')

        left_summary = [
            Paragraph(f"<b>Amount in Words:</b><br/>{words}", cell_style),
            Spacer(1, 8),
            Paragraph(f"<b>Terms & Conditions:</b><br/>{invoice_data.get('terms', 'Thank you for your business.')}", subtitle_style)
        ]

        totals_data = [
            [Paragraph("Taxable Amount:", cell_style), Paragraph(subtotal, cell_bold)],
        ]
        if is_inter_state:
            totals_data.append([Paragraph("Total IGST:", cell_style), Paragraph(igst, cell_bold)])
        else:
            totals_data.append([Paragraph("Total CGST:", cell_style), Paragraph(cgst, cell_bold)])
            totals_data.append([Paragraph("Total SGST:", cell_style), Paragraph(sgst, cell_bold)])

        totals_data.append([Paragraph("<b>Grand Total:</b>", cell_bold), Paragraph(f"<b>{grand_total}</b>", title_style)])
        totals_data.append([Paragraph("Paid Amount:", cell_style), Paragraph(f"₹{float(invoice_data.get('paid_amount', 0)):.2f}", cell_bold)])
        totals_data.append([Paragraph("Balance Due:", cell_style), Paragraph(f"₹{float(invoice_data.get('balance_due', 0)):.2f}", cell_bold)])

        right_totals = Table(totals_data, colWidths=[120, 100])
        right_totals.setStyle(TableStyle([
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('PADDING', (0,0), (-1,-1), 3),
            ('LINEBELOW', (0,-3), (1,-3), 1, colors.HexColor('#E2E8F0'))
        ]))

        summary_table = Table([[left_summary, right_totals]], colWidths=[320, 220])
        summary_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4)
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 25))

        # 5. Signatory Footer
        sign_table = Table([[
            Paragraph(f"Generated via LAX360 Billing SaaS<br/>Universal Multi-Category POS Engine", subtitle_style),
            Paragraph(f"For <b>{seller_name}</b><br/><br/><br/>___________________________<br/>Authorized Signatory", cell_style)
        ]], colWidths=[340, 200])
        sign_table.setStyle(TableStyle([
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM')
        ]))
        elements.append(KeepTogether(sign_table))

        doc.build(elements)
        buffer.seek(0)
        return buffer
