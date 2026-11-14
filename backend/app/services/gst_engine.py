import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional

GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"

def validate_gstin(gstin: Optional[str]) -> bool:
    if not gstin or not gstin.strip():
        return False
    return bool(re.match(GSTIN_REGEX, gstin.strip().upper()))

def get_state_code_from_gstin(gstin: Optional[str]) -> Optional[str]:
    if gstin and len(gstin) >= 2 and gstin[:2].isdigit():
        return gstin[:2]
    return None

def quantize_currency(value: Decimal) -> Decimal:
    """Rounds to 2 decimal places using standard financial round half up"""
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def number_to_indian_currency_words(amount: Decimal) -> str:
    """Converts a decimal number to words in Indian Rupee format (Lakhs, Crores)"""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_upto_999(n: int) -> str:
        words = ""
        if n >= 100:
            words += ones[n // 100] + " Hundred "
            n %= 100
        if n >= 20:
            words += tens[n // 10] + " "
            n %= 10
        if n > 0:
            words += ones[n] + " "
        return words.strip()

    amount_val = quantize_currency(amount)
    rupees = int(amount_val)
    paise = int((amount_val - Decimal(rupees)) * 100)

    if rupees == 0 and paise == 0:
        return "Zero Rupees Only"

    result = ""
    crore = rupees // 10000000
    rupees %= 10000000
    lakh = rupees // 100000
    rupees %= 100000
    thousand = rupees // 1000
    rupees %= 1000
    hundreds = rupees

    if crore > 0:
        result += convert_upto_999(crore) + " Crore "
    if lakh > 0:
        result += convert_upto_999(lakh) + " Lakh "
    if thousand > 0:
        result += convert_upto_999(thousand) + " Thousand "
    if hundreds > 0:
        result += convert_upto_999(hundreds) + " "

    result = result.strip()
    if result:
        result += " Rupees"
    else:
        result = "Zero Rupees"

    if paise > 0:
        result += f" and {convert_upto_999(paise)} Paise"

    return result + " Only"

class GSTCalculationEngine:
    @staticmethod
    def calculate_invoice_totals(
        items: List[Dict[str, Any]],
        seller_state: str,
        buyer_state: Optional[str] = None,
        discount_percentage: Decimal = Decimal('0.0'),
        flat_discount: Decimal = Decimal('0.0'),
        shipping_charges: Decimal = Decimal('0.0')
    ) -> Dict[str, Any]:
        """
        Computes accurate GST breakdown with exact Decimal precision.
        Determines Intra-State (CGST + SGST) vs Inter-State (IGST).
        """
        is_inter_state = False
        if buyer_state and seller_state:
            is_inter_state = (buyer_state.strip().lower() != seller_state.strip().lower())

        calculated_items = []
        subtotal = Decimal('0.00')
        total_taxable = Decimal('0.00')
        total_cgst = Decimal('0.00')
        total_sgst = Decimal('0.00')
        total_igst = Decimal('0.00')
        total_discount_items = Decimal('0.00')

        hsn_tax_summary: Dict[str, Dict[str, Decimal]] = {}

        for item in items:
            qty = Decimal(str(item.get("quantity", 1)))
            unit_price = Decimal(str(item.get("unit_price", 0)))
            tax_rate = Decimal(str(item.get("tax_rate", 0)))
            item_discount = Decimal(str(item.get("discount", 0)))
            is_inclusive = bool(item.get("is_tax_inclusive", False))
            hsn = str(item.get("hsn_sac") or "COMMON")

            gross_amount = quantize_currency(qty * unit_price)
            line_after_item_disc = max(Decimal('0.00'), gross_amount - item_discount)
            total_discount_items += item_discount

            if is_inclusive and tax_rate > Decimal('0'):
                # Taxable = Gross / (1 + Rate / 100)
                factor = Decimal('1.0') + (tax_rate / Decimal('100.0'))
                taxable_amount = quantize_currency(line_after_item_disc / factor)
                total_tax = quantize_currency(line_after_item_disc - taxable_amount)
                line_total = line_after_item_disc
            else:
                taxable_amount = quantize_currency(line_after_item_disc)
                total_tax = quantize_currency(taxable_amount * (tax_rate / Decimal('100.0')))
                line_total = quantize_currency(taxable_amount + total_tax)

            if is_inter_state:
                cgst_rate = Decimal('0.00')
                cgst_amt = Decimal('0.00')
                sgst_rate = Decimal('0.00')
                sgst_amt = Decimal('0.00')
                igst_rate = tax_rate
                igst_amt = total_tax
            else:
                cgst_rate = quantize_currency(tax_rate / Decimal('2.0'))
                cgst_amt = quantize_currency(total_tax / Decimal('2.0'))
                sgst_rate = cgst_rate
                sgst_amt = total_tax - cgst_amt  # Account for odd cent rounding
                igst_rate = Decimal('0.00')
                igst_amt = Decimal('0.00')

            subtotal += gross_amount
            total_taxable += taxable_amount
            total_cgst += cgst_amt
            total_sgst += sgst_amt
            total_igst += igst_amt

            # HSN/SAC summary grouping
            if hsn not in hsn_tax_summary:
                hsn_tax_summary[hsn] = {
                    "taxable_amount": Decimal('0.00'),
                    "cgst_amount": Decimal('0.00'),
                    "sgst_amount": Decimal('0.00'),
                    "igst_amount": Decimal('0.00'),
                    "total_tax": Decimal('0.00')
                }
            hsn_tax_summary[hsn]["taxable_amount"] += taxable_amount
            hsn_tax_summary[hsn]["cgst_amount"] += cgst_amt
            hsn_tax_summary[hsn]["sgst_amount"] += sgst_amt
            hsn_tax_summary[hsn]["igst_amount"] += igst_amt
            hsn_tax_summary[hsn]["total_tax"] += total_tax

            calculated_items.append({
                **item,
                "quantity": float(qty),
                "unit_price": float(unit_price),
                "tax_rate": float(tax_rate),
                "gross_amount": float(gross_amount),
                "discount": float(item_discount),
                "taxable_amount": float(taxable_amount),
                "cgst_rate": float(cgst_rate),
                "cgst_amount": float(cgst_amt),
                "sgst_rate": float(sgst_rate),
                "sgst_amount": float(sgst_amt),
                "igst_rate": float(igst_rate),
                "igst_amount": float(igst_amt),
                "total_tax": float(total_tax),
                "line_total": float(line_total)
            })

        # Overall invoice discounts
        invoice_discount = Decimal('0.00')
        if discount_percentage > Decimal('0.0'):
            invoice_discount += quantize_currency(total_taxable * (discount_percentage / Decimal('100.0')))
        if flat_discount > Decimal('0.0'):
            invoice_discount += flat_discount

        total_taxes = total_cgst + total_sgst + total_igst
        grand_raw = (total_taxable - invoice_discount) + total_taxes + shipping_charges
        grand_total = quantize_currency(max(Decimal('0.00'), grand_raw))
        round_off = quantize_currency(Decimal(round(grand_total)) - grand_total)
        final_payable = grand_total + round_off

        # Convert HSN summary to serializable dict
        formatted_hsn_summary = []
        for hsn_code, vals in hsn_tax_summary.items():
            formatted_hsn_summary.append({
                "hsn_sac": hsn_code,
                "taxable_amount": float(quantize_currency(vals["taxable_amount"])),
                "cgst_amount": float(quantize_currency(vals["cgst_amount"])),
                "sgst_amount": float(quantize_currency(vals["sgst_amount"])),
                "igst_amount": float(quantize_currency(vals["igst_amount"])),
                "total_tax": float(quantize_currency(vals["total_tax"]))
            })

        return {
            "items": calculated_items,
            "is_inter_state": is_inter_state,
            "subtotal": float(quantize_currency(subtotal)),
            "total_taxable": float(quantize_currency(total_taxable)),
            "item_discounts": float(quantize_currency(total_discount_items)),
            "invoice_discount": float(quantize_currency(invoice_discount)),
            "cgst_amount": float(quantize_currency(total_cgst)),
            "sgst_amount": float(quantize_currency(total_sgst)),
            "igst_amount": float(quantize_currency(total_igst)),
            "total_tax": float(quantize_currency(total_taxes)),
            "shipping_charges": float(quantize_currency(shipping_charges)),
            "grand_total": float(grand_total),
            "round_off": float(round_off),
            "final_payable": float(final_payable),
            "amount_in_words": number_to_indian_currency_words(final_payable),
            "hsn_summary": formatted_hsn_summary
        }
