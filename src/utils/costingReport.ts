import { Ticket } from '@/types/ticket';

const formatCostValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  return value;
};

const sanitizeDescription = (description: string) => {
  return description.replace(/\n/g, '<br/>');
};

interface ExportCostingOptions {
  onFailure?: (message: string) => void;
}

export const exportCostingReport = (
  ticket: Ticket,
  descriptionOverride?: string,
  costOverride?: string | number | null,
  options?: ExportCostingOptions
) => {
  const description = descriptionOverride || ticket.external_supplier_description || 'N/A';
  const costValue = costOverride ?? ticket.external_supplier_cost;
  const costDisplay = formatCostValue(costValue);

  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    options?.onFailure?.('Popup blocked. Please allow popups to export the costing report.');
    return;
  }

  reportWindow.document.write(`
    <html>
      <head>
        <title>Ticket Costing Report - ${ticket.title}</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin: 0 0 12px; color: #4b5563; }
          p { margin: 4px 0; color: #4b5563; }
          .section { margin-top: 16px; }
          .label { font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>Ticket Costing Report</h1>
        <h2>${ticket.title}</h2>
        <div class="section">
          <p><span class="label">Ticket ID:</span> ${ticket.id}</p>
          <p><span class="label">Status:</span> ${ticket.status.replace('_', ' ')}</p>
          <p><span class="label">Priority:</span> ${ticket.priority}</p>
          <p><span class="label">Created:</span> ${new Date(ticket.created_at).toLocaleString()}</p>
          <p><span class="label">Department:</span> ${ticket.departments?.name || 'N/A'}</p>
        </div>
        <div class="section">
          <p><span class="label">Requires External Suppliers:</span> Yes</p>
          <p><span class="label">Cost (MUR):</span> ${costDisplay}</p>
        </div>
        <div class="section">
          <p class="label">Costing Description</p>
          <p>${sanitizeDescription(description)}</p>
        </div>
      </body>
    </html>
  `);

  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
};
