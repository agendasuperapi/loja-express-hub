import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  total: number;
  status: string;
  payment_method?: string;
}

interface Product {
  name: string;
  price: number;
  category?: string;
  available?: boolean;
}

interface Customer {
  name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
}

export const generateOrdersReport = (
  orders: Order[],
  storeName: string,
  periodLabel: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Pedidos', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, 14, 28);
  doc.text(`Período: ${periodLabel}`, 14, 35);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 42);
  
  // Summary
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  doc.setFontSize(10);
  doc.text(`Total de Pedidos: ${orders.length}`, 14, 52);
  doc.text(`Receita Total: R$ ${totalRevenue.toFixed(2)}`, 14, 58);
  
  // Table
  const tableData = orders.map(order => [
    format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    order.customer_name,
    order.status,
    order.payment_method || '-',
    `R$ ${order.total.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    head: [['Data', 'Cliente', 'Status', 'Pagamento', 'Total']],
    body: tableData,
    startY: 65,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  // Save
  doc.save(`relatorio-pedidos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateProductsReport = (
  products: Product[],
  storeName: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Produtos', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, 14, 28);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 35);
  
  // Summary
  doc.setFontSize(10);
  doc.text(`Total de Produtos: ${products.length}`, 14, 45);
  doc.text(`Produtos Ativos: ${products.filter(p => p.available).length}`, 14, 51);
  
  // Table
  const tableData = products.map(product => [
    product.name,
    product.category || '-',
    `R$ ${product.price.toFixed(2)}`,
    product.available ? 'Ativo' : 'Inativo'
  ]);
  
  autoTable(doc, {
    head: [['Produto', 'Categoria', 'Preço', 'Status']],
    body: tableData,
    startY: 60,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  doc.save(`relatorio-produtos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateCustomersReport = (
  customers: Customer[],
  storeName: string,
  periodLabel: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Clientes', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, 14, 28);
  doc.text(`Período: ${periodLabel}`, 14, 35);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 42);
  
  // Summary
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);
  doc.setFontSize(10);
  doc.text(`Total de Clientes: ${customers.length}`, 14, 52);
  doc.text(`Valor Total Gasto: R$ ${totalSpent.toFixed(2)}`, 14, 58);
  
  // Table
  const tableData = customers.map(customer => [
    customer.name,
    customer.phone,
    customer.total_orders.toString(),
    `R$ ${customer.total_spent.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    head: [['Cliente', 'Telefone', 'Pedidos', 'Total Gasto']],
    body: tableData,
    startY: 65,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  doc.save(`relatorio-clientes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateBestSellersReport = (
  products: Array<{ name: string; external_code: string | null; quantity: number; revenue: number }>,
  storeName: string,
  periodLabel: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Produtos Mais Vendidos', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, 14, 28);
  doc.text(`Período: ${periodLabel}`, 14, 35);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 42);
  
  // Table
  const tableData = products.map((product, index) => [
    (index + 1).toString(),
    product.external_code || '-',
    product.name,
    product.quantity.toString(),
    `R$ ${product.revenue.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    head: [['#', 'Cód. Externo', 'Produto', 'Quantidade', 'Receita']],
    body: tableData,
    startY: 50,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  doc.save(`relatorio-mais-vendidos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateCouponsReport = (
  coupons: Array<{
    code: string;
    discount: number;
    discount_type: string;
    usage_count: number;
    valid_until?: string;
  }>,
  storeName: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Cupons', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, 14, 28);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 35);
  
  // Table
  const tableData = coupons.map(coupon => [
    coupon.code,
    coupon.discount_type === 'percentage' ? `${coupon.discount}%` : `R$ ${coupon.discount.toFixed(2)}`,
    coupon.usage_count?.toString() || '0',
    coupon.valid_until ? format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem validade'
  ]);
  
  autoTable(doc, {
    head: [['Código', 'Desconto', 'Usos', 'Validade']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  doc.save(`relatorio-cupons-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
