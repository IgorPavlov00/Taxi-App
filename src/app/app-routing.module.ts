import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { TableComponent } from './table/table.component';

const routes: Routes = [
  { path: '', component: MainComponent, title: 'Taxi App – book a ride and watch it drive' },
  {
    path: 'map',
    // Leaflet is only needed here, so it stays out of the landing page bundle.
    loadComponent: () => import('./map/map.component').then(m => m.MapComponent),
    title: 'Book a ride – Taxi App',
  },
  { path: 'table', component: TableComponent, title: 'Ride history – Taxi App' },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
