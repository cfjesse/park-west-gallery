import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'discountedPrice',
  standalone: true
})
export class DiscountedPricePipe implements PipeTransform {
  transform(price: number, discountPercent?: number | null): number {
    if (discountPercent != null && discountPercent > 0) {
      return price * (discountPercent / 100);
    }
    return price;
  }
}
