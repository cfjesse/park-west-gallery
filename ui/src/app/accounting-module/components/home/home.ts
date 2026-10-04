import { Component } from '@angular/core';
import { MasterDetails } from '../../../shared/components/master-details/master-details';

@Component({
  imports: [MasterDetails],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home { }
