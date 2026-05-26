import * as XLSX from "xlsx";

/**
 * Utilitário genérico para exportação de dados (JSON) para planilha Excel (.xlsx)
 * 
 * @param data Array de objetos a serem exportados
 * @param sheetName Nome da aba (planilha) dentro do arquivo
 * @param fileName Nome do arquivo final (com ou sem extensão)
 */
const isIsoDate = (str: any) => {
  if (typeof str !== 'string') return false;
  // Regex básica para formato ISO 8601
  const isoRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d*)?(?:[-+]\d{2}:?\d{2}|Z)?$/;
  return isoRegex.test(str);
};

const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

export function exportToExcel<T extends Record<string, any>>(data: T[], sheetName: string, baseFileName: string): void {
  if (!data || data.length === 0) {
    console.warn("Nenhum dado para exportar.");
    return;
  }

  // Sanitização e Formatação Rigorosa (Datas e Valores)
  const sanitizedData = data.map(item => {
    const cleanItem: any = {};
    Object.keys(item).forEach(key => {
      // Ignorar propriedades internas React/Vite
      if (key.startsWith('_')) return;
      
      let val = item[key] ?? '-';
      
      if (isIsoDate(val)) {
        val = new Date(val).toLocaleDateString('pt-BR');
      } else if (key.toLowerCase().includes('valor') && val !== '-' && !isNaN(Number(val))) {
        val = formatCurrency(val);
      }
      
      cleanItem[key] = val;
    });
    return cleanItem;
  });

  const worksheet = XLSX.utils.json_to_sheet(sanitizedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Nomenclatura Contextual
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFileName = `${baseFileName.replace('.xlsx', '')}_${dateStr}.xlsx`;
  
  XLSX.writeFile(workbook, finalFileName);
}
