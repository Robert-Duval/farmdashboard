import {Injectable} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {PricesService} from '../http/prices.service';
import {PricesDto} from '../../models/prices-dto';
import {StaticValues} from '../../static/static-values';
import {Title} from '@angular/platform-browser';
import {Observable} from 'rxjs/internal/Observable';
import {flatMap} from 'rxjs/operators';
import {Addresses} from '../../static/addresses';

@Injectable({
  providedIn: 'root'
})
export class PriceDataService {
  private pureTitle = 'Harvest Live Dashboard';
  private lastFarmPrice: number;
  private prices: Map<string, Map<string, PricesDto>> = new Map(
      Array.from(StaticValues.NETWORKS.keys()).map(name => [name, new Map()])
  );
  private dataFeed: Observable<PricesDto>;

  constructor(
      private pricesService: PricesService,
      private titleService: Title,
      private log: NGXLogger
  ) {
    this.load();
  }

  private load(): void {
    this.pricesService.getLastPrices().subscribe(prices => {
      this.log.debug('Load last prices', prices);
      prices.sort((a, b) => a.token.localeCompare(b.token))
      .forEach(this.handlePrice.bind(this));
      // load last farm again for avoid errors with otherToken price calculation
      this.pricesService.getLastPrice(Addresses.ADDRESSES.get('FARM'), StaticValues.NETWORKS.get('eth'))
      .subscribe(p => this.handlePrice(p));
    });

    this.dataFeed = this.pricesService.subscribeToPrices()
    .pipe(
        flatMap(price => this.handlePrice(price))
    );
  }

  private handlePrice(price: PricesDto): Observable<PricesDto> {
    if (!price) {
      return new Observable<PricesDto>();
    }
    if (price.tokenAmount === 0 || price.otherTokenAmount === 0) {
      this.log.info('Skip zero price', price);
      return new Observable<PricesDto>();
    }
    const lastPrice = this.prices.get(price?.network)?.get(price?.tokenAddress?.toLowerCase());
    if (lastPrice && lastPrice.block > price.block) {
      this.log.debug('Price DTO older on ' + (lastPrice.block - price.block), lastPrice, price);
      return new Observable<PricesDto>();
    }
    this.prices.get(price.network).set(price.tokenAddress?.toLowerCase(), price);
    if (price.tokenAddress === Addresses.ADDRESSES.get('FARM')) {
      this.lastFarmPrice = this.getUsdPrice(Addresses.ADDRESSES.get('FARM'), 'eth');
      this.titleService.setTitle(this.lastFarmPrice?.toFixed(2) + ' | ' + this.pureTitle);
      this.log.debug('FARM price updated', price);
    }
    // this.dataFeed;
    return new Observable<PricesDto>(o => o.next(price));
  }

  public getAllPrices(): PricesDto[] {
    const result = [];
    this.prices.forEach((prs, network) =>
        prs.forEach((price, name) =>
            result.push(price)
        )
    );
    return result;
  }

  public getPriceDto(address: string, network: string): PricesDto {
    return this.prices.get(network).get(address.toLowerCase());
  }

  public getUsdPrice(address: string, network: string, checked: Set<string> = new Set<string>()): number {
    if (!address) {
      return 0;
    }
    if (StaticValues.isStableCoin(address)) {
      return 1;
    }
    if (checked.has(address)) {
      this.log.error('Price recursion', Array.from(checked.values())
          .map(adr => this.prices.get(network)?.get(adr).source)
          .toString()
          , address);
      return 1;
    }
    const targetPriceDto = this.prices.get(network)?.get(address.toLowerCase());
    if (!targetPriceDto) {
      return 0;
    }
    checked.add(address.toLowerCase());
    const otherTokenPrice = this.getUsdPrice(targetPriceDto.otherTokenAddress?.toLowerCase(),
        network, checked);
    const price = targetPriceDto.price * otherTokenPrice;
    if (price === Infinity) {
      return 0;
    }
    return price;
  }

  public getLastFarmPrice(): number {
    return this.lastFarmPrice || 0;
  }

  public subscribeToActual(): Observable<PricesDto> {
    return this.dataFeed;
  }
}
