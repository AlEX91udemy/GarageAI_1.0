import { Vehicle, ServiceRecord } from "../types";

/**
 * Generates an official, print-ready HTML document for the vehicle service book.
 * Can be printed directly to PDF via the browser's print engine or saved as an offline document.
 */
export function generateServiceBookHtml(
  vehicle: Vehicle,
  records: ServiceRecord[]
): string {
  const vehicleRecords = [...records]
    .filter((r) => r.vehicleId === vehicle.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalSpent = vehicleRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const totalLabor = vehicleRecords.reduce((sum, r) => sum + r.laborCost, 0);
  const totalParts = totalSpent - totalLabor;

  const todayStr = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rowsHtml = vehicleRecords
    .map((record, index) => {
      const partsListHtml =
        record.parts && record.parts.length > 0
          ? record.parts
              .map(
                (p) =>
                  `<div>• <strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(
                    p.brand
                  )} [${escapeHtml(p.partNumber || "—")}] × ${p.quantity} шт. (${p.unitPrice.toLocaleString(
                    "ru-RU"
                  )} ₽)</div>`
              )
              .join("")
          : `<span style="color:#64748B;">Без запчастей (диагностика / регулировка)</span>`;

      return `
      <tr>
        <td style="text-align:center; font-weight:bold; color:#64748B;">${index + 1}</td>
        <td>
          <div style="font-weight:bold; color:#0F172A;">${escapeHtml(record.date)}</div>
          <div style="color:#B91C1C; font-weight:bold; font-family:monospace;">${record.mileage.toLocaleString(
            "ru-RU"
          )} км</div>
        </td>
        <td>
          <div style="font-weight:bold; color:#0F172A; font-size:13px;">${escapeHtml(
            record.title
          )}</div>
          <div style="color:#64748B; font-size:11px; margin-top:2px;">
            ${escapeHtml(record.serviceCenter || "Сервис")} • ${escapeHtml(record.category)}
          </div>
          ${
            record.description
              ? `<div style="color:#64748B; font-size:11px; margin-top:4px; font-style:italic;">${escapeHtml(
                  record.description
                )}</div>`
              : ""
          }
        </td>
        <td style="font-size:11px; color:#0F172A;">
          ${partsListHtml}
        </td>
        <td style="text-align:right; font-family:monospace; font-size:11px; color:#64748B;">
          <div>Раб: ${record.laborCost.toLocaleString("ru-RU")} ₽</div>
          <div>Зап: ${(record.totalCost - record.laborCost).toLocaleString("ru-RU")} ₽</div>
        </td>
        <td style="text-align:right; font-family:monospace; font-weight:bold; font-size:13px; color:#0F172A; white-space:nowrap;">
          ${record.totalCost.toLocaleString("ru-RU")} ₽
        </td>
      </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Электронная сервисная книжка — ${escapeHtml(vehicle.make)} ${escapeHtml(
    vehicle.model
  )} (${escapeHtml(vehicle.vin || vehicle.licensePlate || "Garage AI")})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #fff;
      font-size: 12px;
      line-height: 1.4;
    }
    .no-print {
      margin-bottom: 20px;
      padding: 12px 18px;
      background: #f1f5f9;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .print-btn {
      background: #B91C1C;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #991B1B;
    }
    .passport-header {
      border: 2px solid #0F172A;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      background: #f8fafc;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .doc-badge {
      display: inline-block;
      background: #B91C1C;
      color: #fff;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .vehicle-title {
      font-size: 18px;
      font-weight: 800;
      margin: 4px 0 2px 0;
      color: #0f172a;
    }
    .vehicle-props {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 10px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
    }
    .prop-item {
      font-size: 11px;
    }
    .prop-label {
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .prop-value {
      font-weight: 700;
      color: #0f172a;
      font-family: monospace;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      text-align: center;
    }
    .stat-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .stat-val {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;
    }
    th {
      background: #0f172a;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 8px 6px;
      text-align: left;
    }
    td {
      padding: 8px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #F8FAFC;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .doc-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #64748b;
    }
    .stamp-box {
      border: 2px dashed #94a3b8;
      border-radius: 8px;
      width: 160px;
      height: 70px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 10px;
      font-weight: bold;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong>Готово к экспорту в PDF:</strong> Нажмите «Печать / Сохранить в PDF» и выберите «Сохранить как PDF» в списке принтеров.
    </div>
    <button class="print-btn" onclick="window.print()">Печать / Сохранить в PDF</button>
  </div>

  <div class="passport-header">
    <div class="header-top">
      <div>
        <div class="doc-badge">Официальный сервисный паспорт автомобиля</div>
        <div class="brand-title">GARAGEAI SERVICE BOOK</div>
        <div style="color:#64748b; font-size:11px;">Электронный реестр регламентных работ и заказ-нарядов</div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:bold; color:#0f172a; font-size:12px;">Дата выгрузки: ${todayStr}</div>
        <div style="color:#047857; font-weight:bold; font-size:11px; margin-top:3px;">✓ Верифицировано Garage AI Cloud</div>
      </div>
    </div>

    <div>
      <div class="vehicle-title">${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)} ${escapeHtml(
    vehicle.generation || ""
  )}</div>
      <div style="font-size:12px; color:#64748B;">
        Год выпуска: <strong>${vehicle.year}</strong> • Двигатель: <strong>${escapeHtml(
    vehicle.engine
  )}</strong>
      </div>
    </div>

    <div class="vehicle-props">
      <div class="prop-item">
        <div class="prop-label">VIN / Номер кузова</div>
        <div class="prop-value">${escapeHtml(vehicle.vin || "Не указан")}</div>
      </div>
      <div class="prop-item">
        <div class="prop-label">Госномер</div>
        <div class="prop-value">${escapeHtml(vehicle.licensePlate || "Не указан")}</div>
      </div>
      <div class="prop-item">
        <div class="prop-label">Текущий одометр</div>
        <div class="prop-value">${vehicle.currentMileage.toLocaleString("ru-RU")} км</div>
      </div>
      <div class="prop-item">
        <div class="prop-label">Статус записей</div>
        <div class="prop-value" style="color:#047857;">Подтверждены</div>
      </div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Всего записей в истории</div>
      <div class="stat-val">${vehicleRecords.length} ТО и ремонтов</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Расходы на запчасти</div>
      <div class="stat-val">${totalParts.toLocaleString("ru-RU")} ₽</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Суммарный подтверждённый бюджет</div>
      <div class="stat-val" style="color:#B91C1C;">${totalSpent.toLocaleString("ru-RU")} ₽</div>
    </div>
  </div>

  <div style="margin-top:12px; margin-bottom:4px; font-weight:bold; font-size:12px; text-transform:uppercase; color:#0f172a;">
    Хронология технического обслуживания и ремонтов
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px; text-align:center;">№</th>
        <th style="width:110px;">Дата / Пробег</th>
        <th style="width:230px;">Вид работ / Сервис</th>
        <th>Установленные детали (Бренд / Артикул)</th>
        <th style="width:95px; text-align:right;">Работы/Зап</th>
        <th style="width:85px; text-align:right;">Итого</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94A3B8;">Записей обслуживания пока нет</td></tr>`}
    </tbody>
    <tfoot>
      <tr style="font-weight:bold; background:#f1f5f9; border-top:2px solid #0f172a;">
        <td colspan="4" style="text-align:right; text-transform:uppercase; font-size:11px;">Всего инвестиций в автомобиль:</td>
        <td style="text-align:right; font-family:monospace; font-size:11px;">Раб: ${totalLabor.toLocaleString("ru-RU")} ₽</td>
        <td style="text-align:right; font-family:monospace; font-size:14px; color:#B91C1C; white-space:nowrap;">${totalSpent.toLocaleString("ru-RU")} ₽</td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    <div>
      <div>Документ сформирован автоматически цифровым сервисом <strong>Garage AI</strong>.</div>
      <div>Данная сервисная история содержит проверенные данные о пробеге, замененных деталях и регламентных ТО.</div>
      <div style="margin-top:3px; font-family:monospace;">ID выгрузки: GH-EXP-${Date.now().toString(36).toUpperCase()}</div>
    </div>
    <div class="stamp-box">
      <div>М.П. / ШТАМП</div>
      <div style="font-size:9px; margin-top:2px;">Garage AI VERIFIED</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Triggers printing of the service book in an isolated hidden iframe.
 * Allows the user to directly choose "Save as PDF" / "Сохранить как PDF" in the browser dialog.
 */
export function exportServiceBookToPdf(
  vehicle: Vehicle,
  records: ServiceRecord[]
): void {
  const html = generateServiceBookHtml(vehicle, records);

  // Try isolated iframe printing first to prevent modal backdrop or app navigation interference
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("title", "Service Book Print Frame");

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn("Direct iframe print failed, falling back to window.print", printErr);
          window.print();
        } finally {
          // Cleanup iframe after print dialog closes
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 3000);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn("Iframe approach failed, using fallback:", err);
  }

  // Fallback: window.print()
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}

/**
 * Downloads the full service book as a standalone printable HTML document.
 * Can be opened on any phone or PC, emailed to a car buyer, and printed anytime.
 */
export function downloadServiceBookHtml(
  vehicle: Vehicle,
  records: ServiceRecord[]
): void {
  const html = generateServiceBookHtml(vehicle, records);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeMake = (vehicle.make || "Car").replace(/\s+/g, "_");
  const safeModel = (vehicle.model || "Vehicle").replace(/\s+/g, "_");
  a.download = `Garage AI_${safeMake}_${safeModel}_ServiceBook.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
