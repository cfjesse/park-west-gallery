import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MasterDetails } from './master-details';

describe('MasterDetails', () => {
  let component: MasterDetails;
  let fixture: ComponentFixture<MasterDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
