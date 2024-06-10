import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent } from './map/map.component';
import { HeroComponent } from './hero/hero.component';
import {AppComponent} from "./app.component";
import {MainComponent} from "./main/main.component";
import {TableComponent} from "./table/table.component"; // Example component for default route

const routes: Routes = [
  { path: '', component: MainComponent }, // Set a default route
  { path: 'map', component: MapComponent },
  { path: 'table', component: TableComponent },
  // Add other routes here as needed
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
