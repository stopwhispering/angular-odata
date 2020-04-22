import { ODataResource } from '../resource';
import { QueryOptionTypes, Select, Expand, Transform, Filter, OrderBy, GroupBy } from '../query-options';

import { ODataReferenceResource } from './reference';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, SegmentTypes, SegmentOptionTypes } from '../path-segments';
import { ODataClient } from '../../client';
import { Observable, empty } from 'rxjs';
import { EntityKey, PlainObject, $COUNT, Parser } from '../../types';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { Types } from '../../utils/types';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { ODataEntitiesAnnotations, ODataEntityAnnotations, ODataAnnotations } from '../responses';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from '../http-options';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(name: string, client: ODataClient, opts?: {
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<E>
  }
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.navigationProperty, name);
    options.keep(QueryOptionTypes.format);
    return new ODataNavigationPropertyResource<E>(client, segments, options, parser);
  }

  // Key
  key(key?: EntityKey<T>) {
    let segment = this.pathSegments.last();
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for key`);
    if (!Types.isUndefined(key)) {
      if (Types.isObject(key))
        key = this.parser.resolveKey(key);
      segment.option(SegmentOptionTypes.key, key);
    }
    return segment.option(SegmentOptionTypes.key).value();
  }

  hasKey() {
    return this.key() !== undefined;
  }

  // EntitySet
  entitySet(name?: string) {
    let segment = this.pathSegments.segment(SegmentTypes.entitySet);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for entitySet`);
    if (!Types.isUndefined(name))
      segment.name = name;
    return segment.name;
  }

  // Segments
  reference() {
    return ODataReferenceResource.factory(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
  }

  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyResource.factory<N>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser ? this.parser.parserFor<N>(name) : null
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser ? this.parser.parserFor<P>(name) : null
    });
  }

  count() {
    return ODataCountResource.factory(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
  }

  // Client requests
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;

  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;

  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {
    return super.get(options);
  }

  // Options
  select(opts?: Select<T>) {
    return this.queryOptions.option<Select<T>>(QueryOptionTypes.select, opts);
  }

  expand(opts?: Expand<T>) {
    return this.queryOptions.option<Expand<T>>(QueryOptionTypes.expand, opts);
  }

  transform(opts?: Transform<T>) {
    return this.queryOptions.option<Transform<T>>(QueryOptionTypes.transform, opts);
  }

  search(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.search, opts);
  }

  filter(opts?: Filter) {
    return this.queryOptions.option<Filter>(QueryOptionTypes.filter, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.queryOptions.option<OrderBy<T>>(QueryOptionTypes.orderBy, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.format, opts);
  }

  top(opts?: number) {
    return this.queryOptions.option<number>(QueryOptionTypes.top, opts);
  }

  skip(opts?: number) {
    return this.queryOptions.option<number>(QueryOptionTypes.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.skiptoken, opts);
  }

  // Custom
  single(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this
      .get({ 
        headers: options && options.headers,
        params: options && options.params,
        responseType: 'entity', 
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials});
  }

  collection(options?: HttpOptions): Observable<[T[], ODataEntitiesAnnotations]> {
    return this
      .get({ 
        headers: options && options.headers,
        params: options && options.params,
        responseType: 'entities', 
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials,
        withCount: true });
  }

  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone() as ODataNavigationPropertyResource<T>;
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<[T[], ODataEntitiesAnnotations]> => {
      if (opts) {
        if (opts.skiptoken)
          res.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.skip(opts.skip);
        if (opts.top)
          res.top(opts.top);
      }
      return res.get({ 
        headers: options && options.headers,
        params: options && options.params,
        reportProgress: options && options.reportProgress,
        responseType: 'entities', 
        withCredentials: options && options.withCredentials});
    }
    return fetch()
      .pipe(
        expand(([_, odata]) => (odata.skip || odata.skiptoken) ? fetch(odata) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
