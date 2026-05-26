import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Utilitário para exportar um elemento HTML como PDF
 * 
 * @param elementId O ID do elemento HTML que será renderizado no PDF
 * @param fileName O nome do arquivo final (ex: "recibo_proofchain")
 */
export async function exportHtmlToPdf(elementId: string, fileName: string): Promise<boolean> {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      console.error(`Elemento com ID '${elementId}' não encontrado.`);
      return false;
    }

    // Tira um "print" do elemento mantendo o estilo visual (Tailwind)
    const canvas = await html2canvas(element, {
      scale: 2, // Maior resolução
      useCORS: true, // Permite carregar imagens/fontes externas
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Configura o PDF em formato A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Dimensões A4: 210 x 297 mm
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Adiciona uma "assinatura" ou carimbo digital simples (Task 6.2 - Documento Assinado)
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(
      `Documento gerado e assinado digitalmente por ProofChain Network em ${new Date().toLocaleString('pt-BR')}`,
      10, 
      pdf.internal.pageSize.getHeight() - 10
    );

    pdf.save(`${fileName}.pdf`);
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return false;
  }
}
