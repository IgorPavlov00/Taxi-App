import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { HeroComponent } from './hero/hero.component';
import { FeaturesComponent } from './features/features.component';
import { AboutComponent } from './about/about.component';
import { HowComponent } from './how/how.component';
import { FooterComponent } from './footer/footer.component';
import { MapComponent } from './map/map.component';
import { MainComponent } from './main/main.component';
import {FormsModule} from "@angular/forms";
import { TableComponent } from './table/table.component';
import {ToastrModule} from "ngx-toastr";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RideDetailsComponent } from './ride-details/ride-details.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HeroComponent,
    FeaturesComponent,
    AboutComponent,
    HowComponent,
    FooterComponent,
    MapComponent,
    MainComponent,
    TableComponent,
    RideDetailsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ToastrModule.forRoot({
      timeOut: 14000,
      positionClass: 'toast-top-center',
      preventDuplicates: true,




    }),
    NgbModule, // ToastrModule added

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
