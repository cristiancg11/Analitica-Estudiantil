import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  url!: SafeResourceUrl;
  isLoading = true;

  statsLoading = true;
  statsCards: Array<{
    title: string;
    desc: string;
    path: string;
    table?: { headers: string[]; rows: string[][] };
    error?: string;
  }> = [];

  // Chart instances
  chartFacultad: Chart | null = null;
  chartNivel: Chart | null = null;
  chartSexo: Chart | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    const powerBiUrl = 'https://app.powerbi.com/view?r=eyJrIjoiY2IwM2NlNTgtZjViNy00OTlhLWJlMTctNjM5MGRiMGRmODlkIiwidCI6IjhkMzY4MzZlLTZiNzUtNGRlNi1iYWI5LTVmNGIxNzc1NDI3ZiIsImMiOjR9';
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(powerBiUrl);

    this.statsCards = [
      {
        title: 'ANOVA — Matriculados (UNAL vs UNIVALLE)',
        desc: 'Prueba F (una vía) por institución',
        path: '/estadistica/anova_matriculados_unal_vs_univalle.csv',
      },
      {
        title: 'Post-test — Tukey HSD (Matriculados)',
        desc: 'Comparaciones múltiples entre instituciones',
        path: '/estadistica/tukey_matriculados_unal_vs_univalle.csv',
      },
      {
        title: 'ANOVA — Graduados (UNAL vs UNIVALLE)',
        desc: 'Prueba F (una vía) por institución',
        path: '/estadistica/anova_graduados_unal_vs_univalle.csv',
      },
      {
        title: 'Post-test — Tukey HSD (Graduados)',
        desc: 'Comparaciones múltiples entre instituciones',
        path: '/estadistica/tukey_graduados_unal_vs_univalle.csv',
      },
      {
        title: 'ANOVA General — Total Estudiantes',
        desc: 'Modelo OLS: C(periodo) + C(nivelgral)',
        path: '/estadistica/anova_total_estudiantes.csv',
      },
    ];
    this.loadStatsCards();
  }

  ngAfterViewInit() {
    // Wait a brief tick to allow DOM to compile
    setTimeout(() => {
      this.initCharts();
    }, 50);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  onIframeLoad() {
    this.isLoading = false;
  }

  initCharts() {
    // 1. Facultad Attrition (Horizontal Bar Chart)
    const ctxFac = document.getElementById('chart-facultad-static') as HTMLCanvasElement;
    if (ctxFac) {
      this.chartFacultad = new Chart(ctxFac, {
        type: 'bar',
        data: {
          labels: [
            'F. Ingeniería',
            'F. Ciencias',
            'F. Minas',
            'F. Ciencias Humanas',
            'F. Ciencias Económicas',
            'F. Derecho, C. Pol. y Soc.',
            'F. Arquitectura',
            'F. Medicina'
          ],
          datasets: [{
            label: 'Tasa Deserción (%)',
            data: [93.29, 91.40, 90.17, 90.84, 92.94, 78.65, 89.97, 90.49],
            backgroundColor: '#f03e3e',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 10
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
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
              ticks: { color: '#a5d8ff', font: { family: 'DM Sans, sans-serif' } },
              title: { display: true, text: 'Tasa de Deserción (%)', color: '#a5d8ff', font: { size: 10 } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#a5d8ff', font: { family: 'DM Sans, sans-serif' } }
            }
          }
        }
      });
    }

    // 2. Nivel Académico (Doughnut Chart)
    const ctxNiv = document.getElementById('chart-nivel-static') as HTMLCanvasElement;
    if (ctxNiv) {
      this.chartNivel = new Chart(ctxNiv, {
        type: 'doughnut',
        data: {
          labels: ['Pregrado', 'Posgrado'],
          datasets: [{
            data: [470282, 64129],
            backgroundColor: ['#22b8cf', '#cc5de8'],
            borderColor: '#0d1624',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#a5d8ff',
                font: { family: 'DM Sans, sans-serif', size: 10 },
                boxWidth: 12,
                padding: 12
              }
            },
            tooltip: {
              backgroundColor: 'rgba(20, 21, 30, 0.95)',
              titleColor: '#fff',
              bodyColor: '#a5d8ff',
              borderColor: 'rgba(34, 184, 207, 0.25)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function (context) {
                  const val = context.raw as number;
                  return ` Matriculados: ${val.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    }

    // 3. Sexo (Doughnut Chart)
    const ctxSex = document.getElementById('chart-sexo-static') as HTMLCanvasElement;
    if (ctxSex) {
      this.chartSexo = new Chart(ctxSex, {
        type: 'doughnut',
        data: {
          labels: ['Hombres', 'Mujeres'],
          datasets: [{
            data: [272550, 261861],
            backgroundColor: ['#4dadf7', '#f783ac'],
            borderColor: '#0d1624',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#a5d8ff',
                font: { family: 'DM Sans, sans-serif', size: 10 },
                boxWidth: 12,
                padding: 12
              }
            },
            tooltip: {
              backgroundColor: 'rgba(20, 21, 30, 0.95)',
              titleColor: '#fff',
              bodyColor: '#a5d8ff',
              borderColor: 'rgba(77, 171, 247, 0.25)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function (context) {
                  const val = context.raw as number;
                  return ` Matriculados: ${val.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    }
  }

  destroyCharts() {
    if (this.chartFacultad) {
      this.chartFacultad.destroy();
      this.chartFacultad = null;
    }
    if (this.chartNivel) {
      this.chartNivel.destroy();
      this.chartNivel = null;
    }
    if (this.chartSexo) {
      this.chartSexo.destroy();
      this.chartSexo = null;
    }
  }

  async loadStatsCards() {
    this.statsLoading = true;
    await Promise.all(
      this.statsCards.map(async (card) => {
        try {
          card.table = await this.loadCsvTable(card.path);
          card.error = undefined;
        } catch (e) {
          card.table = undefined;
          card.error = e instanceof Error ? e.message : String(e);
        }
      })
    );
    this.statsLoading = false;
  }

  formatCell(value: string) {
    const raw = (value ?? '').trim();
    if (!raw) return '';

    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;

    if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(3);

    return n.toLocaleString('es-CO', { maximumFractionDigits: 6 });
  }

  cellClass(value: string) {
    const raw = (value ?? '').trim().toLowerCase();
    if (raw === 'true') return 'text-green font-mono';
    if (raw === 'false') return 'text-red font-mono';
    return '';
  }

  private async loadCsvTable(path: string) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);

    const text = await res.text();
    return this.parseCsv(text);
  }

  private parseCsv(text: string) {
    const lines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = this.parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((l) => this.parseCsvLine(l));
    return { headers, rows };
  }

  private parseCsvLine(line: string) {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }

      cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  }
}
