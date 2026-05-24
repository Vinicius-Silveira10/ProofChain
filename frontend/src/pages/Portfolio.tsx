import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  PortfolioTitleSection,
} from "@/components/portfolio/portfolio-header";
import { PortfolioToolbar } from "@/components/portfolio/portfolio-toolbar";
import {
  PortfolioTable,
  type Titulo,
  type TituloStatus,
} from "@/components/portfolio/portfolio-table";

const mockTitulos: Titulo[] = [
  {
    id: "1",
    uuid: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    credor: "Indústria ABC Ltda",
    cnpj: "12345678000190",
    valorTotal: 150000,
    dataEmissao: "2024-01-15",
    status: "VERIFIED",
  },
  {
    id: "2",
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    credor: "Comércio XYZ S.A.",
    cnpj: "98765432000121",
    valorTotal: 75000,
    dataEmissao: "2024-02-20",
    status: "VERIFIED",
  },
  {
    id: "3",
    uuid: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    credor: "Transportadora Delta",
    cnpj: "11222333000144",
    valorTotal: 320000,
    dataEmissao: "2024-03-05",
    status: "COMPROMISED",
  },
  {
    id: "4",
    uuid: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    credor: "Construtora Omega",
    cnpj: "55666777000188",
    valorTotal: 450000,
    dataEmissao: "2024-03-10",
    status: "PENDING",
  },
  {
    id: "5",
    uuid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    credor: "Distribuidora Norte",
    cnpj: "22333444000155",
    valorTotal: 89000,
    dataEmissao: "2024-03-15",
    status: "VERIFIED",
  },
  {
    id: "6",
    uuid: "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
    credor: "Tech Solutions Ltda",
    cnpj: "33444555000166",
    valorTotal: 210000,
    dataEmissao: "2024-03-20",
    status: "VERIFIED",
  },
  {
    id: "7",
    uuid: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
    credor: "Agropecuária Sul",
    cnpj: "44555666000177",
    valorTotal: 580000,
    dataEmissao: "2024-03-25",
    status: "PENDING",
  },
  {
    id: "8",
    uuid: "6ba7b815-9dad-11d1-80b4-00c04fd430c8",
    credor: "Metalúrgica Centro",
    cnpj: "55666777000199",
    valorTotal: 125000,
    dataEmissao: "2024-04-01",
    status: "VERIFIED",
  },
  {
    id: "9",
    uuid: "6ba7b816-9dad-11d1-80b4-00c04fd430c8",
    credor: "Química Industrial",
    cnpj: "66777888000100",
    valorTotal: 290000,
    dataEmissao: "2024-04-05",
    status: "COMPROMISED",
  },
  {
    id: "10",
    uuid: "6ba7b817-9dad-11d1-80b4-00c04fd430c8",
    credor: "Logística Express",
    cnpj: "77888999000111",
    valorTotal: 175000,
    dataEmissao: "2024-04-10",
    status: "VERIFIED",
  },
  {
    id: "11",
    uuid: "6ba7b818-9dad-11d1-80b4-00c04fd430c8",
    credor: "Farmacêutica Beta",
    cnpj: "88999000000122",
    valorTotal: 420000,
    dataEmissao: "2024-04-15",
    status: "VERIFIED",
  },
  {
    id: "12",
    uuid: "6ba7b819-9dad-11d1-80b4-00c04fd430c8",
    credor: "Energia Verde S.A.",
    cnpj: "99000111000133",
    valorTotal: 650000,
    dataEmissao: "2024-04-20",
    status: "PENDING",
  },
];

export default function Portfolio() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TituloStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status === "VERIFIED" || status === "PENDING" || status === "COMPROMISED") {
      setStatusFilter(status as TituloStatus);
    } else {
      setStatusFilter("all");
    }
  }, [location.search]);

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(mockTitulos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
    XLSX.writeFile(wb, "ProofChain_Portfolio.xlsx");
  };

  const filteredTitulos = useMemo(() => {
    return mockTitulos.filter((titulo) => {
      const matchesSearch =
        searchTerm === "" ||
        titulo.credor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        titulo.cnpj.includes(searchTerm.replace(/\D/g, ""));

      const matchesStatus =
        statusFilter === "all" || titulo.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const paginatedTitulos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTitulos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTitulos, currentPage]);

  const totalPages = Math.ceil(filteredTitulos.length / itemsPerPage);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as TituloStatus | "all");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6">
          <PortfolioTitleSection onExport={handleExportExcel} />

          <PortfolioToolbar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
          />

          <PortfolioTable
            titulos={paginatedTitulos}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTitulos.length}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>
    </div>
  );
}
