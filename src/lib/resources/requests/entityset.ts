import { Observable, empty } from 'rxjs';

import { QueryOptionTypes, Expand, Select, Transform, Filter, OrderBy } from '../query-options';
import { ODataClient } from '../../client';
import { ODataPathSegments, SegmentTypes } from '../path-segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataQueryOptions } from '../query-options';
import { ODataEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey, Parser } from '../../types';
import { ODataResource } from '../resource';
import { expand, concatMap, toArray } from 'rxjs/operators';
import { Types } from '../../utils';
import { ODataEntityAnnotations, ODataEntitiesAnnotations } from '../responses';
import { HttpOptions, HttpEntityOptions, HttpEntitiesOptions } from '../http-options';
import { ODataModel } from '../../models';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(name: string, client: ODataClient, opts?: {
    segments?: ODataPathSegments, 
    options?: ODataQueryOptions,
    parser?: Parser<E> 
  }) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.entitySet, name);
    options.keep(QueryOptionTypes.filter, QueryOptionTypes.orderBy, QueryOptionTypes.skip, QueryOptionTypes.transform, QueryOptionTypes.top, QueryOptionTypes.search, QueryOptionTypes.format);
    return new ODataEntitySetResource<E>(client, segments, options, parser);
  }

  toModel<M extends ODataModel<T>>(body: any): M {
    return this.entity(body).toModel(body);
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

  entity(key?: EntityKey<T>) {
    let entity = ODataEntityResource.factory<T>(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
    if (!Types.isEmpty(key)) {
      entity.key(key);
    }
    return entity;
  }

  action<A>(name: string, type?: string) {
    return ODataActionResource.factory<A>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.client.parserForType<A>(type) as Parser<A>
    });
  }

  function<F>(name: string, type?: string) {
    return ODataFunctionResource.factory<F>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser:this.client.parserForType<F>(type) as Parser<F>
    });
  }

  count() {
    return ODataCountResource.factory(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.client.parserForType<number>('number')
    });
  }

  // Client requests
  post(entity: T, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.post(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  get(options?: HttpOptions & { withCount?: boolean }): Observable<[T[], ODataEntitiesAnnotations]> {
    return super.get(
      Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
    );
  }

  // Query
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
    return this.queryOptions.option(QueryOptionTypes.filter, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.queryOptions.option(QueryOptionTypes.orderBy, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option(QueryOptionTypes.format, opts);
  }

  top(opts?: number) {
    return this.queryOptions.option(QueryOptionTypes.top, opts);
  }

  skip(opts?: number) {
    return this.queryOptions.option(QueryOptionTypes.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.queryOptions.option(QueryOptionTypes.skiptoken, opts);
  }
  
  // Custom
  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone() as ODataEntitySetResource<T>;
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }) => {
      if (opts) {
        if (opts.skiptoken)
          res.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.skip(opts.skip);
        if (opts.top)
          res.top(opts.top);
      }
      return res.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
      );
    }
    return fetch()
      .pipe(
        expand(([_, annots])  => (annots.skip || annots.skiptoken) ? fetch(annots) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
