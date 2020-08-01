import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  $COUNT,
  VALUE_SEPARATOR,
  PARAM_SEPARATOR,
  QUERY_SEPARATOR,
  parseQuery,
  odataEtag
} from '../types';
import { ODataClient } from '../client';
import { Types } from '../utils/index';

import { PlainObject } from './builder';
import { ODataPathSegments } from './path-segments';
import {
  ODataQueryOptions
} from './query-options';
import { HttpOptions } from './http-options';
import { ODataResponse } from './response';
import { ODataCollection } from '../models/collection';
import { ODataEntityAnnotations, ODataEntitiesAnnotations } from '../models/annotations';
import { ODataModel } from '../models/model';

export class ODataResource<Type> {
  // VARIABLES
  protected client: ODataClient;
  protected pathSegments: ODataPathSegments;
  protected queryOptions: ODataQueryOptions;

  constructor(
    client: ODataClient,
    segments?: ODataPathSegments,
    options?: ODataQueryOptions
  ) {
    this.client = client;
    this.pathSegments = segments || new ODataPathSegments();
    this.queryOptions = options || new ODataQueryOptions();
  }
  /**
   * @returns string The type of the resource
   */
  type(): string {
    let segment = this.pathSegments.last();
    if (segment)
      return segment.type;
  }
  /**
   * @returns string All covered types of the resource
   */
  types(): string[] {
    return this.pathSegments.types();
  }

  // Proxy to client
  config() {
    let config = this.client.configFor(this);
    return config.enumConfigForType<Type>(this.type()) || config.entityConfigForType<Type>(this.type()) || config.callableConfigForType<Type>(this.type());
  }

  pathAndParams(): [string, PlainObject] {
    let path = this.pathSegments.path();
    let params = this.queryOptions.params();
    if (path.indexOf(QUERY_SEPARATOR) !== -1) {
      let parts = path.split(QUERY_SEPARATOR);
      path = parts[0];
      Object.assign(params, parseQuery(parts[1]));
    }
    return [path, params];
  }

  protected serialize(value: any): any {
    let config = this.client.configFor(this);
    let parser = config.parserForType<Type>(this.type());
    if (!Types.isUndefined(parser) && 'serialize' in parser)
      return Array.isArray(value) ? 
        value.map(e => parser.serialize(e, {stringAsEnum: config.stringAsEnum, ieee754Compatible: config.ieee754Compatible})) : 
        parser.serialize(value, {stringAsEnum: config.stringAsEnum, ieee754Compatible: config.ieee754Compatible});
    return value;
  }

  toModel<M extends ODataModel<Type>>(entity: Partial<Type>, annots?: ODataEntityAnnotations): M {
    let Model = this.client.modelForType(this.type());
    return new Model(entity, {resource: this, annotations: annots}) as M;
  }

  toCollection<C extends ODataCollection<Type, ODataModel<Type>>>(entities: Partial<Type>[], annots?: ODataEntitiesAnnotations): C {
    let Collection = this.client.collectionForType(this.type());
    return new Collection(entities, {resource: this, annotations: annots}) as C;
  }

  // Testing
  toString(): string {
    let [path, params] = this.pathAndParams();
    let queryString = Object.entries(params)
      .map(e => `${e[0]}${VALUE_SEPARATOR}${e[1]}`)
      .join(PARAM_SEPARATOR);
    return queryString ? `${path}${QUERY_SEPARATOR}${queryString}` : path;
  }

  clone<Re extends ODataResource<Type>>(): Re {
    let Ctor = <typeof ODataResource>this.constructor;
    return (new Ctor(this.client, this.pathSegments.clone(), this.queryOptions.clone())) as Re;
  }

  toJSON() {
    return { 
      segments: this.pathSegments.toJSON(),
      options: this.queryOptions.toJSON()  
    };
  }

  alias(name: string, value?: any) {
    return this.queryOptions.alias(name, value);
  }

  // Base Requests
  protected request(
    method: string,
    options: HttpOptions & {
      attrs?: any,
      etag?: string,
      responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
      withCount?: boolean
    }): Observable<any> {

    let params = options.params;
    if (options.withCount)
      params = this.client.mergeHttpParams(params, { [$COUNT]: 'true' })

    let responseType: 'arraybuffer' | 'blob' | 'json' | 'text' = 
      (options.responseType && ['property', 'entity', 'entities'].indexOf(options.responseType) !== -1) ? 
        'json' : 
      (options.responseType === 'value') ? 
        'text' :
        <'arraybuffer' | 'blob' | 'json' | 'text'>options.responseType;
    
    let body = null;
    if (!Types.isNullOrUndefined(options.attrs)) {
      body = this.serialize(options.attrs);
    }
    let etag = options.etag;
    if (Types.isNullOrUndefined(etag) && !Types.isNullOrUndefined(options.attrs)) {
      etag = odataEtag(options.attrs);
    }
    const res$ = this.client.request(method, this, {
      body,
      etag,
      config: options.config,
      headers: options.headers,
      observe: 'response',
      params: params,
      responseType: responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'entities':
        return res$.pipe(map((res: ODataResponse<Type>) => res.entities()));
      case 'entity':
        return res$.pipe(map((res: ODataResponse<Type>) => res.entity()));
      case 'property':
        return res$.pipe(map((res: ODataResponse<Type>) => res.property()));
      case 'value':
        return res$.pipe(map((res: ODataResponse<Type>) => res.value() as Type));
      default:
        return res$.pipe(map((res: ODataResponse<Type>) => res.body));
    }
  }

  protected get(options: HttpOptions & { 
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('GET', options);
  }

  protected post(attrs: Partial<Type>, options: HttpOptions & { 
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('POST', Object.assign(options, { attrs }));
  }

  protected put(attrs: Partial<Type>, options: HttpOptions & {
    etag?: string, 
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean 
  }): Observable<any> {
    return this.request('PUT', Object.assign(options, { attrs }));
  }

  protected patch(attrs: Partial<Type>, options: HttpOptions & {
    etag?: string, 
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('PATCH', Object.assign(options, { attrs }));
  }

  protected delete(options: HttpOptions & {
    etag?: string, 
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('DELETE', options);
  }
}
