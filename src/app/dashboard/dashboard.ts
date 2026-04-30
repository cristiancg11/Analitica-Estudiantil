import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  url!: SafeResourceUrl;
  isLoading: boolean = true;

  constructor(private router: Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    const powerBiUrl = 'https://app.powerbi.com/view?r=eyJrIjoiZTEzYjI1NWMtNzkxMy00NzRjLWIyOTEtNjc3MDAyNTMzMDA2IiwidCI6IjhkMzY4MzZlLTZiNzUtNGRlNi1iYWI5LTVmNGIxNzc1NDI3ZiIsImMiOjR9';
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(powerBiUrl);
  }

  onIframeLoad() {
    this.isLoading = false;
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
