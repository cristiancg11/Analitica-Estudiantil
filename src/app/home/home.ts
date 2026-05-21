import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  url!: SafeResourceUrl;
  isLoading = true;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    const powerBiUrl = 'https://app.powerbi.com/view?r=eyJrIjoiY2IwM2NlNTgtZjViNy00OTlhLWJlMTctNjM5MGRiMGRmODlkIiwidCI6IjhkMzY4MzZlLTZiNzUtNGRlNi1iYWI5LTVmNGIxNzc1NDI3ZiIsImMiOjR9';
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(powerBiUrl);
  }

  onIframeLoad() {
    this.isLoading = false;
  }
}
