import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material
import { MatToolbarModule }       from '@angular/material/toolbar';
import { MatCardModule }          from '@angular/material/card';
import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatInputModule }         from '@angular/material/input';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { MatTableModule }         from '@angular/material/table';
import { MatPaginatorModule }     from '@angular/material/paginator';
import { MatSortModule }          from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule }      from '@angular/material/snack-bar';
import { MatTooltipModule }       from '@angular/material/tooltip';
import { MatDividerModule }       from '@angular/material/divider';
import { MatChipsModule }         from '@angular/material/chips';

// Pipes do Angular
import { DecimalPipe } from '@angular/common';

// Componentes da aplicação
import { AppComponent }          from './app.component';
import { EnderecosComponent }    from './pages/enderecos/enderecos.component';

@NgModule({
  declarations: [
    AppComponent,
    EnderecosComponent
  ],
  imports: [
    // Core
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,

    // Material
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule
  ],
  providers: [DecimalPipe],
  bootstrap: [AppComponent]
})
export class AppModule {}
