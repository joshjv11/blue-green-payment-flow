/**
 * Shared email footer templates for InvoiceFlow
 */

export const testFooter = `
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
    This is a test email from InvoiceFlow to verify delivery only. No action is required.
  </p>
`;

export const productionFooter = (timestamp?: string) => `
  <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 35px 0;">
  <div style="text-align: center;">
    <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0;">
      This is an automated reminder from InvoiceFlow
    </p>
    ${timestamp ? `
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        Sent on ${timestamp}
      </p>
    ` : ''}
  </div>
`;
