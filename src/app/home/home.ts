import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';

interface RecordRow {
  anio: string;
  universidad: string;
  programa: string;
  facultad: string;
  nivel: string;
  estrato: string;
  sexo: string;
  departamento: string;
  total_matriculados: number;
  total_graduados: number;
  tasa_graduacion: number;
  balance_matricula_menos_graduacion: number;
  hay_matricula: boolean;
  hay_graduacion: boolean;
  hay_matricula_y_graduacion: boolean;
  alerta_graduados_superan_matricula: boolean;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  allRecords: RecordRow[] = [];
  filteredRecords: RecordRow[] = [];

  // Filter lists
  universidades: string[] = [];
  anios: string[] = [];
  facultades: string[] = [];
  programas: string[] = [];
  niveles: string[] = [];
  sexos: string[] = [];
  departamentos: string[] = [];

  // Selected filters
  selectedUniversidad = '';
  selectedAnio = '';
  selectedFacultad = '';
  selectedPrograma = '';
  selectedNivel = '';
  selectedSexo = '';
  selectedDepartamento = '';

  // KPI variables
  totalRegistros = 0;
  totalMatriculados = 0;
  totalGraduados = 0;
  tasaDesercionPromedio = 0;

  // Chart instances
  chart1: Chart | null = null;
  chart2: Chart | null = null;
  chart3: Chart | null = null;
  chart4: Chart | null = null;
  chart5: Chart | null = null;
  chart6: Chart | null = null;

  // Table variables
  searchText = '';
  currentPage = 1;
  pageSize = 10;
  sortColumn: keyof RecordRow = 'anio';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // Charts will initialize once the data is loaded and DOM elements are present.
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  destroyCharts() {
    if (this.chart1) this.chart1.destroy();
    if (this.chart2) this.chart2.destroy();
    if (this.chart3) this.chart3.destroy();
    if (this.chart4) this.chart4.destroy();
    if (this.chart5) this.chart5.destroy();
    if (this.chart6) this.chart6.destroy();
  }

  async loadData() {
    this.isLoading = true;
    try {
      const response = await fetch('/tablas/dataset_powerbi.csv');
      const csvText = await response.text();
      const parsedLines = this.parseCSV(csvText);
      
      if (parsedLines.length > 1) {
        const headers = parsedLines[0];
        this.allRecords = parsedLines.slice(1).map(row => {
          return {
            anio: row[0] || '',
            universidad: row[1] || '',
            programa: row[2] || '',
            facultad: row[3] || '',
            nivel: row[4] || '',
            estrato: row[5] || '',
            sexo: row[6] || '',
            departamento: row[7] || '',
            total_matriculados: parseInt(row[8] || '0', 10) || 0,
            total_graduados: parseInt(row[9] || '0', 10) || 0,
            tasa_graduacion: parseFloat(row[10] || '0') || 0,
            balance_matricula_menos_graduacion: parseInt(row[11] || '0', 10) || 0,
            hay_matricula: row[12] === 'true',
            hay_graduacion: row[13] === 'true',
            hay_matricula_y_graduacion: row[14] === 'true',
            alerta_graduados_superan_matricula: row[15] === 'true',
          };
        });

        // Populate filter dropdown lists from the entire dataset
        this.universidades = Array.from(new Set(this.allRecords.map(r => r.universidad))).filter(Boolean).sort();
        this.anios = Array.from(new Set(this.allRecords.map(r => r.anio))).filter(Boolean).sort();
        this.facultades = Array.from(new Set(this.allRecords.map(r => r.facultad))).filter(Boolean).sort();
        this.programas = Array.from(new Set(this.allRecords.map(r => r.programa))).filter(Boolean).sort();
        this.niveles = Array.from(new Set(this.allRecords.map(r => r.nivel))).filter(Boolean).sort();
        this.sexos = Array.from(new Set(this.allRecords.map(r => r.sexo))).filter(Boolean).sort();
        this.departamentos = Array.from(new Set(this.allRecords.map(r => r.departamento))).filter(Boolean).sort();

        // Apply filters initial execution
        this.applyFilters();
      }
    } catch (error) {
      console.error('Error al cargar o parsear el dataset CSV:', error);
    } finally {
      this.isLoading = false;
      // Initialize charts on next tick to allow DOM to render
      setTimeout(() => {
        this.updateCharts();
      }, 50);
    }
  }

  parseCSV(text: string): string[][] {
    const lines: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // saltarse las comillas dobles escapadas
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell.trim());
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (cell !== '' || row.length > 0) {
      row.push(cell.trim());
      lines.push(row);
    }
    return lines;
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.selectedUniversidad = '';
    this.selectedAnio = '';
    this.selectedFacultad = '';
    this.selectedPrograma = '';
    this.selectedNivel = '';
    this.selectedSexo = '';
    this.selectedDepartamento = '';
    this.searchText = '';
    this.applyFilters();
  }

  applyFilters() {
    this.filteredRecords = this.allRecords.filter(r => {
      return (
        (!this.selectedUniversidad || r.universidad === this.selectedUniversidad) &&
        (!this.selectedAnio || r.anio === this.selectedAnio) &&
        (!this.selectedFacultad || r.facultad === this.selectedFacultad) &&
        (!this.selectedPrograma || r.programa === this.selectedPrograma) &&
        (!this.selectedNivel || r.nivel === this.selectedNivel) &&
        (!this.selectedSexo || r.sexo === this.selectedSexo) &&
        (!this.selectedDepartamento || r.departamento === this.selectedDepartamento) &&
        (!this.searchText || 
          r.programa.toLowerCase().includes(this.searchText.toLowerCase()) ||
          r.facultad.toLowerCase().includes(this.searchText.toLowerCase()) ||
          r.departamento.toLowerCase().includes(this.searchText.toLowerCase()) ||
          r.nivel.toLowerCase().includes(this.searchText.toLowerCase()) ||
          r.universidad.toLowerCase().includes(this.searchText.toLowerCase())
        )
      );
    });

    this.currentPage = 1;
    this.updateKPIs();
    this.updateCharts();
  }

  updateKPIs() {
    this.totalRegistros = this.filteredRecords.length;
    this.totalMatriculados = this.filteredRecords.reduce((sum, r) => sum + r.total_matriculados, 0);
    this.totalGraduados = this.filteredRecords.reduce((sum, r) => sum + r.total_graduados, 0);
    
    if (this.totalMatriculados > 0) {
      this.tasaDesercionPromedio = Math.max(0, 100 - (this.totalGraduados / this.totalMatriculados * 100));
    } else {
      this.tasaDesercionPromedio = 0;
    }
  }

  // --- Chart.js Recreations ---
  updateCharts() {
    if (this.isLoading || this.allRecords.length === 0) return;

    // --- Chart 1: Matriculados vs Graduados por Año ---
    const yearMap = new Map<string, { matriculados: number, graduados: number }>();
    this.filteredRecords.forEach(r => {
      const current = yearMap.get(r.anio) || { matriculados: 0, graduados: 0 };
      current.matriculados += r.total_matriculados;
      current.graduados += r.total_graduados;
      yearMap.set(r.anio, current);
    });
    const sortedYears = Array.from(yearMap.keys()).sort();
    const matriculadosData = sortedYears.map(y => yearMap.get(y)!.matriculados);
    const graduadosData = sortedYears.map(y => yearMap.get(y)!.graduados);

    if (this.chart1) {
      this.chart1.data.labels = sortedYears;
      this.chart1.data.datasets[0].data = matriculadosData;
      this.chart1.data.datasets[1].data = graduadosData;
      this.chart1.update();
    } else {
      this.chart1 = this.createLineChart('chart-matriculados-graduados', sortedYears, matriculadosData, graduadosData);
    }

    // --- Chart 2: Tasa de Deserción por Facultad ---
    const facMap = new Map<string, { matriculados: number, graduados: number }>();
    this.filteredRecords.forEach(r => {
      if (!r.facultad) return;
      const current = facMap.get(r.facultad) || { matriculados: 0, graduados: 0 };
      current.matriculados += r.total_matriculados;
      current.graduados += r.total_graduados;
      facMap.set(r.facultad, current);
    });
    const facData = Array.from(facMap.entries()).map(([facultad, data]) => {
      const rate = data.matriculados > 0 ? Math.max(0, 100 - (data.graduados / data.matriculados * 100)) : 0;
      return { facultad, rate };
    }).sort((a, b) => b.rate - a.rate).slice(0, 10);
    const facLabels = facData.map(d => d.facultad);
    const facRates = facData.map(d => d.rate);

    if (this.chart2) {
      this.chart2.data.labels = facLabels;
      this.chart2.data.datasets[0].data = facRates;
      this.chart2.update();
    } else {
      this.chart2 = this.createBarChartHorizontal('chart-tasa-desercion-facultad', 'Tasa Deserción (%)', facLabels, facRates, '#f03e3e');
    }

    // --- Chart 3: Distribución por Nivel Académico ---
    const nivelMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      if (!r.nivel) return;
      nivelMap.set(r.nivel, (nivelMap.get(r.nivel) || 0) + r.total_matriculados);
    });
    const sortedNiveles = Array.from(nivelMap.entries()).sort((a, b) => b[1] - a[1]);
    const nivelLabels = sortedNiveles.map(n => n[0]);
    const nivelValues = sortedNiveles.map(n => n[1]);

    if (this.chart3) {
      this.chart3.data.labels = nivelLabels;
      this.chart3.data.datasets[0].data = nivelValues;
      this.chart3.update();
    } else {
      this.chart3 = this.createDoughnutChart('chart-nivel-academico', nivelLabels, nivelValues);
    }

    // --- Chart 4: Top 10 Programas con más Estudiantes ---
    const progMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      if (!r.programa) return;
      progMap.set(r.programa, (progMap.get(r.programa) || 0) + r.total_matriculados);
    });
    const sortedProgs = Array.from(progMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const progLabels = sortedProgs.map(p => p[0]);
    const progValues = sortedProgs.map(p => p[1]);

    if (this.chart4) {
      this.chart4.data.labels = progLabels;
      this.chart4.data.datasets[0].data = progValues;
      this.chart4.update();
    } else {
      this.chart4 = this.createBarChartHorizontal('chart-programas-estudiantes', 'Matriculados', progLabels, progValues, '#22b8cf');
    }

    // --- Chart 5: Distribución de Estudiantes por Sexo ---
    const sexoMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      if (!r.sexo) return;
      sexoMap.set(r.sexo, (sexoMap.get(r.sexo) || 0) + r.total_matriculados);
    });
    const sortedSexos = Array.from(sexoMap.entries()).sort((a, b) => b[1] - a[1]);
    const sexoLabels = sortedSexos.map(s => s[0]);
    const sexoValues = sortedSexos.map(s => s[1]);

    if (this.chart5) {
      this.chart5.data.labels = sexoLabels;
      this.chart5.data.datasets[0].data = sexoValues;
      this.chart5.update();
    } else {
      this.chart5 = this.createDoughnutChart('chart-sexo-estudiantes', sexoLabels, sexoValues);
    }

    // --- Chart 6: Estudiantes por Departamento de Procedencia ---
    const deptMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      if (!r.departamento) return;
      deptMap.set(r.departamento, (deptMap.get(r.departamento) || 0) + r.total_matriculados);
    });
    const sortedDepts = Array.from(deptMap.entries()).sort((a, b) => b[1] - a[1]);
    let deptLabels: string[] = [];
    let deptValues: number[] = [];
    if (sortedDepts.length > 8) {
      const topDepts = sortedDepts.slice(0, 7);
      const othersVal = sortedDepts.slice(7).reduce((sum, d) => sum + d[1], 0);
      deptLabels = topDepts.map(d => d[0]);
      deptValues = topDepts.map(d => d[1]);
      if (othersVal > 0) {
        deptLabels.push('Otros');
        deptValues.push(othersVal);
      }
    } else {
      deptLabels = sortedDepts.map(d => d[0]);
      deptValues = sortedDepts.map(d => d[1]);
    }

    if (this.chart6) {
      this.chart6.data.labels = deptLabels;
      this.chart6.data.datasets[0].data = deptValues;
      this.chart6.update();
    } else {
      this.chart6 = this.createDoughnutChart('chart-departamento-procedencia', deptLabels, deptValues);
    }
  }

  // --- Helper methods to construct Chart.js options ---
  getCommonOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#a5d8ff',
            font: {
              family: 'DM Sans, sans-serif',
              size: 11
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(20, 21, 30, 0.95)',
          titleColor: '#fff',
          bodyColor: '#a5d8ff',
          borderColor: 'rgba(240, 62, 62, 0.25)',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'DM Sans, sans-serif', weight: 'bold' as const },
          bodyFont: { family: 'DM Mono, monospace' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a5d8ff', font: { family: 'DM Sans, sans-serif' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a5d8ff', font: { family: 'DM Sans, sans-serif' } }
        }
      }
    };
  }

  createLineChart(elementId: string, labels: string[], dataMatriculados: number[], dataGraduados: number[]): Chart {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return null as any;

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Matriculados',
            data: dataMatriculados,
            borderColor: '#f03e3e',
            backgroundColor: 'rgba(240, 62, 62, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#f03e3e',
            pointHoverRadius: 7
          },
          {
            label: 'Graduados',
            data: dataGraduados,
            borderColor: '#22b8cf',
            backgroundColor: 'rgba(34, 184, 207, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#22b8cf',
            pointHoverRadius: 7
          }
        ]
      },
      options: this.getCommonOptions()
    });
  }

  createBarChartHorizontal(elementId: string, label: string, labels: string[], data: number[], color: string): Chart {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return null as any;

    const options: any = this.getCommonOptions();
    // Configure horizontal bars
    options.indexAxis = 'y';

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: label,
            data: data,
            backgroundColor: color,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 12
          }
        ]
      },
      options: options
    });
  }

  createDoughnutChart(elementId: string, labels: string[], data: number[]): Chart {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return null as any;

    const colors = [
      '#f03e3e', // Red
      '#22b8cf', // Cyan
      '#fab005', // Yellow
      '#7048e8', // Purple
      '#37b24d', // Green
      '#fd7e14', // Orange
      '#be4bdb', // Magenta
      '#15aabf', // Teal
      '#4dadf7', // Blue
    ];

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors.slice(0, data.length),
            borderColor: '#1a1b26',
            borderWidth: 2,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right' as const,
            labels: {
              color: '#a5d8ff',
              font: { family: 'DM Sans, sans-serif', size: 10 },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: 'rgba(20, 21, 30, 0.95)',
            titleColor: '#fff',
            bodyColor: '#a5d8ff',
            borderColor: 'rgba(240, 62, 62, 0.25)',
            borderWidth: 1,
            padding: 10,
            titleFont: { family: 'DM Sans, sans-serif', weight: 'bold' },
            bodyFont: { family: 'DM Mono, monospace' }
          }
        }
      }
    });
  }

  // --- Table Operations ---
  get sortedRecords(): RecordRow[] {
    return [...this.filteredRecords].sort((a, b) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return this.sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRecords.length / this.pageSize) || 1;
  }

  get paginatedRecords(): RecordRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedRecords.slice(start, start + this.pageSize);
  }

  setSort(column: keyof RecordRow) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  exportCSV() {
    const headers = [
      'Anio', 'Universidad', 'Programa', 'Facultad', 'Nivel', 
      'Estrato', 'Sexo', 'Departamento', 'Total Matriculados', 'Total Graduados'
    ];
    
    const csvRows = [headers.join(',')];
    
    this.filteredRecords.forEach(r => {
      const row = [
        r.anio,
        `"${r.universidad.replace(/"/g, '""')}"`,
        `"${r.programa.replace(/"/g, '""')}"`,
        `"${r.facultad.replace(/"/g, '""')}"`,
        `"${r.nivel.replace(/"/g, '""')}"`,
        `"${r.estrato.replace(/"/g, '""')}"`,
        `"${r.sexo.replace(/"/g, '""')}"`,
        `"${r.departamento.replace(/"/g, '""')}"`,
        r.total_matriculados,
        r.total_graduados
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_desercion_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
