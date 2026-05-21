import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';

interface RecordRow {
  periodo: string;
  anio: string;
  semestre: string;
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
  semestres: string[] = [];
  facultades: string[] = [];
  programas: string[] = [];
  niveles: string[] = [];
  sexos: string[] = [];
  departamentos: string[] = [];

  // Selected filters
  selectedUniversidad = '';
  selectedAnio = '';
  selectedSemestre = '';
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
  sortColumn: keyof RecordRow = 'periodo';
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
        this.allRecords = parsedLines.slice(1).map(row => {
          const periodo = row[0] || '';
          const parts = periodo.split('-');
          const anio = parts[0] || '';
          const semestre = parts[1] || '';
          
          const total_matriculados = parseFloat(row[8] || '0') || 0;
          const total_graduados = parseFloat(row[9] || '0') || 0;
          
          return {
            periodo: periodo,
            anio: anio,
            semestre: semestre,
            universidad: row[1] || '',
            programa: row[2] || '',
            facultad: row[3] || '',
            nivel: row[4] || '',
            estrato: row[5] || '',
            sexo: row[6] || '',
            departamento: row[7] || '',
            total_matriculados: total_matriculados,
            total_graduados: total_graduados,
            tasa_graduacion: total_matriculados > 0 ? (total_graduados / total_matriculados) : 0,
            balance_matricula_menos_graduacion: total_matriculados - total_graduados,
            hay_matricula: total_matriculados > 0,
            hay_graduacion: total_graduados > 0,
            hay_matricula_y_graduacion: total_matriculados > 0 && total_graduados > 0,
            alerta_graduados_superan_matricula: total_graduados > total_matriculados,
          };
        });

        // Populate filter dropdown lists from the entire dataset
        this.universidades = Array.from(new Set(this.allRecords.map(r => r.universidad))).filter(Boolean).sort();
        this.anios = Array.from(new Set(this.allRecords.map(r => r.anio))).filter(Boolean).sort();
        this.semestres = Array.from(new Set(this.allRecords.map(r => r.semestre))).filter(Boolean).sort();
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

  get availableProgramas(): string[] {
    if (this.selectedFacultad) {
      return Array.from(new Set(
        this.allRecords
          .filter(r => r.facultad === this.selectedFacultad)
          .map(r => r.programa)
      )).filter(Boolean).sort();
    }
    return this.programas;
  }

  onFilterChange() {
    if (this.selectedFacultad) {
      const avail = this.availableProgramas;
      if (this.selectedPrograma && !avail.includes(this.selectedPrograma)) {
        this.selectedPrograma = '';
      }
    }
    this.applyFilters();
  }

  clearFilters() {
    this.selectedUniversidad = '';
    this.selectedAnio = '';
    this.selectedSemestre = '';
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
        (!this.selectedSemestre || r.semestre === this.selectedSemestre) &&
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
    this.totalMatriculados = Math.round(this.filteredRecords.reduce((sum, r) => sum + r.total_matriculados, 0));
    this.totalGraduados = Math.round(this.filteredRecords.reduce((sum, r) => sum + r.total_graduados, 0));
    this.totalRegistros = this.totalMatriculados + this.totalGraduados;
    
    if (this.totalMatriculados > 0) {
      this.tasaDesercionPromedio = Math.max(0, 100 - (this.totalGraduados / this.totalMatriculados * 100));
    } else {
      this.tasaDesercionPromedio = 0;
    }
  }

  // --- Chart.js Recreations ---
  updateCharts() {
    if (this.isLoading || this.allRecords.length === 0) return;

    // --- Chart 1: Evolución Histórica: Matriculados vs Graduados por Periodo ---
    const pMap = new Map<string, { matriculados: number, graduados: number }>();
    this.filteredRecords.forEach(r => {
      const current = pMap.get(r.periodo) || { matriculados: 0, graduados: 0 };
      current.matriculados += r.total_matriculados;
      current.graduados += r.total_graduados;
      pMap.set(r.periodo, current);
    });
    const sortedPeriodos = Array.from(pMap.keys()).sort();
    const matriculadosData = sortedPeriodos.map(p => Math.round(pMap.get(p)!.matriculados));
    const graduadosData = sortedPeriodos.map(p => Math.round(pMap.get(p)!.graduados));

    if (this.chart1) {
      this.chart1.data.labels = sortedPeriodos;
      this.chart1.data.datasets[0].data = matriculadosData;
      this.chart1.data.datasets[1].data = graduadosData;
      this.chart1.update();
    } else {
      this.chart1 = this.createLineChart('chart-matriculados-graduados', sortedPeriodos, matriculadosData, graduadosData);
    }

    // --- Chart 2: Brecha vs Tasa de Deserción por Periodo (Combo Chart) ---
    const brechaData = sortedPeriodos.map(p => {
      const d = pMap.get(p)!;
      return Math.round(d.matriculados - d.graduados);
    });
    const tasaPeriodoData = sortedPeriodos.map(p => {
      const d = pMap.get(p)!;
      return d.matriculados > 0 ? parseFloat(Math.max(0, 100 - (d.graduados / d.matriculados * 100)).toFixed(2)) : 0;
    });

    if (this.chart2) {
      this.chart2.data.labels = sortedPeriodos;
      this.chart2.data.datasets[0].data = brechaData;
      this.chart2.data.datasets[1].data = tasaPeriodoData;
      this.chart2.update();
    } else {
      this.chart2 = this.createComboChart('chart-brecha-tasa-periodo', sortedPeriodos, brechaData, tasaPeriodoData);
    }

    // --- Chart 3: Tasa de Deserción por Facultad ---
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
    const facRates = facData.map(d => parseFloat(d.rate.toFixed(2)));

    if (this.chart3) {
      this.chart3.data.labels = facLabels;
      this.chart3.data.datasets[0].data = facRates;
      this.chart3.update();
    } else {
      this.chart3 = this.createBarChartHorizontal('chart-tasa-desercion-facultad', 'Tasa Deserción (%)', facLabels, facRates, '#f03e3e');
    }

    // --- Chart 4: Tasa de Deserción por Programa (Top 15) ---
    const progMap = new Map<string, { matriculados: number, graduados: number }>();
    this.filteredRecords.forEach(r => {
      if (!r.programa) return;
      const current = progMap.get(r.programa) || { matriculados: 0, graduados: 0 };
      current.matriculados += r.total_matriculados;
      current.graduados += r.total_graduados;
      progMap.set(r.programa, current);
    });
    const progData = Array.from(progMap.entries()).map(([programa, data]) => {
      const rate = data.matriculados > 0 ? Math.max(0, 100 - (data.graduados / data.matriculados * 100)) : 0;
      return { programa, rate };
    }).sort((a, b) => b.rate - a.rate).slice(0, 15);
    const progLabels = progData.map(d => d.programa);
    const progRates = progData.map(d => parseFloat(d.rate.toFixed(2)));

    if (this.chart4) {
      this.chart4.data.labels = progLabels;
      this.chart4.data.datasets[0].data = progRates;
      this.chart4.update();
    } else {
      this.chart4 = this.createBarChartHorizontal('chart-tasa-desercion-programa', 'Tasa Deserción (%)', progLabels, progRates, '#fab005');
    }

    // --- Chart 5: Distribución de Estudiantes por Sexo ---
    const sexoMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      if (!r.sexo) return;
      sexoMap.set(r.sexo, (sexoMap.get(r.sexo) || 0) + r.total_matriculados);
    });
    const sortedSexos = Array.from(sexoMap.entries()).sort((a, b) => b[1] - a[1]);
    const sexoLabels = sortedSexos.map(s => s[0]);
    const sexoValues = sortedSexos.map(s => Math.round(s[1]));

    if (this.chart5) {
      this.chart5.data.labels = sexoLabels;
      this.chart5.data.datasets[0].data = sexoValues;
      this.chart5.update();
    } else {
      this.chart5 = this.createDoughnutChart('chart-sexo-estudiantes', sexoLabels, sexoValues);
    }

    // --- Chart 6: Distribución por Nivel Académico ---
    const nivelMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      if (!r.nivel) return;
      nivelMap.set(r.nivel, (nivelMap.get(r.nivel) || 0) + r.total_matriculados);
    });
    const sortedNiveles = Array.from(nivelMap.entries()).sort((a, b) => b[1] - a[1]);
    const nivelLabels = sortedNiveles.map(n => n[0]);
    const nivelValues = sortedNiveles.map(n => Math.round(n[1]));

    if (this.chart6) {
      this.chart6.data.labels = nivelLabels;
      this.chart6.data.datasets[0].data = nivelValues;
      this.chart6.update();
    } else {
      this.chart6 = this.createDoughnutChart('chart-nivel-academico', nivelLabels, nivelValues);
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
            borderColor: '#22b8cf',
            backgroundColor: 'rgba(34, 184, 207, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#22b8cf',
            pointHoverRadius: 7
          },
          {
            label: 'Graduados',
            data: dataGraduados,
            borderColor: '#be4bdb',
            backgroundColor: 'rgba(190, 75, 219, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#be4bdb',
            pointHoverRadius: 7
          }
        ]
      },
      options: this.getCommonOptions()
    });
  }

  createComboChart(elementId: string, labels: string[], brechaData: number[], tasaData: number[]): Chart {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return null as any;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: 'Brecha (Matriculados - Graduados)',
            data: brechaData,
            backgroundColor: 'rgba(34, 184, 207, 0.35)',
            borderColor: '#22b8cf',
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 16,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Tasa Deserción (%)',
            data: tasaData,
            borderColor: '#f03e3e',
            backgroundColor: 'rgba(240, 62, 62, 0.15)',
            borderWidth: 3,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: '#f03e3e',
            pointHoverRadius: 7,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#a5d8ff',
              font: { family: 'DM Sans, sans-serif', size: 11 }
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
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#a5d8ff', font: { family: 'DM Sans, sans-serif' } }
          },
          y: {
            type: 'linear' as const,
            position: 'left' as const,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#a5d8ff', font: { family: 'DM Sans, sans-serif' } },
            title: {
              display: true,
              text: 'Brecha (Estudiantes)',
              color: '#a5d8ff',
              font: { family: 'DM Sans, sans-serif' }
            }
          },
          y2: {
            type: 'linear' as const,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#ffc9c9',
              font: { family: 'DM Sans, sans-serif' },
              callback: function(value) { return value + '%'; }
            },
            title: {
              display: true,
              text: 'Tasa Deserción (%)',
              color: '#ffc9c9',
              font: { family: 'DM Sans, sans-serif' }
            }
          }
        }
      }
    });
  }

  createBarChartHorizontal(elementId: string, label: string, labels: string[], data: number[], color: string): Chart {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return null as any;

    const options: any = this.getCommonOptions();
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
            barThickness: 10
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
      'Periodo', 'Universidad', 'Programa', 'Facultad', 'Nivel', 
      'Estrato', 'Sexo', 'Departamento', 'Total Matriculados', 'Total Graduados'
    ];
    
    const csvRows = [headers.join(',')];
    
    this.filteredRecords.forEach(r => {
      const row = [
        r.periodo,
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
