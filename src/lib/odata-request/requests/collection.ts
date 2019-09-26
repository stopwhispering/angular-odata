import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataEntitySet } from '../../odata-response';
import { PlainObject, Options, Filter, GroupBy, Transform, Expand, Segments, Select, OrderBy } from '../types';

import { ODataCountRequest } from './count';
import { ODataEntityRequest } from './entity';

export class ODataCollectionRequest<T> extends ODataRequest {
  entity(key?: string | number | PlainObject) {
    let entity = ODataEntityRequest.factory<T>(
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
    if (key)
      entity.key(key);
    return entity;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
    withCount?: boolean
  }): Observable<ODataEntitySet<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'set',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials,
      withCount: options && options.withCount
    });
  }

  count() {
    return ODataCountRequest.factory(
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  search(opts?: string) {
    return this.options.option<string>(Options.search, opts);
  }

  filter(opts?: Filter) {
    return this.options.option<Filter>(Options.filter, opts);
  }

  groupBy(opts?: GroupBy) {
    return this.options.option(Options.groupBy, opts);
  }

  transform(opts?: Transform) {
    return this.options.option<Transform>(Options.transform, opts);
  }

  orderBy(opts?: OrderBy) {
    return this.options.option<OrderBy>(Options.orderBy, opts);
  }

  format(opts?: string) {
    return this.options.option<string>(Options.format, opts);
  }

  top(opts?: number) {
    return this.options.option<number>(Options.top, opts);
  }

  skip(opts?: number) {
    return this.options.option<number>(Options.skip, opts);
  }
  
  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
  }
}
