import { supabase, BUCKETS } from './supabase';
import type { Booking, Property, Customer } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { numberToFrenchWords } from '../utils/numberToWords';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvoiceData {
  invoiceNumber: string;
  booking: Booking;
  property: Property;
  customer?: Customer;
  generatedAt: Date;
}

/**
 * Get invoice number from booking
 * Always uses the booking's bookingNumber - ensures consistency
 */
export async function getInvoiceNumber(booking: Booking): Promise<string> {
  // Always use booking number as invoice number
  if (booking.bookingNumber) {
    return booking.bookingNumber;
  }

  // If booking doesn't have a number yet, we need to assign one first
  // This should rarely happen, but we'll generate one based on creation date
  const { generateBookingNumber } = await import('./bookingService');
  const bookingNumber = await generateBookingNumber(booking.createdAt);
  
  // Update the booking with the number (async, don't wait)
  supabase
    .from('bookings')
    .update({ booking_number: bookingNumber })
    .eq('id', booking.id)
    .then(() => {
      console.log(`Assigned booking number ${bookingNumber} to booking ${booking.id}`);
    })
    .catch(err => {
      console.error('Error assigning booking number:', err);
    });
  
  return bookingNumber;
}

/**
 * Find existing invoice for a booking
 * Invoices are stored as: invoices/YYYY/BOOKING_ID/XXXX-YY.pdf
 * Uses booking number to find the invoice
 */
export async function findExistingInvoice(booking: Booking): Promise<{ invoiceNumber: string; pdfUrl: string } | null> {
  try {
    if (!booking.bookingNumber) {
      return null;
    }

    // Search for invoices using booking number
    const currentYear = new Date().getFullYear();
    const yearsToCheck = [currentYear, currentYear - 1]; // Check current and previous year
    
    for (const year of yearsToCheck) {
      const folderPath = `${year}/${booking.id}`;
      const invoiceFileName = `${booking.bookingNumber}.pdf`;
      
      // Try to get the specific invoice file
      const { data: urlData } = supabase.storage
        .from(BUCKETS.INVOICES)
        .getPublicUrl(`${folderPath}/${invoiceFileName}`);
      
      // Check if file exists by trying to list it
      const { data: files, error } = await supabase.storage
        .from(BUCKETS.INVOICES)
        .list(folderPath, {
          limit: 100,
        });

      if (error && error.message !== 'The resource was not found') {
        continue;
      }

      if (files && files.length > 0) {
        // Look for invoice with booking number
        const invoiceFile = files.find(f => f.name === invoiceFileName);
        if (invoiceFile) {
          return {
            invoiceNumber: booking.bookingNumber,
            pdfUrl: urlData.publicUrl,
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding existing invoice:', error);
    return null;
  }
}

/**
 * Generate invoice HTML content
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const { invoiceNumber, booking, property, customer, generatedAt } = data;
  
  const checkInDate = format(new Date(booking.checkIn), 'dd/MM/yyyy', { locale: fr });
  const checkOutDate = format(new Date(booking.checkOut), 'dd/MM/yyyy', { locale: fr });
  const invoiceDate = format(generatedAt, 'dd/MM/yyyy', { locale: fr });
  
  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const unitPrice = Math.round(booking.totalPriceFCFA / nights);
  const totalAmount = booking.totalPriceFCFA;
  const amountInWords = numberToFrenchWords(totalAmount);
  
  // Format customer info
  const customerName = customer?.name || booking.guestName;
  const customerPhone = customer?.phone || booking.guestPhone || '';
  const customerEmail = customer?.email || booking.guestEmail || '';
  const customerAddress = customer?.address || '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture ZN Enterprises</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 14px; 
            line-height: 1.4; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
        }
        .invoice-container { 
            width: 210mm; 
            height: 297mm; 
            margin: 0 auto; 
            background: white; 
            padding: 15mm; 
            position: relative; 
            display: flex; 
            flex-direction: column; 
            overflow: hidden;
        }
        
        .content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; flex-shrink: 0; }
        .logo-section { display: flex; align-items: center; }
        .logo-box { background: #000; color: #fff; padding: 8px; font-weight: bold; font-size: 20px; margin-right: 12px; }
        .company-name { font-weight: bold; font-size: 16px; }
        .company-subtitle { font-size: 11px; color: #666; }
        
        .invoice-title { font-size: 28px; font-weight: bold; color: #e0e0e0; letter-spacing: 4px; margin-bottom: 15px; flex-shrink: 0; }
        
        .contact-info { display: flex; justify-content: space-between; margin-bottom: 20px; flex-shrink: 0; }
        .client-section { border-left: 4px solid #000; padding-left: 12px; font-size: 12px; }
        .client-label { font-weight: bold; text-transform: uppercase; margin-bottom: 4px; font-size: 11px; }
        
        .invoice-details { margin-bottom: 20px; font-weight: bold; font-size: 12px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; flex-shrink: 0; }
        th { background-color: #f2f2f2; text-align: left; padding: 8px; border: 1px solid #ddd; font-size: 11px; }
        td { padding: 8px; border: 1px solid #ddd; vertical-align: top; font-size: 11px; }
        
        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 15px; flex-shrink: 0; }
        .totals-table { width: 220px; }
        .totals-table td { font-weight: bold; font-size: 11px; padding: 6px; }
        
        .amount-words { margin: 15px 0; font-style: italic; font-size: 11px; flex-shrink: 0; }
        
        .footer { 
            margin-top: auto; 
            padding-top: 15px; 
            border-top: 1px solid #eee; 
            font-size: 9px; 
            flex-shrink: 0;
        }
        .bank-details { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-top: 8px; font-family: monospace; font-size: 9px; }
        
        @media print {
            body { background: none; padding: 0; margin: 0; }
            .invoice-container { 
                box-shadow: none; 
                border: none; 
                width: 210mm; 
                min-height: 297mm; 
                padding: 20mm; 
            }
            @page { 
                size: A4; 
                margin: 0; 
            }
        }
    </style>
</head>
<body>

<div class="invoice-container">
    <div class="content">
    <div class="header">
        <div class="logo-section">
            <div class="logo-box">ZNE</div>
            <div>
                <div class="company-name">ETS ZN ENTERPRISES</div>
                <div class="company-subtitle">LOGEMENTS MEUBLES DE QUALITE</div>
            </div>
        </div>
        <div style="text-align: right;">
            <div>+237 6 88 31 73 23</div>
            <div>hello@zn-enterprises.com</div>
            <div>Etoa-Meki, Yaounde, Cameroun</div>
        </div>
    </div>

    <div class="invoice-title">FACTURE</div>

    <div class="contact-info">
        <div class="client-section">
            <div class="client-label">Client</div>
            <strong>${customerName}</strong><br>
            ${customerAddress ? `${customerAddress}<br>` : ''}
            ${customerPhone ? `Tel: ${customerPhone}<br>` : ''}
            ${customerEmail ? `Email: ${customerEmail}` : ''}
        </div>
        <div class="invoice-details">
            Facture N°: ${invoiceNumber}<br>
            Date d'émission: ${invoiceDate}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Designation</th>
                <th>Prix Unitaire (FCFA)</th>
                <th>Nuitées</th>
                <th>Total (FCFA)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Location Appartement Meublé - ${property.name} du ${checkInDate} au ${checkOutDate}</td>
                <td>${unitPrice.toLocaleString('fr-FR')}</td>
                <td>${nights}</td>
                <td>${totalAmount.toLocaleString('fr-FR')}</td>
            </tr>
        </tbody>
    </table>

    <div class="totals-section">
        <table class="totals-table">
            <tr>
                <td>Sous total HT</td>
                <td>${totalAmount.toLocaleString('fr-FR')}</td>
            </tr>
            <tr>
                <td>TVA</td>
                <td>NA</td>
            </tr>
            <tr style="background: #eee;">
                <td>TOTAL</td>
                <td>${totalAmount.toLocaleString('fr-FR')}</td>
            </tr>
        </table>
    </div>

    <div class="amount-words">
        Arrêter la présente facture a la somme de: <strong>${amountInWords} francs CFA</strong>
    </div>

    </div>
    
    <div class="footer">
        <div class="bank-details">
            RC: YAO/2025/A/357 | NIU:P029425255862F <br>
            BANK: UNITED BANK FOR AFRICA (UBA) | NAME: ETS ZN ENTERPRISES<br>
            IBAN: CM21 10033 05218 18016000479 44 | SWIFT CODE: UNAFCMCX
        </div>
    </div>
</div>

</body>
</html>`;
}

/**
 * Generate and download invoice as PDF
 */
export async function generateInvoicePDF(
  booking: Booking,
  property: Property,
  customer?: Customer
): Promise<{ invoiceNumber: string; pdfUrl: string }> {
  // Ensure booking has a booking number before generating invoice
  let invoiceNumber = booking.bookingNumber;
  
  if (!invoiceNumber) {
    // Import booking service to generate number
    const { generateBookingNumber } = await import('./bookingService');
    invoiceNumber = await generateBookingNumber(booking.createdAt);
    
    // Update the booking with the number
    const { supabase } = await import('./supabase');
    await supabase
      .from('bookings')
      .update({ booking_number: invoiceNumber })
      .eq('id', booking.id);
    
    // Update the booking object
    booking.bookingNumber = invoiceNumber;
  }
  
  const generatedAt = new Date();

  // Create invoice data
  const invoiceData: InvoiceData = {
    invoiceNumber,
    booking,
    property,
    customer,
    generatedAt,
  };

  // Generate HTML
  const htmlContent = generateInvoiceHTML(invoiceData);

  // Create a temporary element to render HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm';
  tempDiv.style.minHeight = '297mm';
  document.body.appendChild(tempDiv);

  try {
    // Wait a bit for the layout to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convert HTML to canvas then to PDF - force single page
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794, // 210mm at 96 DPI ≈ 794px
      height: 1123, // 297mm at 96 DPI ≈ 1123px
      windowWidth: 794,
      windowHeight: 1123,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = 297; // A4 height in mm - force single page

    // Add image to fit exactly one A4 page (no pagination)
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Generate PDF blob
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });

    // Upload to Supabase storage - store with booking ID for easy retrieval
    const year = generatedAt.getFullYear();
    const fileName = `${year}/${booking.id}/${invoiceNumber}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKETS.INVOICES)
      .upload(fileName, pdfFile, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting if same invoice number
      });

    if (uploadError) {
      console.error('Error uploading invoice:', uploadError);
      throw new Error(`Failed to upload invoice: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKETS.INVOICES)
      .getPublicUrl(uploadData.path);

    // Don't auto-download - return URL for preview
    // pdf.save(`${invoiceNumber}.pdf`);

    // Clean up
    document.body.removeChild(tempDiv);

    return {
      invoiceNumber,
      pdfUrl: urlData.publicUrl,
    };
  } catch (error) {
    // Clean up on error
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}

